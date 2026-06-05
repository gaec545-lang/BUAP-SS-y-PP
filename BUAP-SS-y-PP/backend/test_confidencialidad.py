import os
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, NumberObject

template_path = "templates/FORMATO GRAL CART CONFIDENCIALIDAD.pdf"
output_path = "test_confidencial.pdf"

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
    reader = PdfReader(template_path)
    writer = PdfWriter()
    writer.append(reader)
    writer.update_page_form_field_values(writer.pages[0], data_dict, auto_regenerate=False)
    
    for page in writer.pages:
        if "/Annots" in page:
            for annot in page["/Annots"]:
                annot_obj = annot.get_object()
                if annot_obj.get("/Subtype") == "/Widget":
                    flags = annot_obj.get("/Ff", 0)
                    annot_obj[NameObject("/Ff")] = NumberObject(flags | 1)
                    
    with open(output_path, "wb") as f:
        writer.write(f)
        
    print("PDF Guardado exitosamente!")
except Exception as e:
    import traceback
    traceback.print_exc()
