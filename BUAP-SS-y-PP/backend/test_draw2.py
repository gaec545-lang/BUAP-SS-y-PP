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
        
    # Force Y-fit
    max_fs_y = rect.height * 0.75
    if fs > max_fs_y:
        fs = max_fs_y
        
    text_len = fitz.get_text_length(val, fontname="helv", fontsize=fs)
    max_width = rect.width - 4
    if text_len > max_width and max_width > 0:
        fs = fs * (max_width / text_len)
        
    rc = page.insert_textbox(rect, val, fontsize=fs, fontname="helv", align=fitz.TEXT_ALIGN_CENTER)
    print(f"Widget: {field.field_name}, RectHeight: {rect.height}, FontSize: {fs}, rc: {rc}")
