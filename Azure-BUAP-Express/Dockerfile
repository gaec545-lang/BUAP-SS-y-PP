FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (for PDF and Tesseract)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libmupdf-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create necessary folders
RUN mkdir -p uploads generated_pdfs

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
