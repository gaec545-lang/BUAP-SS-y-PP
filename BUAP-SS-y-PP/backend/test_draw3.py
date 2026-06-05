import fitz
template = "templates/FORMATO GRAL CPA SS.pdf"
doc = fitz.open(template)
page = doc[0]
widgets = list(page.widgets())

for field in widgets[:5]:
    rect = field.rect
    val = "Texto Libre Prueba Real"
    
    fs = field.text_fontsize
    if not fs or fs <= 0: fs = 11
        
    fontname = "helv"
    text_len = fitz.get_text_length(val, fontname=fontname, fontsize=fs)
    max_width = rect.width - 4
    
    if text_len > max_width and max_width > 0:
        fs = fs * (max_width / text_len)
        if fs < 4: fs = 4
        text_len = fitz.get_text_length(val, fontname=fontname, fontsize=fs)
        
    x = rect.x0 + (rect.width - text_len) / 2
    y = rect.y1 - (rect.height - fs) / 2 - 1.5
    
    p = fitz.Point(x, y)
    page.insert_text(p, val, fontsize=fs, fontname=fontname, color=(0,0,0))

doc.save("test_draw_out.pdf")
print("Saved force insertion")
