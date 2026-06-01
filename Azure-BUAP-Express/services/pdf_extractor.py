"""
Extrae texto de un PDF.
Intenta primero la capa de texto (PyMuPDF).
Si el resultado es pobre (PDF escaneado), usa OCR vía ocr_engine.
"""
import fitz  # PyMuPDF
from typing import Tuple
from services.ocr_engine import ocr_page

MIN_TEXT_CHARS = 50  # Si hay menos de esto por página, se considera imagen


def extract_text(pdf_bytes: bytes) -> Tuple[str, str]:
    """
    Returns (raw_text, method) where method is 'text_layer', 'ocr', or 'hybrid'.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages_text = []
    methods_used = set()

    for page in doc:
        text = page.get_text("text").strip()
        if len(text) >= MIN_TEXT_CHARS:
            methods_used.add("text_layer")
            pages_text.append(text)
        else:
            # Render page to image for OCR (2x zoom ≈ 144 DPI)
            matrix = fitz.Matrix(2.0, 2.0)
            pix = page.get_pixmap(matrix=matrix)
            img_bytes = pix.tobytes("png")
            ocr_text = ocr_page(img_bytes)
            methods_used.add("ocr")
            pages_text.append(ocr_text)

    doc.close()

    raw_text = "\n".join(pages_text)

    if "text_layer" in methods_used and "ocr" in methods_used:
        method = "hybrid"
    elif "ocr" in methods_used:
        method = "ocr"
    else:
        method = "text_layer"

    return raw_text, method
