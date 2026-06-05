import fitz
doc = fitz.open("templates/FORMATO GRAL CART CONFIDENCIALIDAD.pdf")
page = doc[0]
for field in page.widgets():
    print(dir(field))
    break
