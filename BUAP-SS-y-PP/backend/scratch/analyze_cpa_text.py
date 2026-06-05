import fitz
import sys
import os

def list_pdf_fields_with_text(pdf_path):
    if not os.path.exists(pdf_path):
        print(f"File not found: {pdf_path}")
        return

    doc = fitz.open(pdf_path)
    print(f"--- Fields in {os.path.basename(pdf_path)} ---")
    for page in doc:
        text = page.get_text()
        print(f"Page Text Snippet: {text[:500]}...")
        for field in page.widgets():
            # Check what text is around this field
            print(f"Field Name: '{field.field_name}', Rect: {field.rect}")
    doc.close()

if __name__ == "__main__":
    templates = [
        "/Volumes/Adriel-SSD/Evangelista & Co/Evangelista & Co/Clientes/BUAP/Coordinación SS-PP (Admon)/Codigo/BUAP-SS-y-PP/backend/templates/FORMATO GRAL CPA SS.pdf",
    ]
    for t in templates:
        list_pdf_fields_with_text(t)
