import os
import zipfile

def build_zip():
    zip_filename = "deploy.zip"
    
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk("."):
            # Exclude banned directories
            dirs[:] = [d for d in dirs if d not in {"venv", "env", "antenv", ".venv", "__pycache__", ".git", "scratch", "generated_pdfs", "uploads", "data"}]
            
            for file in files:
                # ONLY include .py files and requirements.txt
                if not file.endswith(".py") and file != "requirements.txt" and file != "Dockerfile":
                    continue
                
                # Exclude specific banned files
                if file in {".env", "build_zip.py"}:
                    continue
                
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, start=".")
                zipf.write(file_path, arcname)

if __name__ == "__main__":
    build_zip()
    print(f"Zip size: {os.path.getsize('deploy.zip') / 1024:.2f} KB")
