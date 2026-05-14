# Example Policies for Customer Support Agent

These Rego policies can be configured in Noesis to evaluate agent actions in real-time. Create them via the Config API or ask your Noesis administrator.

## 1. PII Protection

Flags responses that may contain sensitive personal information.

```rego
package pii_guard

# Flag responses containing potential SSN patterns
violations[msg] {
    response := input.response
    regex.match(`\d{3}-\d{2}-\d{4}`, response)
    msg := "Response may contain Social Security Number"
}

# Flag responses containing potential credit card numbers
violations[msg] {
    response := input.response
    regex.match(`\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}`, response)
    msg := "Response may contain credit card number"
}

# Flag responses containing email addresses (potential data leak)
violations[msg] {
    response := input.response
    contains(response, "@")
    regex.match(`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`, response)
    input.intent != "general_question"
    msg := "Response contains email address - verify this is appropriate"
}
```

## 2. Refund Authorization

Requires manager approval for high-value refunds.

```rego
package refund_guard

# Flag refund requests over $500
violations[msg] {
    input.intent == "refund_request"
    input.order_value > 500
    msg := sprintf("Refund of $%v requires manager approval", [input.order_value])
}

# Flag multiple items in refund
violations[msg] {
    input.intent == "refund_request"
    input.item_count > 3
    msg := sprintf("Refund with %d items requires review", [input.item_count])
}

# Block refunds on orders older than 90 days
violations[msg] {
    input.intent == "refund_request"
    input.order_age_days > 90
    msg := "Order is outside 90-day refund window - escalate to supervisor"
}
```

## 3. Complaint Escalation

Automatically flags severe complaints for human review.

```rego
package complaint_escalation

# Escalate complaints with high-severity keywords
severe_keywords := ["lawsuit", "lawyer", "attorney", "fraud", "scam", "sue", "legal action", "bbb", "better business bureau", "federal trade commission", "ftc"]

violations[msg] {
    input.intent == "complaint"
    message := lower(input.user_message)
    keyword := severe_keywords[_]
    contains(message, keyword)
    msg := sprintf("Complaint contains severe keyword '%s' - escalate to supervisor", [keyword])
}

# Flag repeated complaints from same customer
violations[msg] {
    input.intent == "complaint"
    input.customer_complaint_count > 2
    msg := "Customer has multiple recent complaints - review account"
}
```

## 4. Low Confidence Guard

Flags actions taken with low confidence intent classification.

```rego
package confidence_guard

# Flag low-confidence classifications for review
violations[msg] {
    input.confidence < 0.6
    msg := sprintf("Intent classification confidence %.0f%% is below threshold - recommend human verification", [input.confidence * 100])
}

# Require high confidence for refund actions
violations[msg] {
    input.intent == "refund_request"
    input.confidence < 0.8
    msg := sprintf("Refund action requires >80%% confidence, got %.0f%%", [input.confidence * 100])
}
```

## 5. Tool Authorization

Controls which tools can be used based on context.

```rego
package tool_guard

# Prevent process_refund without order lookup first
violations[msg] {
    input.tool == "process_refund"
    not input.order_verified
    msg := "Cannot process refund without verifying order first"
}

# Flag inventory checks for items not in catalog
violations[msg] {
    input.tool == "check_inventory"
    input.result.found == false
    msg := "Item not found in catalog - may need manual lookup"
}

# Log all complaint tickets for audit
violations[msg] {
    input.tool == "log_complaint"
    input.priority == "high"
    msg := "High-priority complaint logged - supervisor notification recommended"
}
```

## 6. Response Quality

Ensures agent responses meet quality standards.

```rego
package response_quality

# Flag very short responses
violations[msg] {
    response := input.response
    count(response) < 50
    msg := "Response is too short - may not adequately address customer"
}

# Flag generic/templated responses
generic_phrases := ["I don't know", "I can't help", "please hold", "one moment"]

violations[msg] {
    response := lower(input.response)
    phrase := generic_phrases[_]
    contains(response, phrase)
    msg := sprintf("Response contains generic phrase '%s' - consider personalizing", [phrase])
}

# Ensure responses include next steps for complaints
violations[msg] {
    input.intent == "complaint"
    response := lower(input.response)
    not contains(response, "ticket")
    not contains(response, "will")
    not contains(response, "follow up")
    msg := "Complaint response should include next steps or ticket reference"
}
```

## 7. Prohibited Content

Blocks inappropriate content in responses.

```rego
package content_filter

# Block profanity (simplified example)
prohibited_words := ["damn", "hell", "crap"]

violations[msg] {
    response := lower(input.response)
    word := prohibited_words[_]
    contains(response, word)
    msg := "Response contains prohibited word"
}

# Prevent competitor mentions
competitors := ["competitor-a", "competitor-b", "other-store"]

violations[msg] {
    response := lower(input.response)
    competitor := competitors[_]
    contains(response, competitor)
    msg := sprintf("Response mentions competitor '%s'", [competitor])
}

# Block price guarantees or promises
violations[msg] {
    response := lower(input.response)
    contains(response, "guarantee")
    contains(response, "price")
    msg := "Cannot guarantee prices - remove price guarantee language"
}
```

## 8. Rate & Cost Controls

Prevents abuse and controls costs.

```rego
package rate_control

# Flag high token usage
violations[msg] {
    input.tokens_total > 2000
    msg := sprintf("Request used %d tokens - exceeds budget", [input.tokens_total])
}

# Flag frequent refund requests
violations[msg] {
    input.intent == "refund_request"
    input.customer_refunds_30d > 3
    msg := "Customer has exceeded refund limit (3 per 30 days)"
}

# Alert on unusual order values
violations[msg] {
    input.order_value > 10000
    msg := sprintf("High-value order ($%v) - verify legitimacy", [input.order_value])
}
```

## Usage

To add these policies to your Noesis instance, use the Config API:

```bash
# Example: Add PII guard policy
curl -X POST "$NOESIS_URL/api/v1/config/policies" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "pii_guard",
    "description": "Flags responses containing potential PII",
    "version": "1.0",
    "rego_content": "package pii_guard\n\nviolations[msg] {\n    response := input.response\n    regex.match(`\\d{3}-\\d{2}-\\d{4}`, response)\n    msg := \"Response may contain Social Security Number\"\n}",
    "is_active": true
  }'
```

## Triggering Evaluation

When ingesting events, include the fields your policies check:

```typescript
await client.ingest({
  source: 'customer-support-agent',
  event_type: 'agent_response',
  evaluate: true,  // Enable policy evaluation
  payload: {
    intent: 'refund_request',
    confidence: 0.92,
    user_message: message,
    response: agentResponse,
    order_value: 150,
    // Include any fields your policies need
  }
});
```

The response will include evaluation results:

```json
{
  "event_id": "evt_123",
  "status": "evaluated",
  "evaluation_result": {
    "allow": true,
    "violations": []
  }
}
```
