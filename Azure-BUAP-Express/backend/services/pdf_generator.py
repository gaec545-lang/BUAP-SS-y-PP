import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

try:
    import fitz
    FITZ_AVAILABLE = True
except ImportError:
    FITZ_AVAILABLE = False


def generate_pdf_for_student(
    document_type: str,
    student,  # OpsStudent
    folio: str,
    output_dir: str,
    dependency_name: str = None,
    addressed_to: str = None,
    program_name: str = None,
    evaluator_name: str = None,
    responsible_position: str = None,
    **extra_data
) -> str:
    filename = f"{document_type}-{student.matricula}-{folio}.pdf"
    filepath = os.path.join(output_dir, filename)

    # ─────────────────────────────────────────────────────────────
    # INTEGRACION DE TEMPLATES DINAMICOS CON PYPDF
    # ─────────────────────────────────────────────────────────────
    if FITZ_AVAILABLE:
        templates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
        template_map = {
            'DOC-SS-002': 'FORMATO GRAL CPA SS.pdf',
            'DOC-PP-002': 'FORMATO GRAL CPA-PP.pdf',
            'carta_confidencialidad': 'FORMATO GRAL CART CONFIDENCIALIDAD.pdf',
            'carta_confidencialidad_signed': 'FORMATO GRAL CART CONFIDENCIALIDAD.pdf',
            'carta_compromiso': 'FORMATO CARTA COMPROMISO.pdf'
        }
        
        if document_type in template_map:
            template_path = os.path.join(templates_dir, template_map[document_type])
            
            if os.path.exists(template_path):
                # Extraemos info del programa desde el enrollment si es posible (solo si no se pasaron explícitamente)
                program = None
                if not program_name or not evaluator_name:
                    if hasattr(student, 'enrollments') and student.enrollments:
                        for e in student.enrollments:
                            if e.program and (e.program.folio == folio or not folio):
                                program = e.program
                                break

                career_name = student.career.name if student.career else ''
                prog_name = program_name or (program.name if program else '')
                resp_name = evaluator_name or (program.evaluator_name if program else '')
                
                now = datetime.now()
                months = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
                
                # Extra data passed via **kwargs
                phone = extra_data.get('phone_number', '')
                period = extra_data.get('period', '')
                year_digit = extra_data.get('year_digit', '')
                month_input = extra_data.get('month', '')

                data_dict = {}
                
                if document_type == 'DOC-SS-002':
                    data_dict = {
                        'nombre nombramiento': addressed_to or '',
                        'nombre dependencia': dependency_name or '',
                        'nombre alumno': student.full_name or '',
                        'carrera': career_name,
                        'matrícula': student.matricula or '',
                        'programa': prog_name,
                        'folio': folio or '',
                        'día': str(now.day),
                        'mes': months[now.month],
                        'año': str(now.year)[-2:], # '26' para 2026
                        'coordinador': "Cesar Guadalupe Casarrubias Sánchez",
                        'nombre responsable': addressed_to or '',
                        'cargo responsable': '', # Sin cargo
                    }
                elif document_type == 'DOC-PP-002':
                    data_dict = {
                        'nombre dependencia': dependency_name or '',
                        'nombre alumno': student.full_name or '',
                        'carrera': career_name,
                        'matrícula': student.matricula or '',
                        'programa': prog_name,
                        'folio': folio or '',
                        'horas': '480',
                        'dias': str(now.day),
                        'mes': months[now.month],
                        'año': str(now.year)[-2:], # '26' para 2026
                        'nombre coordinador': "Cesar Guadalupe Casarrubias Sánchez",
                        'nombre responsable': addressed_to or '',
                        'cargo responsable': '', # Sin cargo
                        'carta asignacion dirigida a': addressed_to or '',
                    }
                elif document_type in ['carta_confidencialidad', 'carta_confidencialidad_signed']:
                    data_dict = {
                        'Dia': str(now.day),
                        'Mes': months[now.month],
                        'Año': str(now.year)[-1], # Solo el último dígito (ej. 6 para 2026)
                        'Nombre completo de la dependencia': dependency_name or '',
                        'Nombre completo del alumno': student.full_name or '',
                        'Matrícula': student.matricula or '',
                        'Nombre completo de la facultad': "Facultad de Administración",
                    }
                elif document_type == 'carta_compromiso':
                    # Extract last digit of year if a full year (like 2026) was provided
                    processed_year_digit = year_digit
                    if len(str(year_digit)) > 1:
                        processed_year_digit = str(year_digit)[-1]
                    
                    # Current date for "Atentamente" section
                    now = datetime.now()
                    current_day = str(now.day)
                    current_month = months[now.month].upper()
                    current_year_digit = str(now.year)[-1]

                    data_dict = {
                        'NOMBRE DEL ALUMNO': student.full_name or '',
                        'NOMBRE DEL ALUMNO1': student.full_name or '',
                        'NÚMERO DE TELEFONO': phone,
                        'MATRICULA': student.matricula or '',
                        'NOMBRE DE LA LICENCIATURA': career_name,
                        'CORREO ELECTRONICO': student.email or '',
                        'PERIODO (EJ. VERANO)': period,
                        'PERIODO (EJ. VERANO)1': period, # Periodo del programa
                        'DIGITO DEL AÑO (EJ.6)': processed_year_digit, # Año del programa
                        'DIGITO DEL AÑO (EJ.6)1': processed_year_digit,
                        'DIGITO DEL AÑO (EJ.6)2': current_day, # Sincronizado: Día actual (Atentamente)
                        'MES (EJ. JUNIO)1': current_month, # Sincronizado: Mes actual (Atentamente)
                        'DIGITO DEL AÑO (EJ.6)5': current_year_digit, # Sincronizado: Año actual (Atentamente)
                    }

                # Llenado de PDF
                try:
                    doc = fitz.open(template_path)
                    for page in doc:
                        # Collect widgets ahead of time to safely delete them during iteration
                        widgets = list(page.widgets())
                        for field in widgets:
                            name = field.field_name
                            if name in data_dict:
                                val = str(data_dict.get(name, ""))
                                if val:
                                    rect = field.rect
                                    
                                    fs = field.text_fontsize
                                    if not fs or fs <= 0:
                                        fs = 11
                                    
                                    fontname = "helv"
                                    text_len = fitz.get_text_length(val, fontname=fontname, fontsize=fs)
                                    max_width = rect.width - 8 # 8 pixels padding
                                    
                                    if text_len > max_width and max_width > 0:
                                        fs = fs * (max_width / text_len)
                                        if fs < 4: fs = 4
                                        text_len = fitz.get_text_length(val, fontname=fontname, fontsize=fs)
                                        
                                    x = rect.x0 + 4
                                    y = rect.y1 - (rect.height - fs) / 2 - 1.5
                                    
                                    p = fitz.Point(x, y)
                                    page.insert_text(p, val, fontsize=fs, fontname=fontname, color=(0,0,0))
                            
                            # Destrucción física del widget interactivo para aplanar 100% el PDF
                            page.delete_widget(field)
                            
                    doc.save(filepath)
                    doc.close()
                    
                    # Retornamos enseguida ya que el template fue llenado!
                    return filepath
                except Exception as e:
                    print(f"Error llenando template {template_map[document_type]}: {e}")
                    # Si falla, cae al código fallback de ReportLab abajo.
                    pass

    # ─────────────────────────────────────────────────────────────
    # FALLBACK: GENERACION DE PDF EN BLANCO CON REPORTLAB
    # (Para documentos sin template o falla de carga)
    # ─────────────────────────────────────────────────────────────

    doc = SimpleDocTemplate(
        filepath,
        pagesize=letter,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=25*mm,
        bottomMargin=20*mm
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'BUAPTitle',
        parent=styles['Normal'],
        fontSize=13,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        spaceAfter=2*mm,
    )
    subtitle_style = ParagraphStyle(
        'BUAPSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica',
        alignment=TA_CENTER,
        spaceAfter=1*mm,
    )
    section_style = ParagraphStyle(
        'Section',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica-Bold',
        spaceAfter=2*mm,
        spaceBefore=4*mm,
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica',
        leading=14,
        spaceAfter=2*mm,
    )
    field_label_style = ParagraphStyle(
        'FieldLabel',
        parent=styles['Normal'],
        fontSize=9,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#6C757D'),
        spaceAfter=0.5*mm,
    )
    field_value_style = ParagraphStyle(
        'FieldValue',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica',
        spaceAfter=3*mm,
    )

    story = []

    # Header
    story.append(Paragraph("BENEMÉRITA UNIVERSIDAD AUTÓNOMA DE PUEBLA", title_style))
    story.append(Paragraph("Facultad de Administración", subtitle_style))
    story.append(Paragraph("Coordinación de Prácticas Profesionales y Comunicación", subtitle_style))
    story.append(Spacer(1, 3*mm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#003366')))
    story.append(Spacer(1, 5*mm))

    # Document title
    doc_titles = {
        'DOC-SS-002': 'CARTA DE PRESENTACIÓN — SERVICIO SOCIAL',
        'DOC-PP-002': 'CARTA DE PRESENTACIÓN — PRÁCTICA PROFESIONAL',
        'DOC-SS-006': 'SOLICITUD DE LIBERACIÓN DE SERVICIO SOCIAL',
        'carta_confidencialidad': 'CARTA DE CONFIDENCIALIDAD',
        'carta_confidencialidad_signed': 'CARTA DE CONFIDENCIALIDAD'
    }
    doc_title = doc_titles.get(document_type, f'DOCUMENTO — {document_type}')

    title_doc_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontSize=12,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        spaceAfter=6*mm,
        textColor=colors.HexColor('#003366'),
    )
    story.append(Paragraph(doc_title, title_doc_style))

    # Student data
    story.append(Paragraph("DATOS DEL ALUMNO", section_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#E9ECEF')))
    story.append(Spacer(1, 3*mm))

    def field(label: str, value: str):
        story.append(Paragraph(label, field_label_style))
        story.append(Paragraph(value or "—", field_value_style))

    # Resolve career name via relationship or fallback
    career_name = ""
    if hasattr(student, "career") and student.career:
        career_name = student.career.name if hasattr(student.career, "name") else str(student.career)

    field("Nombre completo", student.full_name)
    field("Matrícula", student.matricula)
    field("Carrera", career_name)
    field("Semestre", "—")
    field("Promedio", "—")
    if dependency_name:
        field("Dependencia / Empresa", dependency_name)

    story.append(Spacer(1, 3*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#E9ECEF')))
    story.append(Spacer(1, 5*mm))

    # Document-specific body
    _add_document_body(story, document_type, student, body_style, section_style,
                       dependency_name=dependency_name, career_name=career_name, addressed_to=addressed_to)

    # Signature zone
    story.append(Spacer(1, 10*mm))
    story.append(Paragraph("FIRMAS", section_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#E9ECEF')))
    story.append(Spacer(1, 8*mm))

    sig_data = [
        ['Firma del alumno:', '', 'Firma del responsable:'],
        ['', '', ''],
        ['_' * 30, '', '_' * 30],
        [student.full_name, '', 'Nombre y cargo'],
        ['(Firma en tinta azul)', '', '(Firma en tinta azul)'],
    ]
    sig_table = Table(sig_data, colWidths=[70*mm, 20*mm, 70*mm])
    sig_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('TEXTCOLOR', (0,3), (0,3), colors.HexColor('#1A1A2E')),
        ('TEXTCOLOR', (0,4), (-1,4), colors.HexColor('#6C757D')),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
    ]))
    story.append(sig_table)

    story.append(Spacer(1, 6*mm))

    sello_style = ParagraphStyle('Sello', parent=styles['Normal'], fontSize=9,
                                  textColor=colors.HexColor('#6C757D'), alignment=TA_CENTER)
    story.append(Paragraph("Sello oficial: ___________________________", sello_style))

    # Footer
    story.append(Spacer(1, 10*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#E9ECEF')))
    story.append(Spacer(1, 2*mm))

    footer_date = datetime.now().strftime("%d/%m/%Y %H:%M")
    footer_text = f"Generado el {footer_date}  |  Folio: {folio}  |  Válido únicamente con firma y sello original"
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8,
                                   textColor=colors.HexColor('#ADB5BD'), alignment=TA_CENTER)
    story.append(Paragraph(footer_text, footer_style))

    doc.build(story)
    return filepath


def _add_document_body(story, document_type: str, student, body_style, section_style,
                       dependency_name: str = None, career_name: str = "", addressed_to: str = None):
    """Add document-specific content to the story."""

    if addressed_to:
        story.append(Paragraph(f"A quien corresponda: <b>{addressed_to}</b>", section_style))
        story.append(Spacer(1, 4*mm))

    if document_type == 'DOC-SS-002':
        story.append(Paragraph("CUERPO DEL DOCUMENTO", section_style))
        text = (
            f"Por medio de la presente, la Coordinación de Prácticas Profesionales y Comunicación "
            f"de la Facultad de Administración de la Benemérita Universidad Autónoma de Puebla, "
            f"presenta al alumno <b>{student.full_name}</b>, con matrícula <b>{student.matricula}</b>, "
            f"quien realizará su <b>Servicio Social</b> en esa dependencia a partir de la fecha indicada. "
            f"El duración del Servicio Social es de 480 horas mínimo."
        )
        story.append(Paragraph(text, body_style))

        if dependency_name:
            story.append(Paragraph(f"<b>Dependencia receptora:</b> {dependency_name}", body_style))

        story.append(Paragraph("<b>Fecha de inicio:</b> ___________________________", body_style))
        story.append(Paragraph("<b>Fecha estimada de término:</b> ___________________________", body_style))

    elif document_type == 'DOC-PP-002':
        story.append(Paragraph("CUERPO DEL DOCUMENTO", section_style))
        text = (
            f"Por medio de la presente, la Coordinación de Prácticas Profesionales y Comunicación "
            f"de la Facultad de Administración de la Benemérita Universidad Autónoma de Puebla, "
            f"presenta al alumno <b>{student.full_name}</b>, con matrícula <b>{student.matricula}</b>, "
            f"quien realizará su <b>Práctica Profesional</b> en esa organización. "
            f"El alumno se compromete a desempeñar sus actividades con responsabilidad y profesionalismo."
        )
        story.append(Paragraph(text, body_style))

        if dependency_name:
            story.append(Paragraph(f"<b>Organización receptora:</b> {dependency_name}", body_style))

    elif document_type == 'DOC-SS-006' or document_type == 'carta_liberacion':
        story.append(Paragraph("SOLICITUD DE LIBERACIÓN", section_style))
        dep_display = dependency_name or "___________________________"
        text = (
            f"El que suscribe, <b>{student.full_name}</b>, alumno de la Licenciatura en "
            f"<b>{career_name}</b>, con matrícula <b>{student.matricula}</b>, "
            f"solicita respetuosamente a la Coordinación de Prácticas Profesionales y Comunicación "
            f"de la Facultad de Administración de la BUAP, se sirva tramitar la <b>Liberación de su "
            f"Servicio Social</b>, habiendo cumplido satisfactoriamente con las 480 horas requeridas."
        )
        story.append(Paragraph(text, body_style))

    elif document_type == 'carta_confidencialidad':
        story.append(Paragraph("CARTA DE CONFIDENCIALIDAD", section_style))
        text = (
            f"Yo, <b>{student.full_name}</b>, me comprometo a guardar la más estricta "
            f"confidencialidad de toda la información que maneje durante mi servicio en "
            f"la dependencia {dependency_name or '_________________'}."
        )
        story.append(Paragraph(text, body_style))

    else:
        # Generic document
        story.append(Paragraph("DESCRIPCIÓN", section_style))
        doc_name = document_type.replace("DOC-", "").replace("-", " ")
        story.append(Paragraph(
            f"Documento oficial para el trámite de {doc_name}. "
            f"Este documento forma parte del expediente del alumno {student.full_name} "
            f"con matrícula {student.matricula}.",
            body_style
        ))
        story.append(Spacer(1, 5*mm))
        story.append(Paragraph("Observaciones:", body_style))
        for _ in range(4):
            story.append(Paragraph("_" * 80, body_style))
