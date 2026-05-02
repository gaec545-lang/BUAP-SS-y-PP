import fitz

template_path = "templates/FORMATO GRAL CART CONFIDENCIALIDAD.pdf"
output_path = "test_flattened.pdf"

data_dict = {
    'Dia': '26',
    'Mes': 'Marzo',
    'Año': '2026',
    'Nombre completo de la dependencia': 'Coordinación General de Desarrollo Estudiantil y Servicio Social BUAP',
    'Nombre completo del alumno': 'Juan Francisco Javier Perez de la Cruz y Martinez',
    'Matrícula': '20230000000',
    'Nombre completo de la facultad': 'Facultad de Computación e Informática Aplicada'
}

try:
    doc = fitz.open(template_path)
    for page in doc:
        for field in page.widgets():
            name = field.field_name
            if name in data_dict:
                val = str(data_dict[name])
                rect = field.rect
                
                # Fetch original font size, default to 11 if 0 (Auto)
                fs = field.text_fontsize
                if not fs or fs <= 0:
                    fs = 11
                    
                # We calculate the logical width of the text
                fontname = "helv"
                text_len = fitz.get_text_length(val, fontname=fontname, fontsize=fs)
                
                # 4 pixels of padding
                max_width = rect.width - 4 
                
                # Shrink if too large
                if text_len > max_width and max_width > 0:
                    fs = fs * (max_width / text_len)
                    # Set a hard floor so it doesn't become totally microscopic
                    if fs < 4: fs = 4
                
                # We align center for most, but names might be left aligned?
                # Actually, CPA forms usually center their fields.
                # Let's insert the text into the exact rectangle vertically centered.
                # We can construct a Point for the baseline if we want exact vertical center, 
                # but insert_textbox centers vertically by default if it fits.
                page.insert_textbox(rect, val, fontsize=fs, fontname=fontname, align=fitz.TEXT_ALIGN_CENTER)
                
            # ALWAYS delete the widget so it is literally impossible to click/edit
            page.delete_widget(field)
            
    doc.save(output_path)
    print("SUCCESS FLATTEN!")
except Exception as e:
    import traceback
    traceback.print_exc()
