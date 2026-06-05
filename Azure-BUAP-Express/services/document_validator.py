import fitz  # PyMuPDF
import re
import os
import pytesseract
from PIL import Image
import io

def normalize_text(text: str) -> str:
    """Elimina acentos y convierte a minúsculas, elimina puntuación extra."""
    if not text:
        return ""
    import unicodedata
    text = unicodedata.normalize('NFD', text).encode('ascii', 'ignore').decode('utf-8')
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    return " ".join(text.split())

def evaluate_document_content(file_path: str, student, doc_type_code: str) -> dict:
    """
    Lee el PDF y busca el nombre y matrícula (u otros requerimientos).
    Extrae texto usando PyMuPDF, y si no hay texto extraíble, usa OCR.
    No lanza excepción, devuelve observaciones y confidence score.
    """
    result = {
        "confidence_score": 0.0,
        "observations": []
    }
    
    try:
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text()
            
        # Si el texto es muy corto, asume imagen e intenta OCR
        if len(text.strip()) < 50:
            result["observations"].append("Poco o nulo texto extraíble detectado, aplicando OCR...")
            try:
                for page in doc:
                    pix = page.get_pixmap(dpi=200)
                    img_data = pix.tobytes("png")
                    img = Image.open(io.BytesIO(img_data))
                    ocr_text = pytesseract.image_to_string(img, lang="spa")
                    text += " " + ocr_text
            except Exception as ocr_e:
                result["observations"].append(f"Fallo al aplicar OCR: {str(ocr_e)}")
                
        if not text.strip():
            result["observations"].append("El documento no contiene texto extraíble ni se pudo obtener texto por OCR. Se requiere revisión manual.")
            return result
            
        norm_text = normalize_text(text)
        
        # Validaciones comunes
        found_matricula = False
        found_name_parts = 0
        total_name_parts = 0
        
        # Buscar matrícula
        if doc_type_code != "cvd_ss":
            if student.matricula:
                # buscar matrícula ignorando espacios y reemplazando l/o por 1/0 debido a posibles errores de OCR
                clean_norm = norm_text.replace(" ", "")
                # variaciones comunes
                ocr_matricula = student.matricula.replace("1", "l").replace("0", "o")
                ocr_matricula2 = student.matricula.replace("1", "i")
                
                if student.matricula in clean_norm or ocr_matricula in clean_norm or ocr_matricula2 in clean_norm:
                    found_matricula = True
            
            if not found_matricula:
                result["observations"].append(f"No se detectó claramente la matrícula ({student.matricula}).")
        else:
            # Para CVD SS asumimos que la matrícula no importa, sino la mención "con derecho"
            found_matricula = True # Dummy
            if "con derecho" in norm_text or "vigente" in norm_text or "derecho al servicio" in norm_text:
                pass
            else:
                result["observations"].append("No se detectó la frase de 'derecho al servicio médico' o estado 'vigente'.")

        # Buscar nombre del estudiante
        if student.full_name:
            name_parts = normalize_text(student.full_name).split()
            total_name_parts = len(name_parts)
            for part in name_parts:
                if len(part) > 2:
                    # Expresión regular para buscar la parte del nombre con flexibilidad (saltos de línea se ignoran gracias a norm_text)
                    if re.search(r'\b' + re.escape(part) + r'\b', norm_text):
                        found_name_parts += 1
                    else:
                        # búsqueda fuzzy rudimentaria (checar si está como subcadena en la versión sin espacios)
                        if part in norm_text.replace(" ", ""):
                            found_name_parts += 1
            
            if found_name_parts < max(1, total_name_parts - 1): # Tolerar que falte un apellido
                result["observations"].append("El nombre del estudiante no coincide claramente con el texto del documento.")
                
        # Calcular confidence
        score = 100.0
        if not found_matricula:
            score -= 40.0
        if total_name_parts > 0:
            name_score_loss = ((total_name_parts - found_name_parts) / total_name_parts) * 60.0
            score -= name_score_loss
            
        if doc_type_code == "cvd_ss":
            if "con derecho" not in norm_text and "vigente" not in norm_text:
                score -= 30.0

        result["confidence_score"] = max(0.0, score)
        
        if result["confidence_score"] >= 80:
            if "Poco o nulo texto extraíble detectado, aplicando OCR..." in result["observations"]:
                pass # Está bien, validación exitosa por OCR
            # clean up successful logic if no true error observations
            error_obs = [obs for obs in result["observations"] if not obs.startswith("Poco o")]
            if not error_obs:
                result["observations"].append("Validación automática exitosa (incluyendo OCR si aplicó). Documento parece correcto.")
        else:
            result["observations"].append("El nivel de confianza es bajo. Por favor, revise manualmente.")
            
    except Exception as e:
        result["observations"].append(f"Error al analizar el documento: {str(e)}")
        result["confidence_score"] = 0.0

    return result
