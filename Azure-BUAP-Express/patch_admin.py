"""
Script de refactorización de admin.py a arquitectura de Background Tasks.
Ejecutar con: python patch_admin.py
"""
import re

ADMIN_FILE = "routers/admin.py"

with open(ADMIN_FILE, "r", encoding="utf-8") as f:
    content = f.read()

# ── 1. IMPORTS ───────────────────────────────────────────────────────
OLD_IMPORTS = "from fastapi import APIRouter, Depends, HTTPException, UploadFile, File"
NEW_IMPORTS = "from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks"
content = content.replace(OLD_IMPORTS, NEW_IMPORTS, 1)

OLD_DB_IMPORT = "from database import get_db, log_action"
NEW_DB_IMPORT = "from database import get_db, log_action\nimport uuid"
content = content.replace(OLD_DB_IMPORT, NEW_DB_IMPORT, 1)

OLD_ROUTER_LINE = 'router = APIRouter(prefix="/api/admin", tags=["admin"])'
NEW_ROUTER_LINE = ('# In-memory job store for background Excel processing\n'
                   '_job_store: dict = {}\n\n'
                   'router = APIRouter(prefix="/api/admin", tags=["admin"])')
content = content.replace(OLD_ROUTER_LINE, NEW_ROUTER_LINE, 1)

# ── 2. Replace the ENTIRE upload endpoint (from @router.post to the next @router) ─
# Find the start of the upload endpoint
upload_start = content.find('@router.post("/programs/upload-excel"')
assert upload_start != -1, "Could not find upload endpoint start"

# Find the next @router decorator after the upload endpoint
next_router = content.find('@router.', upload_start + 1)
assert next_router != -1, "Could not find end of upload endpoint"

OLD_UPLOAD_BLOCK = content[upload_start:next_router]

BACKGROUND_FUNC = '''def _process_excel_background(job_id: str, file_content: bytes, admin_id: int, admin_name: str):
    """Background worker: procesa el Excel y guarda resultado en _job_store."""
    from database import SessionLocal
    db = SessionLocal()
    try:
        _job_store[job_id]["status"] = "running"

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
        availability_map = {}
        if prog_ids:
            availability_map = {a.program_id: a for a in db.query(models.OpsProgramAvailability).filter(models.OpsProgramAvailability.program_id.in_(prog_ids)).all()}
        current_period = db.query(models.DimPeriod).filter_by(is_current=True).first()
        period_id = current_period.id if current_period else None

        total_rows, new_count, updated_count, errors, seen = len(df), 0, 0, [], {}

        for idx, row in df.iterrows():
            row_idx = idx + 3
            try:
                folio = str(row['folio']).strip()
                programa_name = str(row['programa']).strip() if row['programa'] else None
                if not programa_name:
                    errors.append({"row": row_idx, "reason": "Nombre vacío"}); continue
                program_type = map_tipo(row['tipo'])
                if not program_type:
                    errors.append({"row": row_idx, "reason": f"Tipo desconocido '{row[\'tipo\']}\'"}); continue
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
                if not career:
                    errors.append({"row": row_idx, "folio": folio, "reason": f"Carrera no encontrada: '{profile}'"}); continue
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
                    new_prog = models.DimProgram(
                        folio=folio, name=programa_name, program_type=program_type,
                        career_id=career.id, max_slots=max_slots,
                        dependency_name=dependency_name, sector=sector,
                        evaluator_name=str(row['evaluador']).strip() if row['evaluador'] else None,
                        period_id=period_id, status="active", is_active=True,
                    )
                    db.add(new_prog)
                    db.add(models.OpsProgramAvailability(
                        program=new_prog, max_slots=max_slots, used_slots=inscritos,
                        available_slots=max(0, max_slots - inscritos), is_full=(inscritos >= max_slots),
                    ))
                    existing_progs[ck] = new_prog
                    new_count += 1
            except Exception as e:
                errors.append({"row": row_idx, "reason": str(e)}); continue

        summary = {
            "success": True, "total_rows": total_rows,
            "new_programs": new_count, "updated_programs": updated_count,
            "errors_count": len(errors), "errors": errors[:20],
            "processed": total_rows, "created": new_count, "updated": updated_count,
        }
        log_action(db, "admin", admin_id, admin_name, "upload_programs_excel", "dim_programs", None, details_after=summary)
        db.commit()
        _job_store[job_id] = {"status": "done", "result": summary}
    except Exception as exc:
        db.rollback()
        _job_store[job_id] = {"status": "error", "result": {"detail": str(exc)}}
    finally:
        db.close()


@router.post("/programs/upload-excel", response_model=None)
async def upload_programs_excel(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    admin: models.OpsAdminUser = Depends(require_coordinador),
):
    """Recibe el archivo, encola procesamiento en background y retorna job_id < 1s."""
    file_content = await file.read()
    if not file_content:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")
    try:
        load_workbook(filename=BytesIO(file_content), data_only=True)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"No se pudo abrir el Excel: {exc}")
    job_id = str(uuid.uuid4())
    _job_store[job_id] = {"status": "pending", "result": None}
    background_tasks.add_task(_process_excel_background, job_id, file_content, admin.id, admin.full_name)
    return {"job_id": job_id, "status": "pending", "message": "Procesamiento iniciado. Consulta el estado con el job_id."}


@router.get("/programs/upload-status/{job_id}", response_model=None)
def get_upload_status(job_id: str, admin: models.OpsAdminUser = Depends(require_coordinador)):
    """Polling endpoint: devuelve el estado de un job de carga de Excel."""
    job = _job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job no encontrado o expirado.")
    return {"job_id": job_id, "status": job["status"], "result": job.get("result")}


'''

content = content[:upload_start] + BACKGROUND_FUNC + content[next_router:]

with open(ADMIN_FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("Patch aplicado exitosamente.")

# Verify syntax
import py_compile, sys
try:
    py_compile.compile(ADMIN_FILE, doraise=True)
    print("Sintaxis OK.")
except py_compile.PyCompileError as e:
    print(f"ERROR DE SINTAXIS: {e}")
    sys.exit(1)
