import fitz  # PyMuPDF
import re
import os

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
            
        if not text.strip():
            result["observations"].append("El documento no contiene texto extraíble (posible imagen sin OCR). Se requiere revisión manual.")
            return result
            
        norm_text = normalize_text(text)
        
        # Validaciones comunes
        found_matricula = False
        found_name_parts = 0
        total_name_parts = 0
        
        # Buscar matrícula si el documento no es CVD SS (CVD SS del IMSS no suele tener la matrícula universitaria)
        if doc_type_code != "cvd_ss":
            if student.matricula and student.matricula in text:
                found_matricula = True
            else:
                # Intento con fuzzy o variaciones simples
                if student.matricula and student.matricula in norm_text.replace(" ", ""):
                    found_matricula = True
            
            if not found_matricula:
                result["observations"].append(f"No se detectó claramente la matrícula ({student.matricula}).")
        else:
            # Para CVD SS asumimos que la matrícula no importa, sino la mención "con derecho"
            found_matricula = True # Dummy
            if "con derecho al servicio" in norm_text or "con derecho" in norm_text:
                pass
            else:
                result["observations"].append("No se detectó la frase de 'derecho al servicio médico'.")

        # Buscar nombre del estudiante
        if student.full_name:
            name_parts = normalize_text(student.full_name).split()
            total_name_parts = len(name_parts)
            for part in name_parts:
                if len(part) > 2 and part in norm_text:
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
            if "con derecho al servicio" not in norm_text and "con derecho" not in norm_text:
                score -= 30.0

        result["confidence_score"] = max(0.0, score)
        
        if result["confidence_score"] >= 80:
            if not result["observations"]:
                result["observations"].append("Validación automática exitosa. Documento parece correcto.")
        else:
            result["observations"].append("El nivel de confianza es bajo. Por favor, revise manualmente.")
            
    except Exception as e:
        result["observations"].append(f"Error al analizar el documento: {str(e)}")
        result["confidence_score"] = 0.0

    return result
