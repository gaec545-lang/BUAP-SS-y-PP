import fitz
import sys

def dump_pdf_text(path, out_path):
    try:
        doc = fitz.open(path)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(f"--- DUMPING PDF: {path} ---\n")
            for i, page in enumerate(doc):
                f.write(f"\n--- PAGE {i+1} ---\n")
                f.write(page.get_text())
        doc.close()
        print(f"Dumped to {out_path}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    dump_pdf_text("programa otoño 26.pdf", "scratch/pdf_dump.txt")
