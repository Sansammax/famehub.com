#!/bin/bash
# FameHub Health and Telemetry Verification Script

echo "=== FameHub LMS Verification Script ==="

HOST="http://localhost:5000"
HEALTH_URL="$HOST/health"
METRICS_URL="$HOST/metrics"
DOCS_URL="$HOST/api/docs"

# 1. Health Probe
echo "Probing Health Check endpoint at $HEALTH_URL..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")

if [ "$HEALTH_RESPONSE" -eq 200 ]; then
  echo "[PASS] Health Check is ONLINE."
  curl -s "$HEALTH_URL"
  echo ""
else
  echo "[FAIL] Health Check returned status code: $HEALTH_RESPONSE"
fi

# 2. Metrics Probe
echo "Probing Prometheus metrics at $METRICS_URL..."
METRICS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$METRICS_URL")

if [ "$METRICS_RESPONSE" -eq 200 ]; then
  echo "[PASS] Prometheus metrics are available."
  METRICS_COUNT=$(curl -s "$METRICS_URL" | wc -l)
  echo "Metrics expose count: $METRICS_COUNT lines of text."
else
  echo "[FAIL] Metrics returned status code: $METRICS_RESPONSE"
fi

# 3. Docs Probe
echo "Probing Swagger Documentation at $DOCS_URL..."
DOCS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$DOCS_URL")

if [ "$DOCS_RESPONSE" -eq 200 ] || [ "$DOCS_RESPONSE" -eq 301 ] || [ "$DOCS_RESPONSE" -eq 302 ]; then
  echo "[PASS] Swagger API Docs is accessible."
else
  echo "[FAIL] Swagger returned status code: $DOCS_RESPONSE"
fi

echo "=== Verification Finished ==="
