import fitz
import os

files = [
    r"c:\Users\ADMIN\Documents\Evangelista & Co\Evangelista & Co\Clientes\BUAP\Coordinación SS-PP (Admon)\Codigo\BUAP-SS-y-PP\backend\templates\Bonilla Márquez Guadalupe_anonymous 1.pdf"
]

for f in files:
    doc = fitz.open(f)
    for i, page in enumerate(doc):
        mat = fitz.Matrix(2.5, 2.5)
        pix = page.get_pixmap(matrix=mat)
        out = f"{os.path.basename(f)}_page_{i}.png"
        pix.save(out)
        print(f"Saved {out}")
