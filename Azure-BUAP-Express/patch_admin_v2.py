"""
Patch admin.py to use Database-backed job tracking (OpsExcelJob) instead of in-memory dictionary.
This fixes 404 errors when multiple worker processes are used in Azure.
"""
import re
import json

ADMIN_FILE = "routers/admin.py"

with open(ADMIN_FILE, "r", encoding="utf-8") as f:
    content = f.read()

# ── 1. ADD JSON IMPORT ───────────────────────────────────────────────
if "import json" not in content:
    content = content.replace("import uuid", "import uuid\nimport json", 1)

# ── 2. REWRITE _process_excel_background ─────────────────────────────
# We search for the function definition and replace it.
background_pattern = r'def _process_excel_background\(job_id: str, file_content: bytes, admin_id: int, admin_name: str\):.*?finally:.*?db\.close\(\)'
# Use re.DOTALL to match across lines
import re

NEW_BACKGROUND_FUNC = '''def _process_excel_background(job_id: str, file_content: bytes, admin_id: int, admin_name: str):
    """Background worker: procesa el Excel y guarda resultado en la base de datos."""
    from database import SessionLocal
    db = SessionLocal()
    try:
        # Update status to running
        job = db.query(models.OpsExcelJob).filter_by(id=job_id).first()
        if job:
            job.status = "running"
            db.commit()

        def map_tipo(tipo_raw):
            if tipo_raw is None: return None
            t = str(tipo_raw).lower().strip()
            if "practica" in t or "práctica" in t or ("pr" in t and "ctica" in t): return "practica_profesional"
            if "servicio" in t: return "servicio_social"
            return None

        df = pd.read_excel(BytesIO(file_content), skiprows=2, header=None)
        df.columns = ['evaluador','estado','folio','programa','tipo','perfil','max_slots','dependencia','sector','inscritos','cupo_text']
        df['folio'] = df['folio'].fillna('').astype(str).str.strip().str.replace(r'\\.0$', '', regex=True)
        df = df[~df['folio'].isin(['', 'None', 'nan', 'NaN', 'null'])]

        career_map = {c.code: c for c in db.query(models.DimCareer).all()}
        folios_in_excel = df['folio'].unique().tolist()
        relevant_progs = db.query(models.DimProgram).filter(models.DimProgram.folio.in_(folios_in_excel)).all()
        existing_progs = {(p.folio, p.career_id): p for p in relevant_progs}
        prog_ids = [p.id for p in relevant_progs]
        availability_map = {a.program_id: a for a in db.query(models.OpsProgramAvailability).filter(models.OpsProgramAvailability.program_id.in_(prog_ids)).all()} if prog_ids else {}
        
        current_period = db.query(models.DimPeriod).filter_by(is_current=True).first()
        period_id = current_period.id if current_period else None

        total_rows, new_count, updated_count, errors, seen = len(df), 0, 0, [], {}

        for idx, row in df.iterrows():
            row_idx = idx + 3
            try:
                folio = str(row['folio']).strip()
                programa_name = str(row['programa']).strip() if row['programa'] else None
                if not programa_name: continue
                program_type = map_tipo(row['tipo'])
                if not program_type: continue
                profile = str(row['perfil']).replace('\\xa0', ' ').strip() if row['perfil'] else None
                try: max_slots = int(float(row['max_slots'])) if not pd.isna(row['max_slots']) else 0
                except: max_slots = 0
                dependency_name = str(row['dependencia']).strip() if row['dependencia'] else None
                sector = str(row['sector']).strip() if row['sector'] else None
                try: inscritos = int(float(row['inscritos'])) if not pd.isna(row['inscritos']) else 0
                except: inscritos = 0
                
                m = re.search(r'[\\(\\[]\\s*([A-Z0-9]+)\\s*[\\)\\]]', profile or '')
                career = career_map.get(m.group(1)) if m else None
                if not career and profile:
                    pu = profile.upper()
                    for code, c in career_map.items():
                        if code in pu: career = c; break
                if not career: continue
                
                ck = (folio, career.id)
                if ck in seen: continue
                seen[ck] = True
                
                existing = existing_progs.get(ck)
                if existing:
                    existing.name = programa_name; existing.program_type = program_type
                    existing.max_slots = max_slots; existing.dependency_name = dependency_name
                    existing.sector = sector
                    existing.evaluator_name = str(row['evaluador']).strip() if row['evaluador'] else None
                    avail = availability_map.get(existing.id)
                    if avail:
                        avail.max_slots = max_slots
                        avail.available_slots = max(0, max_slots - avail.used_slots)
                        avail.is_full = avail.used_slots >= max_slots
                    updated_count += 1
                else:
                    np = models.DimProgram(folio=folio, name=programa_name, program_type=program_type, career_id=career.id, max_slots=max_slots, dependency_name=dependency_name, sector=sector, evaluator_name=str(row['evaluador']).strip() if row['evaluador'] else None, period_id=period_id, status="active", is_active=True)
                    db.add(np)
                    db.add(models.OpsProgramAvailability(program=np, max_slots=max_slots, used_slots=inscritos, available_slots=max(0, max_slots - inscritos), is_full=(inscritos >= max_slots)))
                    existing_progs[ck] = np; new_count += 1
            except: continue

        summary = {"success": True, "total_rows": total_rows, "new_programs": new_count, "updated_programs": updated_count, "errors_count": len(errors), "errors": errors[:20], "processed": total_rows, "created": new_count, "updated": updated_count}
        log_action(db, "admin", admin_id, admin_name, "upload_programs_excel", "dim_programs", None, details_after=summary)
        
        # Save final result to DB
        job = db.query(models.OpsExcelJob).filter_by(id=job_id).first()
        if job:
            job.status = "done"
            job.result = json.dumps(summary)
        db.commit()
    except Exception as exc:
        db.rollback()
        job = db.query(models.OpsExcelJob).filter_by(id=job_id).first()
        if job:
            job.status = "error"
            job.result = json.dumps({"detail": str(exc)})
            db.commit()
    finally:
        db.close()'''

content = re.sub(background_pattern, NEW_BACKGROUND_FUNC, content, flags=re.DOTALL)

# ── 3. REWRITE upload_programs_excel ────────────────────────────────
upload_endpoint_pattern = r'@router\.post\("/programs/upload-excel".*?async def upload_programs_excel\(.*?return {"job_id": job_id, "status": "pending", "message": "Procesamiento iniciado\. Consulta el estado con el job_id\."\}'

NEW_UPLOAD_ENDPOINT = '''@router.post("/programs/upload-excel", response_model=None)
async def upload_programs_excel(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    admin: models.OpsAdminUser = Depends(require_coordinador),
    db: Session = Depends(get_db),
):
    """Recibe el archivo, crea el job en DB, encola procesamiento y retorna job_id."""
    file_content = await file.read()
    if not file_content:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")
    try:
        load_workbook(filename=BytesIO(file_content), data_only=True)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"No se pudo abrir el Excel: {exc}")
    
    job_id = str(uuid.uuid4())
    # Create persistent job record
    new_job = models.OpsExcelJob(id=job_id, status="pending")
    db.add(new_job)
    db.commit()

    background_tasks.add_task(_process_excel_background, job_id, file_content, admin.id, admin.full_name)
    return {"job_id": job_id, "status": "pending", "message": "Procesamiento iniciado."}'''

content = re.sub(upload_endpoint_pattern, NEW_UPLOAD_ENDPOINT, content, flags=re.DOTALL)

# ── 4. REWRITE get_upload_status ──────────────────────────────────
status_endpoint_pattern = r'@router\.get\("/programs/upload-status/\{job_id\}".*?def get_upload_status\(job_id: str, admin: models\.OpsAdminUser = Depends\(require_coordinador\)\):.*?return \{"job_id": job_id, "status": job\["status"\], "result": job\.get\("result"\)\}'

NEW_STATUS_ENDPOINT = '''@router.get("/programs/upload-status/{job_id}", response_model=None)
def get_upload_status(
    job_id: str,
    admin: models.OpsAdminUser = Depends(require_coordinador),
    db: Session = Depends(get_db),
):
    """Polling endpoint: consulta el estado del job en la base de datos."""
    job = db.query(models.OpsExcelJob).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job no encontrado.")
    
    result_data = None
    if job.result:
        try:
            result_data = json.loads(job.result)
        except:
            result_data = {"raw": job.result}
            
    return {"job_id": job_id, "status": job.status, "result": result_data}'''

content = re.sub(status_endpoint_pattern, NEW_STATUS_ENDPOINT, content, flags=re.DOTALL)

with open(ADMIN_FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("Patch v2 aplicado exitosamente (DB-backed jobs).")
