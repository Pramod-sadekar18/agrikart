FROM python:3.13-slim

WORKDIR /app

# Update Debian packages to latest security patches
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir --upgrade "pip>=25.1.1" "setuptools>=78.1.1" "urllib3>=2.8.0" "msgpack>=1.2.1" && \
    pip install --no-cache-dir -r requirements.txt

COPY backend/ ./

EXPOSE 5000

CMD ["python", "app.py"]