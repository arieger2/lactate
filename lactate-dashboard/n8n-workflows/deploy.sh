#!/bin/bash
# Deploy the canonical workflow to n8n.
# ALWAYS edit lactate-analytics-router.json first, then run this script.
# Never do GET→modify→PUT manually — that overwrites other fixes.

WORKFLOW_ID="ljNATO9oj54uhfzmTM84Z"
API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0N2NiMjVlMS0xY2M5LTQ4ODItYjAxMy0xZWJjNzBmMjg1MjIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNzEwNDU3MGYtYWZmYi00ZGE4LWE5ZGEtNmU5ZjkxOTAxMjYzIiwiaWF0IjoxNzc1MTUwNDc5fQ.uLPAfWasI5AWQhltezTZ8AzSRDLzWJ5Usv1wDilCNjs"
BASE_URL="https://n8n.arieger.net/api/v1"
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Deploying lactate-analytics-router.json..."
RESULT=$(curl -s -X PUT "$BASE_URL/workflows/$WORKFLOW_ID" \
  -H "X-N8N-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -d @"$DIR/lactate-analytics-router.json")

ID=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id','ERROR: '+str(d)))" 2>/dev/null)
if [[ "$ID" == "$WORKFLOW_ID" ]]; then
  echo "Deploy OK — activating..."
  curl -s -X POST "$BASE_URL/workflows/$WORKFLOW_ID/activate" \
    -H "X-N8N-API-KEY: $API_KEY" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Active:', d.get('active'))"
else
  echo "Deploy FAILED: $RESULT"
  exit 1
fi
