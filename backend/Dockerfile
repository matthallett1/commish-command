# Backend Dockerfile for Railway deployment
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directory and set ownership
RUN mkdir -p /app/data

# Run as non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Railway sets PORT dynamically
ENV PORT=8000
EXPOSE ${PORT}

# Run the application - use shell form to expand $PORT
CMD uvicorn api.main:app --host 0.0.0.0 --port $PORT
