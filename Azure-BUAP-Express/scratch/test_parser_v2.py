import re

def clean_extracted_value(val, headers_to_strip):
    if not val: return None
    v = val.strip()
    
    # Aggressive: If there's a colon, take what's after it
    if ":" in v:
        parts = v.split(":", 1)
        if len(parts[0]) < 30:
            v = parts[1].strip()
    
    for h in headers_to_strip:
        v = re.sub(rf"^{h}[:\s]*", "", v, flags=re.IGNORECASE).strip()
    
    v = re.sub(r"^(Responsalbe|Responsable|Nombre|Cargo)[:\s]*", "", v, flags=re.IGNORECASE).strip()
    
    if len(v) < 3: return None
    for h in headers_to_strip:
        if v.lower() == h.lower(): return None
        
    return v

# Test cases
name_headers = ["Responsable", "Nombre del responsable", "Atentamente", "Atn", "Dirigido a", "Nombre"]

print(f"Test 1: 'Responsalbe: Juan Perez' -> '{clean_extracted_value('Responsalbe: Juan Perez', name_headers)}'")
print(f"Test 2: 'Responsable:Nombre del responsable:Juan Perez' -> '{clean_extracted_value('Responsable:Nombre del responsable:Juan Perez', name_headers)}'")
print(f"Test 3: 'Nombre: Dr. Juan Perez' -> '{clean_extracted_value('Nombre: Dr. Juan Perez', name_headers)}'")
