"""
Diagnóstico del Excel de BUAP.
Ejecutar con: python diagnostico_excel.py
"""
import pandas as pd
import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

EXCEL_FILE = "xlsx (1).xlsx"

print("=" * 60)
print("DIAGNÓSTICO DEL EXCEL DE BUAP")
print("=" * 60)

# 1. Leer el archivo
df = pd.read_excel(EXCEL_FILE, skiprows=2, header=None)
df.columns = ['evaluador','estado','folio','programa','tipo','perfil','max_slots','dependencia','sector','inscritos','cupo_text']

print(f"\nTotal filas brutas leidas: {len(df)}")

# 2. Sanitizar folios
df['folio'] = df['folio'].fillna('').astype(str).str.strip().str.replace(r'\.0$', '', regex=True)
df = df[~df['folio'].isin(['', 'None', 'nan', 'NaN', 'null'])]

print(f"Total filas validas (con folio): {len(df)}")
print(f"Folios unicos: {df['folio'].nunique()}")

# 3. Extraer código de carrera del perfil
def extract_code(profile):
    if not profile or str(profile) == 'nan':
        return None
    p = str(profile).replace('\xa0', ' ').strip()
    # Strategy 1: parentheses or brackets
    m = re.search(r'[\(\[]\s*([A-Z0-9]+)\s*[\)\]]', p)
    if m:
        return m.group(1)
    return None

df['career_code'] = df['perfil'].apply(extract_code)

print("\n--- CÓDIGOS DE CARRERA ENCONTRADOS EN EL EXCEL ---")
cc = df['career_code'].value_counts(dropna=False)
print(cc.to_string())

print(f"\nFilas sin código de carrera (None): {df['career_code'].isna().sum()}")

# 4. Chequear programas únicos por (folio, carrera)
df_clean = df.dropna(subset=['career_code'])
unique_programs = df_clean.groupby(['folio', 'career_code']).size().reset_index(name='count')
print(f"\nProgramas únicos (folio + carrera): {len(unique_programs)}")
print(f"\nPrimeros 20 programas únicos:")
print(unique_programs.head(20).to_string())

# 5. Tipos de programa
print("\n--- TIPOS DE PROGRAMA EN EL EXCEL ---")
print(df['tipo'].value_counts(dropna=False).to_string())

# 6. Mostrar ejemplos de perfiles sin código
sin_codigo = df[df['career_code'].isna()]['perfil'].unique()[:10]
print(f"\n--- EJEMPLOS DE PERFILES SIN CÓDIGO ({len(sin_codigo)}) ---")
for p in sin_codigo:
    print(f"  '{p}'")

print("\n" + "=" * 60)
print("FIN DEL DIAGNÓSTICO")
print("=" * 60)
