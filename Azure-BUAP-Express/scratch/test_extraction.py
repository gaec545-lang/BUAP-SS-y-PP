import re

# Mocking the logic for testing
text = """--- PAGE 1 ---
3 , 2026
práctica profesional
No. de programa:
239320
Fecha de registro:
04/05/26
Empresa que oferta:
ASESORÍA Y DISTRIBUIDORA VETERINARIA PARA MASCOTAS
S.A. DE C.V.
Sector al que pertenece:
PRIVADO
Periodo del programa:
3 , 2026
Revalidado:
233749
Estatus:
ACEPTADO
Datos generales
Nombre del Programa:
IMPACTO DE LA ADMINISTRACIÓN Y CONTABILIDAD EN LA
CLINICA VETERINARIA
Tipo de programa:
INTERDISCIPLINARIO
Área o departamento donde el alumno realizará práctica profesional
HOSPITAL VETERINARIO GOSGATS CALLE 15 SUR NÚMERO 110
B, SAN PEDRO CHOLULA
Fecha de inicio:
01/08/26
Fecha de término:
01/02/27
Duración en meses:
6 Meses
Responsable de los alumnos en la empresa/dependencia
Nombre del responsable de supervisar el cumplimiento
de los objetivos y actividades de los alumnos en la dependencia:
MARIA DEL ROSER BERTRAN SANCHEZ
Puesto o cargo del responsable:
DIRECTORA ADMINISTRATIVA
Correo electrónico:
contactogosgatsvet@gmail.com
Teléfono:
2222377314
Dirección donde se presenta el alumno a entrevista:
CALLE 15 SUR , NUMERO 110 B, SAN CRISTOBAL TEPOMNTLA,
C.P 72765, SAN PEDRO CHOLULA
Dirección donde el alumno estará físicamente:
CALLE 15 SUR , NUMERO 110 B, SAN CRISTOBAL TEPOMNTLA,
C.P 72765, SAN PEDRO CHOLULA
Información para generar nombramiento
Nombre de la persona a quién se dirigirá el nombramiento de práctica profesional :
MARIA DEL ROSER BERTRAN SANCHEZ
Cargo:
DIRECTORA ADMINISTRATIVA"""

def test_extraction(text):
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    folio = None
    folio_patterns = [r"No\.\s*de\s*programa[:\s]*(\d{5,10})"]
    for p in folio_patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m: folio = m.group(1); break
    
    if not folio:
        # Check next line after "No. de programa:"
        for i, line in enumerate(lines):
            if "No. de programa" in line and i+1 < len(lines):
                folio = lines[i+1]
                break

    name_headers = [
        "Nombre del responsable de supervisar el cumplimiento de los objetivos y actividades de los alumnos en la dependencia",
        "Nombre de la persona a quién se dirigirá el nombramiento de práctica profesional",
    ]
    pos_headers = ["Puesto o cargo del responsable", "Cargo"]

    responsible_name = None
    for i, line in enumerate(lines):
        for h in name_headers:
            # Check if header is in line OR header spans multiple lines
            # In the dump, L37-38: "Nombre del responsable... \n de los objetivos..."
            # So we might need to look for a partial match or check if the next line is part of the header
            if h.lower() in (line.lower() + " " + (lines[i+1].lower() if i+1 < len(lines) else "")).lower():
                # If the line (or next line) ends with the header part + colon
                full_header_in_text = line + " " + lines[i+1]
                if ":" in lines[i+1] or ":" in lines[i+2]:
                    # The name is usually 1 or 2 lines after the start of header
                    # In our dump, name is at L39, which is i+2 (L37, L38, L39)
                    if "dependencia:" in lines[i+1]:
                        responsible_name = lines[i+2]
                        break
        if responsible_name: break

    # Strategy 2: Nombramiento part (L53-54)
    if not responsible_name:
        for i, line in enumerate(lines):
            if "nombramiento de práctica profesional" in line.lower() and i+1 < len(lines):
                responsible_name = lines[i+1]
                break

    responsible_position = None
    for i, line in enumerate(lines):
        if "Puesto o cargo del responsable:" in line or "Cargo:" in line:
            if i+1 < len(lines):
                responsible_position = lines[i+1]
                break

    print(f"Extracted Folio: {folio}")
    print(f"Extracted Name: {responsible_name}")
    print(f"Extracted Position: {responsible_position}")

test_extraction(text)
