#!/bin/bash

set -e

IMAGE="pramodsadekar1718/agrikart:${BACKEND_TAG}"

echo "======================================"
echo "AgriKart Production Deployment"
echo "======================================"
echo "Image: $IMAGE"

echo "Pulling new backend image..."
sudo docker pull "$IMAGE"

echo "Saving current backend environment..."
sudo docker inspect agrikart-backend-1 \
  --format '{{range .Config.Env}}{{println .}}{{end}}' \
  > /tmp/agrikart-backend.env

echo "Stopping old backend..."
sudo docker stop agrikart-backend-1 || true

echo "Removing old backend..."
sudo docker rm agrikart-backend-1 || true

echo "Starting new backend..."
sudo docker run -d \
  --name agrikart-backend-1 \
  --restart unless-stopped \
  --network agrikart_default \
  --network-alias backend \
  --env-file /tmp/agrikart-backend.env \
  -v agrikart_product_uploads:/app/uploads \
  "$IMAGE"

rm -f /tmp/agrikart-backend.env

echo "Waiting for application..."
sleep 10

echo "Checking backend container..."

STATUS=$(sudo docker inspect \
  --format '{{.State.Status}}' \
  agrikart-backend-1)

if [ "$STATUS" != "running" ]; then
    echo "ERROR: Backend container is not running."
    sudo docker logs agrikart-backend-1
    exit 1
fi

echo "Checking application health..."

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:8081)

if [ "$HTTP_STATUS" != "200" ]; then
    echo "ERROR: Application health check failed."
    echo "HTTP Status: $HTTP_STATUS"
    sudo docker logs agrikart-backend-1
    exit 1
fi

echo "======================================"
echo "PRODUCTION DEPLOYMENT SUCCESSFUL"
echo "======================================"

echo "Running containers:"
sudo docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

echo "Backend image:"
sudo docker inspect agrikart-backend-1 \
  --format '{{.Config.Image}}'