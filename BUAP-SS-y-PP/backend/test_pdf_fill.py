import os
from pypdf import PdfReader, PdfWriter
import traceback

def test_fill():
    template_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates", "FORMATO GRAL CPA SS.pdf")
    filepath = "test_out.pdf"
    data_dict = {
        'nombre nombramiento': 'Test',
    }
    try:
        reader = PdfReader(template_path)
        writer = PdfWriter()
        writer.append(reader)
        
        writer.update_page_form_field_values(writer.pages[0], data_dict)
        
        with open(filepath, "wb") as f:
            writer.write(f)
        print("Success")
    except Exception as e:
        print("Exception caught:")
        traceback.print_exc()

if __name__ == "__main__":
    test_fill()
