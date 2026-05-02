import fitz
import sys
import os

def list_pdf_fields(pdf_path):
    if not os.path.exists(pdf_path):
        print(f"File not found: {pdf_path}")
        return

    doc = fitz.open(pdf_path)
    print(f"--- Fields in {os.path.basename(pdf_path)} ---")
    for page in doc:
        for field in page.widgets():
            print(f"Field Name: '{field.field_name}', Type: {field.field_type_string}")
    doc.close()

if __name__ == "__main__":
    templates = [
        "/Volumes/Adriel-SSD/Evangelista & Co/Evangelista & Co/Clientes/BUAP/Coordinación SS-PP (Admon)/Codigo/BUAP-SS-y-PP/backend/templates/FORMATO GRAL CPA SS.pdf",
        "/Volumes/Adriel-SSD/Evangelista & Co/Evangelista & Co/Clientes/BUAP/Coordinación SS-PP (Admon)/Codigo/BUAP-SS-y-PP/backend/templates/FORMATO GRAL CPA-PP.pdf"
    ]
    for t in templates:
        list_pdf_fields(t)
