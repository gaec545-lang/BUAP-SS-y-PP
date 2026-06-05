import fitz

template_path = "templates/FORMATO GRAL CART CONFIDENCIALIDAD.pdf"
output_path = "test_confidencial_fitz.pdf"

data_dict = {
    'Dia': '26',
    'Mes': 'Marzo',
    'Año': '2026',
    'Nombre completo de la dependencia': 'Mi Dependencia',
    'Nombre completo del alumno': 'Juan Perez',
    'Matrícula': '20230000',
    'Nombre completo de la facultad': 'Facultad de Computación'
}

try:
    doc = fitz.open(template_path)
    page = doc[0]
    for field in page.widgets():
        name = field.field_name
        if name in data_dict:
            field.field_value = data_dict[name]
        # Always set to ReadOnly
        field.field_flags |= fitz.PDF_FIELD_IS_READ_ONLY
        field.update()
        
    doc.save(output_path)
    print("SUCCESS FITZ!")
except Exception as e:
    import traceback
    traceback.print_exc()
