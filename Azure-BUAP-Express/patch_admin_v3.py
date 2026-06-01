"""
Patch admin.py to use Database-backed job tracking (OpsExcelJob) WITHOUT using re.sub to avoid escape issues.
"""
import os

ADMIN_FILE = "routers/admin.py"

with open(ADMIN_FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
skip = False

# Imports
has_uuid = False
has_json = False

for line in lines:
    if "import uuid" in line: has_uuid = True
    if "import json" in line: has_json = True
    
    # ── 1. Update Upload endpoint ───────────────────────────────────
    if "@router.post(\"/programs/upload-excel\"" in line:
        new_lines.append("@router.post(\"/programs/upload-excel\", response_model=None)\n")
        new_lines.append("async def upload_programs_excel(\n")
        new_lines.append("    background_tasks: BackgroundTasks,\n")
        new_lines.append("    file: UploadFile = File(...),\n")
        new_lines.append("    admin: models.OpsAdminUser = Depends(require_coordinador),\n")
        new_lines.append("    db: Session = Depends(get_db),\n")
        new_lines.append("):\n")
        new_lines.append("    \"\"\"Recibe el archivo, crea el job en DB, encola procesamiento y retorna job_id.\"\"\"\n")
        new_lines.append("    file_content = await file.read()\n")
        new_lines.append("    if not file_content:\n")
        new_lines.append("        raise HTTPException(status_code=400, detail=\"El archivo está vacío.\")\n")
        new_lines.append("    try:\n")
        new_lines.append("        load_workbook(filename=BytesIO(file_content), data_only=True)\n")
        new_lines.append("    except Exception as exc:\n")
        new_lines.append("        raise HTTPException(status_code=400, detail=f\"No se pudo abrir el Excel: {exc}\")\n")
        new_lines.append("    \n")
        new_lines.append("    job_id = str(uuid.uuid4())\n")
        new_lines.append("    new_job = models.OpsExcelJob(id=job_id, status=\"pending\")\n")
        new_lines.append("    db.add(new_job)\n")
        new_lines.append("    db.commit()\n")
        new_lines.append("\n")
        new_lines.append("    background_tasks.add_task(_process_excel_background, job_id, file_content, admin.id, admin.full_name)\n")
        new_lines.append("    return {\"job_id\": job_id, \"status\": \"pending\", \"message\": \"Procesamiento iniciado.\"}\n")
        skip = True
        continue
    
    # ── 2. Update Status endpoint ───────────────────────────────────
    if "@router.get(\"/programs/upload-status/\"" in line or "@router.get(\"/programs/upload-status/{job_id}\"" in line:
        new_lines.append("@router.get(\"/programs/upload-status/{job_id}\", response_model=None)\n")
        new_lines.append("def get_upload_status(\n")
        new_lines.append("    job_id: str,\n")
        new_lines.append("    admin: models.OpsAdminUser = Depends(require_coordinador),\n")
        new_lines.append("    db: Session = Depends(get_db),\n")
        new_lines.append("):\n")
        new_lines.append("    \"\"\"Polling endpoint: consulta el estado del job en la base de datos.\"\"\"\n")
        new_lines.append("    job = db.query(models.OpsExcelJob).filter_by(id=job_id).first()\n")
        new_lines.append("    if not job:\n")
        new_lines.append("        raise HTTPException(status_code=404, detail=\"Job no encontrado.\")\n")
        new_lines.append("    \n")
        new_lines.append("    result_data = None\n")
        new_lines.append("    if job.result:\n")
        new_lines.append("        try:\n")
        new_lines.append("            import json\n")
        new_lines.append("            result_data = json.loads(job.result)\n")
        new_lines.append("        except:\n")
        new_lines.append("            result_data = {\"raw\": job.result}\n")
        new_lines.append("            \n")
        new_lines.append("    return {\"job_id\": job_id, \"status\": job.status, \"result\": result_data}\n")
        skip = True
        continue
        
    # ── 3. Update Background function ────────────────────────────────
    if "def _process_excel_background(" in line:
        new_lines.append("def _process_excel_background(job_id: str, file_content: bytes, admin_id: int, admin_name: str):\n")
        new_lines.append("    \"\"\"Background worker: procesa el Excel y guarda resultado en la base de datos.\"\"\"\n")
        new_lines.append("    from database import SessionLocal\n")
        new_lines.append("    import json\n")
        new_lines.append("    db = SessionLocal()\n")
        new_lines.append("    try:\n")
        new_lines.append("        job = db.query(models.OpsExcelJob).filter_by(id=job_id).first()\n")
        new_lines.append("        if job:\n")
        new_lines.append("            job.status = \"running\"\n")
        new_lines.append("            db.commit()\n")
        new_lines.append("\n")
        new_lines.append("        def map_tipo(tipo_raw):\n")
        new_lines.append("            if tipo_raw is None: return None\n")
        new_lines.append("            t = str(tipo_raw).lower().strip()\n")
        new_lines.append("            if \"practica\" in t or \"práctica\" in t or (\"pr\" in t and \"ctica\" in t): return \"practica_profesional\"\n")
        new_lines.append("            if \"servicio\" in t: return \"servicio_social\"\n")
        new_lines.append("            return None\n")
        new_lines.append("\n")
        new_lines.append("        df = pd.read_excel(BytesIO(file_content), skiprows=2, header=None)\n")
        new_lines.append("        df.columns = ['evaluador','estado','folio','programa','tipo','perfil','max_slots','dependencia','sector','inscritos','cupo_text']\n")
        new_lines.append("        df['folio'] = df['folio'].fillna('').astype(str).str.strip().str.replace(r'\\.0$', '', regex=True)\n")
        new_lines.append("        df = df[~df['folio'].isin(['', 'None', 'nan', 'NaN', 'null'])]\n")
        new_lines.append("\n")
        new_lines.append("        career_map = {c.code: c for c in db.query(models.DimCareer).all()}\n")
        new_lines.append("        folios_in_excel = df['folio'].unique().tolist()\n")
        new_lines.append("        relevant_progs = db.query(models.DimProgram).filter(models.DimProgram.folio.in_(folios_in_excel)).all()\n")
        new_lines.append("        existing_progs = {(p.folio, p.career_id): p for p in relevant_progs}\n")
        new_lines.append("        prog_ids = [p.id for p in relevant_progs]\n")
        new_lines.append("        availability_map = {a.program_id: a for a in db.query(models.OpsProgramAvailability).filter(models.OpsProgramAvailability.program_id.in_(prog_ids)).all()} if prog_ids else {}\n")
        new_lines.append("        \n")
        new_lines.append("        current_period = db.query(models.DimPeriod).filter_by(is_current=True).first()\n")
        new_lines.append("        period_id = current_period.id if current_period else None\n")
        new_lines.append("\n")
        new_lines.append("        total_rows, new_count, updated_count, errors, seen = len(df), 0, 0, [], {}\n")
        new_lines.append("\n")
        new_lines.append("        for idx, row in df.iterrows():\n")
        new_lines.append("            row_idx = idx + 3\n")
        new_lines.append("            try:\n")
        new_lines.append("                folio = str(row['folio']).strip()\n")
        new_lines.append("                programa_name = str(row['programa']).strip() if row['programa'] else None\n")
        new_lines.append("                if not programa_name: continue\n")
        new_lines.append("                program_type = map_tipo(row['tipo'])\n")
        new_lines.append("                if not program_type: continue\n")
        new_lines.append("                profile = str(row['perfil']).replace('\\xa0', ' ').strip() if row['perfil'] else None\n")
        new_lines.append("                try: max_slots = int(float(row['max_slots'])) if not pd.isna(row['max_slots']) else 0\n")
        new_lines.append("                except: max_slots = 0\n")
        new_lines.append("                dependency_name = str(row['dependencia']).strip() if row['dependencia'] else None\n")
        new_lines.append("                sector = str(row['sector']).strip() if row['sector'] else None\n")
        new_lines.append("                try: inscritos = int(float(row['inscritos'])) if not pd.isna(row['inscritos']) else 0\n")
        new_lines.append("                except: inscritos = 0\n")
        new_lines.append("                \n")
        new_lines.append("                m = re.search(r'[\\(\\[]\\s*([A-Z0-9]+)\\s*[\\)\\]]', profile or '')\n")
        new_lines.append("                career = career_map.get(m.group(1)) if m else None\n")
        new_lines.append("                if not career and profile:\n")
        new_lines.append("                    pu = profile.upper()\n")
        new_lines.append("                    for code, c in career_map.items():\n")
        new_lines.append("                        if code in pu: career = c; break\n")
        new_lines.append("                if not career: continue\n")
        new_lines.append("                \n")
        new_lines.append("                ck = (folio, career.id)\n")
        new_lines.append("                if ck in seen: continue\n")
        new_lines.append("                seen[ck] = True\n")
        new_lines.append("                \n")
        new_lines.append("                existing = existing_progs.get(ck)\n")
        new_lines.append("                if existing:\n")
        new_lines.append("                    existing.name = programa_name; existing.program_type = program_type\n")
        new_lines.append("                    existing.max_slots = max_slots; existing.dependency_name = dependency_name\n")
        new_lines.append("                    existing.sector = sector\n")
        new_lines.append("                    existing.evaluator_name = str(row['evaluador']).strip() if row['evaluador'] else None\n")
        new_lines.append("                    avail = availability_map.get(existing.id)\n")
        new_lines.append("                    if avail:\n")
        new_lines.append("                        avail.max_slots = max_slots\n")
        new_lines.append("                        avail.available_slots = max(0, max_slots - avail.used_slots)\n")
        new_lines.append("                        avail.is_full = avail.used_slots >= max_slots\n")
        new_lines.append("                    updated_count += 1\n")
        new_lines.append("                else:\n")
        new_lines.append("                    np = models.DimProgram(folio=folio, name=programa_name, program_type=program_type, career_id=career.id, max_slots=max_slots, dependency_name=dependency_name, sector=sector, evaluator_name=str(row['evaluador']).strip() if row['evaluador'] else None, period_id=period_id, status=\"active\", is_active=True)\n")
        new_lines.append("                    db.add(np)\n")
        new_lines.append("                    db.add(models.OpsProgramAvailability(program=np, max_slots=max_slots, used_slots=inscritos, available_slots=max(0, max_slots - inscritos), is_full=(inscritos >= max_slots)))\n")
        new_lines.append("                    existing_progs[ck] = np; new_count += 1\n")
        new_lines.append("            except: continue\n")
        new_lines.append("\n")
        new_lines.append("        summary = {\"success\": True, \"total_rows\": total_rows, \"new_programs\": new_count, \"updated_programs\": updated_count, \"errors_count\": len(errors), \"errors\": errors[:20], \"processed\": total_rows, \"created\": new_count, \"updated\": updated_count}\n")
        new_lines.append("        log_action(db, \"admin\", admin_id, admin_name, \"upload_programs_excel\", \"dim_programs\", None, details_after=summary)\n")
        new_lines.append("        \n")
        new_lines.append("        job = db.query(models.OpsExcelJob).filter_by(id=job_id).first()\n")
        new_lines.append("        if job:\n")
        new_lines.append("            job.status = \"done\"\n")
        new_lines.append("            job.result = json.dumps(summary)\n")
        new_lines.append("        db.commit()\n")
        new_lines.append("    except Exception as exc:\n")
        new_lines.append("        db.rollback()\n")
        new_lines.append("        job = db.query(models.OpsExcelJob).filter_by(id=job_id).first()\n")
        new_lines.append("        if job:\n")
        new_lines.append("            job.status = \"error\"\n")
        new_lines.append("            job.result = json.dumps({\"detail\": str(exc)})\n")
        new_lines.append("            db.commit()\n")
        new_lines.append("    finally:\n")
        new_lines.append("        db.close()\n")
        skip = True
        continue

    # Logic to handle skipping old blocks
    if skip:
        if line.strip() == "": # Empty line might end a block or just be whitespace
            pass
        if "@router." in line and not skip: # Start of a new block
            skip = False
        # Special logic: if we are skipping, we stop skipping when we hit the NEXT function or decorator
        if skip and (line.startswith("def ") or line.startswith("@router.")):
            # But we already added the new version of the block we are skipping!
            # So we just stop skipping for the NEXT lines.
            skip = False
        else:
            continue
            
    new_lines.append(line)

# Handle missing imports
if not has_uuid:
    new_lines.insert(1, "import uuid\n")
if not has_json:
    new_lines.insert(1, "import json\n")

with open(ADMIN_FILE, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Patch v3 (safe line-by-line) aplicado.")
