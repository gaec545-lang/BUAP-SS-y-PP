import re

def clean_extracted_value(val, headers_to_strip):
    if not val: return None
    v = val.strip()
    for h in headers_to_strip:
        # BUG WAS HERE: used 'header' instead of 'h'
        v = re.sub(f"^{h}[:\s]*", "", v, flags=re.IGNORECASE).strip()
    
    if len(v) < 3: return None
    
    for h in headers_to_strip:
        if v.lower() == h.lower(): return None
        
    return v

# Test cases
name_headers = ["Responsable", "Nombre del responsable", "Atentamente", "Atn", "Dirigido a", "Nombre"]

test_val_1 = "Responsable: Juan Perez"
test_val_2 = "Nombre del responsable: Juan Perez"
test_val_3 = "Responsable: Nombre del responsable Juan Perez"

print(f"Test 1: '{test_val_1}' -> '{clean_extracted_value(test_val_1, name_headers)}'")
print(f"Test 2: '{test_val_2}' -> '{clean_extracted_value(test_val_2, name_headers)}'")
print(f"Test 3: '{test_val_3}' -> '{clean_extracted_value(test_val_3, name_headers)}'")
