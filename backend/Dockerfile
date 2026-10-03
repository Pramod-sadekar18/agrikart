FROM python:3.13-slim

WORKDIR /app

# Update Debian packages to latest security patches
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir --upgrade pip setuptools && \
    pip install --no-cache-dir -r requirements.txt

COPY backend/ ./

EXPOSE 5000

CMD ["python", "app.py"]