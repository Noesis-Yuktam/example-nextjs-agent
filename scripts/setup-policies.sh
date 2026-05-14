#!/bin/bash
# Setup example policies on a Noesis instance
# Usage: ./scripts/setup-policies.sh

set -e

NOESIS_URL="${NOESIS_URL:-https://tvarly.backend.noesis-yuktam.com}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

if [[ -z "$ADMIN_EMAIL" || -z "$ADMIN_PASSWORD" ]]; then
  echo "Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret ./scripts/setup-policies.sh"
  echo ""
  echo "Environment variables:"
  echo "  NOESIS_URL      - Backend URL (default: https://tvarly.backend.noesis-yuktam.com)"
  echo "  ADMIN_EMAIL     - Admin user email"
  echo "  ADMIN_PASSWORD  - Admin user password"
  exit 1
fi

echo "=== Setting up example policies on $NOESIS_URL ==="
echo ""

# Authenticate
echo "Authenticating..."
TOKEN=$(curl -sS -X POST "$NOESIS_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASSWORD\"}" | jq -r '.token')

if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  echo "ERROR: Authentication failed. Check credentials."
  exit 1
fi
echo "Authenticated successfully."
echo ""

create_policy() {
  local name="$1"
  local description="$2"
  local rego="$3"
  
  echo "Creating policy: $name..."
  
  RESPONSE=$(curl -sS -X POST "$NOESIS_URL/api/v1/config/policies" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"$name\",
      \"description\": \"$description\",
      \"version\": \"1.0\",
      \"rego_content\": $(echo "$rego" | jq -Rs .),
      \"is_active\": true
    }")
  
  if echo "$RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
    echo "  ✓ Created: $(echo "$RESPONSE" | jq -r '.id')"
  else
    ERROR=$(echo "$RESPONSE" | jq -r '.error // .message // "Unknown error"')
    if [[ "$ERROR" == *"already exists"* ]]; then
      echo "  ⊘ Already exists (skipping)"
    else
      echo "  ✗ Failed: $ERROR"
    fi
  fi
}

# Policy 1: PII Guard
create_policy "pii_guard" "Flags responses containing potential PII (SSN, credit cards)" '
package pii_guard

violations[msg] {
    response := input.response
    regex.match(`\d{3}-\d{2}-\d{4}`, response)
    msg := "Response may contain Social Security Number"
}

violations[msg] {
    response := input.response
    regex.match(`\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}`, response)
    msg := "Response may contain credit card number"
}
'

# Policy 2: Confidence Guard
create_policy "confidence_guard" "Flags low-confidence intent classifications" '
package confidence_guard

violations[msg] {
    input.confidence < 0.6
    msg := sprintf("Intent classification confidence %.0f%% is below 60%% threshold", [input.confidence * 100])
}

violations[msg] {
    input.intent == "refund_request"
    input.confidence < 0.8
    msg := sprintf("Refund action requires >80%% confidence, got %.0f%%", [input.confidence * 100])
}
'

# Policy 3: Complaint Escalation
create_policy "complaint_escalation" "Escalates severe complaints for human review" '
package complaint_escalation

severe_keywords := ["lawsuit", "lawyer", "attorney", "fraud", "scam", "sue", "legal action"]

violations[msg] {
    input.intent == "complaint"
    message := lower(input.user_message)
    keyword := severe_keywords[_]
    contains(message, keyword)
    msg := sprintf("Complaint contains severe keyword - escalate to supervisor: %s", [keyword])
}
'

# Policy 4: Response Quality
create_policy "response_quality" "Ensures agent responses meet quality standards" '
package response_quality

violations[msg] {
    response := input.response
    count(response) < 50
    msg := "Response is too short - may not adequately address customer"
}

generic_phrases := ["i dont know", "i cant help", "please hold"]

violations[msg] {
    response := lower(input.response)
    phrase := generic_phrases[_]
    contains(response, phrase)
    msg := sprintf("Response contains generic phrase: %s", [phrase])
}
'

# Policy 5: Tool Authorization
create_policy "tool_guard" "Controls tool usage based on context" '
package tool_guard

violations[msg] {
    input.tool == "process_refund"
    not input.order_verified
    msg := "Cannot process refund without verifying order first"
}

violations[msg] {
    input.tool == "log_complaint"
    input.priority == "high"
    msg := "High-priority complaint logged - supervisor notification recommended"
}
'

# Policy 6: Content Filter
create_policy "content_filter" "Blocks inappropriate content in responses" '
package content_filter

prohibited_words := ["damn", "hell", "crap", "stupid"]

violations[msg] {
    response := lower(input.response)
    word := prohibited_words[_]
    contains(response, word)
    msg := "Response contains prohibited word"
}
'

echo ""
echo "=== Reloading policy engine ==="
RELOAD=$(curl -sS -X POST "$NOESIS_URL/api/v1/policy/reload" \
  -H "Authorization: Bearer $TOKEN")
echo "Loaded policies: $(echo "$RELOAD" | jq -r '.loaded_count // .policy_count // "unknown"')"

echo ""
echo "=== Policy status ==="
curl -sS "$NOESIS_URL/api/v1/policy/status" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "Done! Policies are now active."
