import openpyxl

def check_profiles(file_path):
    wb = openpyxl.load_workbook(file_path, data_only=True)
    sheet = wb.active
    profiles = set()
    for row in sheet.iter_rows(min_row=3, values_only=True):
        if row[5]:
            profiles.add(str(row[5]))
    return profiles

if __name__ == "__main__":
    profiles = check_profiles("xlsx.xlsx")
    print("Profiles found in Excel:")
    for p in sorted(profiles):
        print(f"'{p}'")
