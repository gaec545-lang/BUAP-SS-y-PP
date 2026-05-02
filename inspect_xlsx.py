import openpyxl
import json

def inspect_xlsx(file_path):
    try:
        wb = openpyxl.load_workbook(file_path, data_only=True)
        sheet = wb.active
        
        headers = [cell.value for cell in sheet[1]]
        rows = []
        for row in sheet.iter_rows(min_row=2, max_row=6, values_only=True):
            rows.append(list(row))
            
        return {
            "headers": headers,
            "sample_rows": rows
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    result = inspect_xlsx("xlsx.xlsx")
    print(json.dumps(result, indent=2))
