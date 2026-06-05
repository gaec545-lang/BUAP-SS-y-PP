import os
from pypdf import PdfReader

def inspect_pdf(filepath):
    print(f"Inspecting {filepath}...")
    try:
        reader = PdfReader(filepath)
        fields = reader.get_form_text_fields()
        if not fields:
            print("No fields found or fields empty.")
        else:
            for k, v in fields.items():
                print(f"Field: '{k}' -> '{v}'")
        
        # Extended property check if get_form_text_fields misses something
        if "/AcroForm" in reader.trailer["/Root"]:
            print("--- AcroForm structure exists")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    templates_dir = os.path.join(os.path.dirname(__file__), "templates")
    for f in os.listdir(templates_dir):
        if f.endswith(".pdf"):
            inspect_pdf(os.path.join(templates_dir, f))
