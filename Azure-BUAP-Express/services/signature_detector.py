"""
Detecta visualmente la presencia de firma y sello en un PDF.
Usa PIL para análisis de imagen en zonas específicas del documento.
Retorna scores de confianza (0.0 - 1.0).
"""
import io
import fitz  # PyMuPDF
from PIL import Image, ImageFilter
from dataclasses import dataclass
from typing import Tuple
import math


@dataclass
class SignatureDetectionResult:
    firma_detected: bool
    firma_confidence: float   # 0.0 - 1.0
    firma_detail: str
    sello_detected: bool
    sello_confidence: float   # 0.0 - 1.0
    sello_detail: str


# Umbral de píxel para considerar "oscuro" (0=negro, 255=blanco)
DARK_PIXEL_THRESHOLD = 120
# Mínimo de píxeles oscuros para considerar presencia de firma
MIN_DARK_PIXELS_FIRMA = 200
# Mínimo de píxeles oscuros para considerar presencia de sello
MIN_DARK_PIXELS_SELLO = 300


def _render_page_to_pil(page: fitz.Page, dpi: int = 150) -> Image.Image:
    """Renderiza una página PDF a imagen PIL."""
    scale = dpi / 72.0
    matrix = fitz.Matrix(scale, scale)
    pix = page.get_pixmap(matrix=matrix)
    img_bytes = pix.tobytes("png")
    return Image.open(io.BytesIO(img_bytes)).convert("RGB")


def _get_dark_pixel_stats(img: Image.Image) -> Tuple[int, float]:
    """
    Cuenta píxeles oscuros y calcula varianza espacial.
    Retorna (count, variance_score).
    """
    gray = img.convert("L")
    pixels = list(gray.getdata())
    width, height = gray.size

    dark_positions = []
    for i, p in enumerate(pixels):
        if p < DARK_PIXEL_THRESHOLD:
            x = i % width
            y = i // width
            dark_positions.append((x, y))

    count = len(dark_positions)
    if count < 2:
        return count, 0.0

    # Varianza de posición X (firmas orgánicas tienen alta varianza horizontal)
    xs = [p[0] for p in dark_positions]
    mean_x = sum(xs) / len(xs)
    variance_x = sum((x - mean_x) ** 2 for x in xs) / len(xs)
    # Normalizar varianza relativa al ancho
    variance_score = min(1.0, math.sqrt(variance_x) / (width * 0.3))

    return count, variance_score


def detect_firma(page_img: Image.Image) -> Tuple[float, str]:
    """
    Detecta firma en el tercio inferior de la página.
    Retorna (confidence, detail).
    """
    w, h = page_img.size
    # Zona de firma: tercio inferior, mitad izquierda/central
    firma_zone = page_img.crop((0, int(h * 0.60), int(w * 0.75), h))

    # Eliminamos el texto impreso (líneas horizontales finas)
    # Enfocamos en píxeles oscuros con varianza alta
    dark_count, variance = _get_dark_pixel_stats(firma_zone)

    if dark_count < MIN_DARK_PIXELS_FIRMA:
        return 0.1, f"Muy pocos píxeles oscuros en zona de firma ({dark_count})"

    # Score combinado: cuenta + varianza
    count_score = min(1.0, dark_count / 2000)
    combined = (count_score * 0.5) + (variance * 0.5)

    if combined >= 0.60:
        return combined, f"Firma detectada (píxeles: {dark_count}, varianza: {variance:.2f})"
    elif combined >= 0.30:
        return combined, f"Posible firma (píxeles: {dark_count}, varianza: {variance:.2f})"
    else:
        return combined, f"Firma no clara (píxeles: {dark_count}, varianza: {variance:.2f})"


def detect_sello(page_img: Image.Image) -> Tuple[float, str]:
    """
    Detecta sello en el cuadrante inferior-derecho.
    Los sellos BUAP son típicamente circulares, azul o negro.
    Retorna (confidence, detail).
    """
    w, h = page_img.size
    # Cuadrante inferior-derecho
    sello_zone = page_img.crop((int(w * 0.55), int(h * 0.60), w, h))

    # Detección de tinta azul (sellos oficiales mexicanos son frecuentemente azules)
    r, g, b = sello_zone.convert("RGB").split()
    r_data = list(r.getdata())
    g_data = list(g.getdata())
    b_data = list(b.getdata())

    blue_ink_pixels = sum(
        1 for r_val, g_val, b_val in zip(r_data, g_data, b_data)
        if b_val > 100 and b_val > r_val + 20 and b_val > g_val + 10
    )

    # También detecta tinta oscura/negra en cluster
    dark_count, variance = _get_dark_pixel_stats(sello_zone)

    if blue_ink_pixels > 100:
        conf = min(1.0, blue_ink_pixels / 500)
        if conf >= 0.60:
            return conf, f"Sello azul detectado ({blue_ink_pixels} píxeles azules)"
        elif conf >= 0.30:
            return conf, f"Posible sello azul ({blue_ink_pixels} píxeles azules)"

    if dark_count > MIN_DARK_PIXELS_SELLO:
        # Sello negro o gris
        count_score = min(1.0, dark_count / 1500)
        conf = count_score * 0.7  # Menos confianza que sello azul
        if conf >= 0.30:
            return conf, f"Posible sello oscuro ({dark_count} píxeles)"

    return 0.1, f"Sello no detectado (azul: {blue_ink_pixels}, oscuro: {dark_count})"


def detect_signatures(pdf_bytes: bytes) -> SignatureDetectionResult:
    """
    Analiza la primera página del PDF para detectar firma y sello.
    """
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if len(doc) == 0:
            return SignatureDetectionResult(
                firma_detected=False, firma_confidence=0.0,
                firma_detail="PDF vacío",
                sello_detected=False, sello_confidence=0.0,
                sello_detail="PDF vacío",
            )

        page = doc[0]
        img = _render_page_to_pil(page, dpi=150)
        doc.close()

        firma_conf, firma_detail = detect_firma(img)
        sello_conf, sello_detail = detect_sello(img)

        return SignatureDetectionResult(
            firma_detected=firma_conf >= 0.60,
            firma_confidence=round(firma_conf, 3),
            firma_detail=firma_detail,
            sello_detected=sello_conf >= 0.60,
            sello_confidence=round(sello_conf, 3),
            sello_detail=sello_detail,
        )
    except Exception as e:
        return SignatureDetectionResult(
            firma_detected=False, firma_confidence=0.0,
            firma_detail=f"Error en detección: {str(e)}",
            sello_detected=False, sello_confidence=0.0,
            sello_detail=f"Error en detección: {str(e)}",
        )
