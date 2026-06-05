"""
seed.py — Carga datos iniciales para el sistema BUAP SS/PP v2.
Ejecutar: cd backend && python seed.py
"""
import os
import sys
import datetime
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
import models
from auth import hash_password

# ── asegurar que las tablas existen ──────────────────────────
Base.metadata.create_all(bind=engine)


def seed(db: Session):
    # ── 1. Carreras ──────────────────────────────────────────
    careers_data = [
        ("LAE", "Administración de Empresas",            "Administración de Empresas(LAE) 7"),
        ("LAT", "Administración Turística",              "Administración Turística(LAT) 7"),
        ("APG", "Administración Pública y Gestión",      "Administración Pública y Gestión(APG) 7"),
        ("LCI", "Comercio Internacional",                "Comercio Internacional(LCI) 7"),
        ("ACP", "Administración Pública y Ciencias Políticas", "Administración Pública y Ciencias Políticas(ACP) 7"),
        ("LNI", "Negocios Internacionales",              "Negocios Internacionales(LNI) 7"),
        ("LGA", "Gastronomía",                           "Gastronomía(LGA) 7"),
    ]
    career_map = {}
    for code, name, full_code in careers_data:
        obj = db.query(models.DimCareer).filter_by(code=code).first()
        if not obj:
            obj = models.DimCareer(code=code, name=name, full_code=full_code)
            db.add(obj)
            db.flush()
        career_map[code] = obj.id
    print(f"  careers: {len(career_map)}")

    # ── 2. Modalidades ───────────────────────────────────────
    modalities_data = [
        ("escolarizado",     "Escolarizado"),
        ("semi_escolarizado","Semi-escolarizado"),
        ("distancia",        "Distancia"),
    ]
    modality_map = {}
    for code, name in modalities_data:
        obj = db.query(models.DimModality).filter_by(code=code).first()
        if not obj:
            obj = models.DimModality(code=code, name=name)
            db.add(obj)
            db.flush()
        modality_map[code] = obj.id
    print(f"  modalities: {len(modality_map)}")

    # ── 3. Periodo ───────────────────────────────────────────
    period = db.query(models.DimPeriod).filter_by(code="verano_2026").first()
    if not period:
        period = models.DimPeriod(
            code="verano_2026",
            name="Verano 2026",
            period_type="verano",
            year=2026,
            start_date=datetime.date(2026, 5, 16),
            end_date=datetime.date(2026, 8, 31),
            enrollment_start=datetime.date(2026, 4, 7),
            enrollment_end=datetime.date(2026, 5, 15),
            is_current=True,
        )
        db.add(period)
        db.flush()
    print(f"  period id: {period.id}")

    # ── 4. Procesos macro ────────────────────────────────────
    processes_data = [
        ("inscripcion", "Inscripción a SS/PP",    1, True,  False, "blue"),
        ("acreditacion","Acreditación de SS/PP",  2, True,  False, "green"),
        ("cambio",      "Cambio de Programa",     3, False, True,  "amber"),
        ("baja",        "Baja de Programa",       4, False, True,  "red"),
    ]
    process_map = {}
    for code, name, order, is_primary, gen_res, color in processes_data:
        obj = db.query(models.DimProcessDefinition).filter_by(code=code).first()
        if not obj:
            obj = models.DimProcessDefinition(
                code=code, name=name, display_order=order,
                is_primary=is_primary, generates_resource=gen_res, color_code=color,
            )
            db.add(obj)
            db.flush()
        process_map[code] = obj.id
    print(f"  process definitions: {len(process_map)}")

    # ── 5. Pasos de procesos ─────────────────────────────────
    inscripcion_steps = [
        (1,  "Selección de servicio",          "Selección",    "Elige si realizarás Servicio Social o Práctica Profesional.", "alumno", False, False, False, None, False, None, "Selecciona el tipo de servicio que deseas realizar.", None),
        (2,  "Ingreso de folio y vinculación", "Folio",        "Ingresa el folio del programa al que deseas inscribirte.", "alumno", False, False, False, None, False, None, "Busca tu programa por folio de 6 dígitos.", None),
        (3,  "Solicitud de Inscripción",       "Solicitud",    "Genera, imprime, firma, sella y sube tu Solicitud de Inscripción.", "alumno", True, False, True, "solicitud", False, None, "Genera el PDF, imprímelo, obtén firmas y sello, escanéalo y súbelo.", None),
        (4,  "Carta de Confidencialidad",      "Carta Conf.",  "Genera, firma y sube tu Carta de Confidencialidad.", "alumno", True, False, True, "carta_confidencialidad", False, None, "Genera el PDF, fírmalo y súbelo escaneado.", None),
        (5,  "Kárdex Simple",                  "Kárdex",       "Descarga tu Kárdex Simple de ALUMNOS BUAP y súbelo.", "alumno", True, False, False, None, True, "kardex", "Descarga tu Kárdex desde Autoservicios BUAP y súbelo en PDF.", "El Kárdex debe ser reciente (no mayor a 10 días)."),
        (6,  "Vigencia de Derechos IMSS",      "IMSS",         "Descarga tu Vigencia de Derechos del IMSS y súbela.", "alumno", True, False, False, None, True, "vigencia_imss", "Obtén tu Vigencia de Derechos del portal del IMSS.", None),
        (7,  "Validación por CPPC",            "Validación",   "La coordinación revisa y aprueba tus documentos.", "cppc", False, False, False, None, False, None, "Espera la revisión de tus documentos.", None),
        (8,  "Aceptación por dependencia",     "Aceptación",   "Sube la carta de aceptación firmada por la dependencia.", "alumno_dependencia", True, False, False, None, False, None, "Entrega documentos a la dependencia y sube la carta de aceptación firmada.", None),
        (9,  "Inscripción formal",             "Inscripción",  "La coordinación genera la Carta de Presentación.", "cppc", False, False, False, None, False, None, "La coordinación completará este paso.", None),
        (10, "Entrega de Carta de Presentación","Entrega CP",  "Recoge y entrega la Carta de Presentación a la dependencia.", "alumno_dependencia", False, False, False, None, False, None, "Recoge tu Carta de Presentación en la coordinación y entrégala a la dependencia.", None),
    ]

    acreditacion_steps = [
        (1, "Solicitud de cierre con dependencia", "Cierre Dep.", "Solicita a la dependencia la Carta de Liberación.", "alumno_dependencia", False, False, False, None, False, None, "Contacta a tu supervisor para obtener la Carta de Liberación.", None),
        (2, "Carta de Liberación",               "Liberación",   "Sube la Carta de Liberación firmada por la dependencia.", "alumno", True, False, False, None, False, None, "Sube la Carta de Liberación en PDF.", None),
        (3, "Hoja de Desempeño",                 "Desempeño",    "Sube la Hoja de Desempeño firmada en tinta azul.", "alumno", True, True, False, None, False, None, "La Hoja de Desempeño debe estar firmada en tinta azul.", "Asegúrate de que la firma sea en tinta azul y el documento esté bien escaneado."),
        (4, "Entrega de documentos a Tutor",     "Docs Tutor",   "Sube los documentos que entregaste a tu Tutor.", "alumno", True, False, False, None, False, None, "Sube todos los documentos requeridos por tu Tutor.", None),
        (5, "Evaluación por Tutor",              "Evaluación",   "Tu Tutor evalúa y acredita la materia.", "tutor", False, False, False, None, False, None, "Espera la evaluación de tu Tutor.", None),
        (6, "Solicitud de Carta Término Digital","Carta Término","Sube Carta Liberación, Nombramiento y Kárdex actualizado.", "alumno", True, False, False, None, False, None, "Sube los tres documentos requeridos.", None),
        (7, "Generación de Carta Término",       "Generación CT","La coordinación genera tu Carta Término Digital.", "cppc", False, False, False, None, False, None, "La coordinación completará este paso.", None),
        (8, "Certificado en Autoservicios",      "Certificado",  "Obtén tu Certificado/Constancia en Autoservicios BUAP.", "alumno", False, False, False, None, False, None, "Descarga tu constancia desde el portal de Autoservicios BUAP.", None),
    ]

    cambio_steps = [
        (1, "Solicitud de cambio",          "Solicitud",   "Escribe tu motivo y selecciona el nuevo programa.", "alumno", False, False, False, None, False, None, "Ingresa el folio del nuevo programa y justifica el cambio.", None),
        (2, "Revisión por CPPC",            "Revisión",    "La coordinación revisa tu solicitud.", "cppc", False, False, False, None, False, None, "Espera la respuesta de la coordinación.", None),
        (3, "Documentos de cambio",         "Docs Cambio", "Genera y sube los documentos del cambio.", "alumno", True, False, True, "solicitud", False, None, "Genera los documentos, obtén firmas y súbelos.", None),
        (4, "Aceptación nueva dependencia", "Nueva Dep.",  "Sube documentos firmados por la nueva dependencia.", "alumno", True, False, False, None, False, None, "Entrega documentos a la nueva dependencia y sube la confirmación firmada.", None),
        (5, "Confirmación de cambio",       "Confirmación","La coordinación confirma el cambio en el sistema.", "cppc", False, False, False, None, False, None, "La coordinación completará este paso.", None),
    ]

    baja_steps = [
        (1, "Solicitud de baja",   "Solicitud",   "Escribe tu motivo de baja.", "alumno", False, False, False, None, False, None, "Justifica detalladamente tu motivo de baja.", None),
        (2, "Revisión por CPPC",   "Revisión",    "La coordinación revisa tu solicitud.", "cppc", False, False, False, None, False, None, "Espera la respuesta de la coordinación.", "Este trámite puede generar recurso académico."),
        (3, "Formato de Baja",     "Formato Baja","Genera, firma, escanea y sube el Formato de Baja.", "alumno", True, True, True, "solicitud", False, None, "Genera el Formato de Baja, fírmalo, escanéalo y súbelo.", None),
        (4, "Confirmación de baja","Confirmación","La coordinación confirma la baja en el sistema.", "cppc", False, False, False, None, False, None, "La coordinación completará este paso.", None),
    ]

    all_steps = [
        ("inscripcion",  inscripcion_steps),
        ("acreditacion", acreditacion_steps),
        ("cambio",       cambio_steps),
        ("baja",         baja_steps),
    ]

    total_steps = 0
    for proc_code, steps in all_steps:
        proc_id = process_map[proc_code]
        for s in steps:
            (sn, title, short_label, desc, actor,
             req_upload, req_scan, has_gen_doc, gen_doc_type,
             has_stu_doc, stu_doc_type, action_req, warning) = s
            existing = db.query(models.DimProcessStep).filter_by(
                process_id=proc_id, step_number=sn
            ).first()
            if not existing:
                db.add(models.DimProcessStep(
                    process_id=proc_id, step_number=sn,
                    title=title, short_label=short_label, description=desc,
                    actor=actor, requires_upload=req_upload, requires_scan=req_scan,
                    has_generated_document=has_gen_doc, generated_document_type=gen_doc_type,
                    has_student_document=has_stu_doc, student_document_type=stu_doc_type,
                    action_required=action_req, warning_text=warning,
                ))
                total_steps += 1
    db.flush()
    print(f"  process steps added: {total_steps}")

    # ── 6. Tipos de documento ────────────────────────────────
    doc_types_data = [
        ("solicitud",             "Solicitud de Inscripción",    "generated", True,  True,  "Documento oficial de solicitud de inscripción al programa de SS/PP."),
        ("carta_confidencialidad","Carta de Confidencialidad",   "generated", True,  False, "Carta de confidencialidad requerida por la dependencia."),
        ("kardex",                "Kárdex Simple",               "student",   False, False, "Kárdex Simple descargado desde Autoservicios BUAP. No mayor a 10 días."),
        ("vigencia_imss",         "Vigencia de Derechos IMSS",   "student",   False, False, "Vigencia de Derechos del IMSS, obtenido desde el portal del IMSS."),
    ]
    doc_type_map = {}
    for code, name, origin, req_sig, req_stamp, desc in doc_types_data:
        obj = db.query(models.DimDocumentType).filter_by(code=code).first()
        if not obj:
            obj = models.DimDocumentType(
                code=code, name=name, origin=origin,
                requires_signature=req_sig, requires_stamp=req_stamp, description=desc,
            )
            db.add(obj)
            db.flush()
        doc_type_map[code] = obj.id
    print(f"  document types: {len(doc_type_map)}")

    # ── 7. Configuración del sistema ─────────────────────────
    configs = [
        ("enrollment_enabled",  "false",      "boolean", "Habilita/deshabilita el acceso a procesos de inscripción"),
        ("block_message",       "El periodo de inscripción aún no está habilitado. La coordinación está validando los programas disponibles. Debes esperar hasta la fecha indicada. Mientras tanto, conserva el folio del programa al que deseas ingresar.", "string", "Mensaje que ve el alumno en la pantalla de bloqueo"),
        ("block_until_date",    "2026-04-07", "date",    "Fecha hasta la cual el alumno ve la pantalla de bloqueo"),
        ("current_period_id",   "1",          "integer", "ID del periodo activo actual"),
    ]
    for key, value, ctype, desc in configs:
        obj = db.query(models.DimSystemConfig).filter_by(config_key=key).first()
        if not obj:
            db.add(models.DimSystemConfig(
                config_key=key, config_value=value, config_type=ctype,
                description=desc, updated_at=datetime.datetime.now(), updated_by="system",
            ))
    db.flush()
    print(f"  system config: {len(configs)}")

    # ── 8. Importar programas del Excel ──────────────────────
    excel_paths = [
        os.path.join(os.path.dirname(__file__), "data", "programs.xlsx"),
        "/mnt/user-data/uploads/xlsx.xlsx",
        os.path.join(os.path.dirname(__file__), "programs.xlsx"),
    ]
    excel_file = None
    for p in excel_paths:
        if os.path.exists(p):
            excel_file = p
            break

    programs_loaded = 0
    if excel_file:
        try:
            import openpyxl
            wb = openpyxl.load_workbook(excel_file, read_only=True, data_only=True)
            ws = wb.active

            career_name_map = {
                "lae": "LAE", "administracion de empresas": "LAE",
                "lat": "LAT", "administracion turistica": "LAT",
                "apg": "APG", "administracion publica": "APG",
                "lci": "LCI", "comercio internacional": "LCI",
                "acp": "ACP", "ciencias politicas": "ACP",
                "lni": "LNI", "negocios internacionales": "LNI",
                "lga": "LGA", "gastronomia": "LGA",
            }

            def normalize_career(raw):
                if not raw:
                    return None
                raw_str = str(raw).strip().lower()
                for k, v in career_name_map.items():
                    if k in raw_str:
                        return career_map.get(v)
                return None

            def normalize_type(raw):
                if not raw:
                    return "servicio_social"
                raw_str = str(raw).strip().lower()
                if "practica" in raw_str or "práctica" in raw_str:
                    return "practica_profesional"
                return "servicio_social"

            for row in ws.iter_rows(min_row=2, values_only=True):
                if not row or not row[0]:
                    continue
                try:
                    folio     = str(row[0]).strip()
                    name      = str(row[1]).strip() if len(row) > 1 and row[1] else "Sin nombre"
                    tipo      = normalize_type(row[2] if len(row) > 2 else None)
                    career_id = normalize_career(row[3] if len(row) > 3 else None)

                    raw_slots = row[6] if len(row) > 6 else None
                    try:
                        max_slots = int(float(str(raw_slots))) if raw_slots is not None else 1
                    except (ValueError, TypeError):
                        max_slots = 1

                    dep_name  = str(row[7]).strip() if len(row) > 7 and row[7] else None
                    sector    = str(row[8]).strip() if len(row) > 8 and row[8] else None
                    evaluator = str(row[9]).strip() if len(row) > 9 and row[9] else None

                    try:
                        used = int(float(str(row[10]))) if len(row) > 10 and row[10] is not None else 0
                    except (ValueError, TypeError):
                        used = 0

                    is_full_raw = str(row[11]).strip().upper() if len(row) > 11 and row[11] else ""
                    is_full = is_full_raw == "COMPLETO"

                    if not folio or not career_id:
                        continue

                    prog = db.query(models.DimProgram).filter_by(folio=folio).first()
                    if not prog:
                        prog = models.DimProgram(
                            folio=folio, name=name, program_type=tipo,
                            career_id=career_id, max_slots=max_slots,
                            dependency_name=dep_name, sector=sector,
                            evaluator_name=evaluator, period_id=period.id,
                            status="full" if is_full else "active",
                        )
                        db.add(prog)
                        db.flush()
                        programs_loaded += 1

                    avail = db.query(models.OpsProgramAvailability).filter_by(program_id=prog.id).first()
                    if not avail:
                        available = max(0, max_slots - used)
                        db.add(models.OpsProgramAvailability(
                            program_id=prog.id, max_slots=max_slots,
                            used_slots=used, available_slots=available, is_full=is_full,
                        ))
                except Exception:
                    continue

            wb.close()
            print(f"  programs loaded from Excel: {programs_loaded}")
        except ImportError:
            print("  [!] openpyxl not installed. Run: pip install openpyxl")
        except Exception as e:
            print(f"  [!] Excel import error: {e}")
    else:
        print("  [!] Excel file not found. Place it at backend/data/programs.xlsx")

    # ── 9. Alumnos mock ──────────────────────────────────────
    mock_students = [
        ("ana.reyes@alm.buap.mx",        "Ana Sofía",     "Reyes",      "Morales", "202112345", "LAE", "escolarizado"),
        ("carlos.hernandez@alm.buap.mx", "Carlos Eduardo","Hernández",  "Ruiz",    "202054321", "LCI", "escolarizado"),
        ("mfernanda.torres@alm.buap.mx", "María Fernanda","Torres",     "López",   "202198765", "APG", "semi_escolarizado"),
    ]
    for email, first, pat, mat, matricula, career_code, mod_code in mock_students:
        if not db.query(models.OpsStudent).filter_by(email=email).first():
            full_name = f"{first} {pat} {mat}"
            student = models.OpsStudent(
                email=email, full_name=full_name, first_name=first,
                last_name_paterno=pat, last_name_materno=mat, matricula=matricula,
                career_id=career_map[career_code], modality_id=modality_map[mod_code],
            )
            db.add(student)
            db.flush()
            db.add(models.FactRegistration(
                email=email, full_name=full_name, first_name=first,
                last_name_paterno=pat, last_name_materno=mat, matricula=matricula,
                career_id=career_map[career_code], modality_id=modality_map[mod_code],
            ))
    print(f"  mock students: {len(mock_students)}")

    # ── 10. Admins ───────────────────────────────────────────
    admins_data = [
        ("coordinador", "admin2026",  "Coordinadora CPPC",         "coordinador"),
        ("asistente",   "asist2026",  "Asistente de Coordinación", "subordinado"),
    ]
    for username, pwd, full_name, role in admins_data:
        if not db.query(models.OpsAdminUser).filter_by(username=username).first():
            db.add(models.OpsAdminUser(
                username=username, password_hash=hash_password(pwd),
                full_name=full_name, role=role,
            ))
    db.flush()
    print(f"  admins: {len(admins_data)}")

    db.commit()

    # ── 11. Resumen ──────────────────────────────────────────
    print("\n" + "-"*50)
    print("RESUMEN DE TABLAS:")
    tables = [
        ("dim_careers",              models.DimCareer),
        ("dim_modalities",           models.DimModality),
        ("dim_periods",              models.DimPeriod),
        ("dim_programs",             models.DimProgram),
        ("dim_process_definitions",  models.DimProcessDefinition),
        ("dim_process_steps",        models.DimProcessStep),
        ("dim_document_types",       models.DimDocumentType),
        ("dim_system_config",        models.DimSystemConfig),
        ("ops_students",             models.OpsStudent),
        ("ops_admin_users",          models.OpsAdminUser),
        ("ops_program_availability", models.OpsProgramAvailability),
        ("fact_registrations",       models.FactRegistration),
    ]
    for name, model in tables:
        count = db.query(model).count()
        print(f"  {name:<34} {count:>5} registros")
    print("-"*50)
    print("[OK] Seed completado.")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
