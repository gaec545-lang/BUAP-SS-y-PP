"""
Wrapper de pytesseract para OCR de páginas PDF renderizadas como imágenes.
Configurado para documentos universitarios en español.
"""
import os
import io
import pytesseract
from PIL import Image, ImageFilter, ImageEnhance

# Ruta de Tesseract (configurable por env var para Azure vs local Windows)
TESSERACT_CMD = os.getenv("TESSERACT_CMD", "tesseract")
pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

# Config: LSTM engine, bloque uniforme de texto, idioma español
TESS_CONFIG = "--oem 1 --psm 6 -l spa"


def ocr_page(image_bytes: bytes) -> str:
    """
    Applies OCR to a PNG/JPEG image and returns the extracted text.
    Applies minimal preprocessing to improve accuracy on scanned forms.
    """
    img = Image.open(io.BytesIO(image_bytes))

    # Convert to grayscale
    img = img.convert("L")

    # Mild sharpening to improve character edges
    img = img.filter(ImageFilter.SHARPEN)

    # Enhance contrast slightly
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.5)

    try:
        text = pytesseract.image_to_string(img, config=TESS_CONFIG)
        return text.strip()
    except Exception as e:
        return f"[OCR_ERROR: {str(e)}]"
