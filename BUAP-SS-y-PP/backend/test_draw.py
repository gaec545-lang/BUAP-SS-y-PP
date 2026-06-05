import fitz
template = "templates/FORMATO GRAL CPA SS.pdf"
doc = fitz.open(template)
page = doc[0]
widgets = list(page.widgets())

for field in widgets[:5]:
    rect = field.rect
    val = "Texto de Prueba 123"
    fs = field.text_fontsize
    if not fs or fs <= 0: fs = 11
    
    rc = page.insert_textbox(rect, val, fontsize=fs, fontname="helv", align=fitz.TEXT_ALIGN_CENTER)
    print(f"Widget: {field.field_name}, Rect: {rect}, FontSize: {fs}, rc: {rc}")
