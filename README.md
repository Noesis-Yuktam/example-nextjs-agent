# Example Next.js Agent with Noesis SDK

A simple customer support agent simulation demonstrating [Noesis SDK](https://noesis.dev) integration for event ingestion.

## Features

- **Customer Support Agent Simulation**: Simulates an AI agent that handles customer inquiries
- **Intent Classification**: Detects intents like refund requests, order inquiries, complaints, and inventory checks
- **Tool Execution**: Simulates agent tools (lookup_order, check_inventory, process_refund, etc.)
- **Noesis Integration**: Ingests events at each step for full observability
- **Auto-Simulation Mode**: Continuously generates simulated customer interactions for demo purposes

## Prerequisites

Before running this demo, you need credentials from your Noesis administrator:

| Credential | Description |
|------------|-------------|
| **NOESIS_BASE_URL** | Your Noesis backend API endpoint |
| **NOESIS_API_KEY** | API key for your registered agent |
| **GitHub Token** | Personal access token with `read:packages` scope (for SDK installation) |

Contact your Noesis administrator to provision an agent and receive these credentials.

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Noesis-Yuktam/example-nextjs-agent.git
cd example-nextjs-agent
```

### 2. Configure npm for GitHub Packages

Create or edit `~/.npmrc` (or `.npmrc` in your project root):

```
@noesis-yuktam:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

Replace `YOUR_GITHUB_TOKEN` with your personal access token (needs `read:packages` scope).

### 3. Install Dependencies

This project uses **Noesis SDK v0.2.0**.

```bash
npm install
```

### 4. Set Environment Variables

Copy the example env file:

```bash
cp .env.example .env
```

Edit `.env` with credentials from your Noesis administrator:

```bash
NOESIS_BASE_URL=https://your-instance.backend.noesis-yuktam.com
NOESIS_API_KEY=noesis_xxxxxxxxxxxxxxxx
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the demo.

## Usage

### Manual Mode

Type a customer message in the input field and click "Send". The agent will:

1. Classify the intent of your message
2. Execute relevant tools (order lookup, inventory check, etc.)
3. Generate an appropriate response
4. Ingest events to Noesis at each step

### Auto-Simulation Mode

1. Toggle "Auto-Simulation" to enable
2. Set the interval (1-60 seconds)
3. Watch as random customer scenarios are automatically processed
4. Monitor the event counter to see events flowing to Noesis

### Example Messages

- "I want to return order #12345" (refund request)
- "Where is my package? Order #67890" (order inquiry)
- "The product arrived damaged" (complaint)
- "Is Blue Widget in stock?" (inventory check)
- "What's your refund policy?" (general question)

## Noesis SDK Integration

This demo uses the Noesis SDK to ingest events at each step of the agent pipeline:

```typescript
import { NoesisClient } from '@noesis-yuktam/sdk';

const client = new NoesisClient({
  baseUrl: process.env.NOESIS_BASE_URL,
  apiKey: process.env.NOESIS_API_KEY,
});

// Ingest an event
await client.ingest({
  source: 'customer-support-agent',
  event_type: 'intent_classification',
  trace_id: sessionId,
  payload: {
    user_message: message,
    detected_intent: 'refund_request',
    confidence: 0.92
  },
  metadata: { model: 'gpt-4' }
});
```

### Event Types

| Event Type | Description |
|------------|-------------|
| `user_message` | Initial customer message |
| `intent_classification` | Detected intent and confidence score |
| `tool_call` | Tool invocation with input parameters |
| `tool_result` | Tool execution result |
| `agent_response` | Final response sent to customer |

## Deploy to Railway (Optional)

### Prerequisites

- [Railway CLI](https://docs.railway.app/develop/cli) installed
- A Railway project created

### Deployment Steps

1. **Create a Railway project and link:**

```bash
railway init
# Or link to existing project:
railway link
```

2. **Add a service:**

```bash
railway add --service example-nextjs-agent
railway link --service example-nextjs-agent
```

3. **Set environment variables in Railway dashboard:**

- `NOESIS_BASE_URL` - Your Noesis backend API endpoint (from Noesis admin)
- `NOESIS_API_KEY` - Your agent's API key (from Noesis admin)
- `NPM_TOKEN` - GitHub token with `read:packages` scope

4. **Deploy:**

```bash
railway up
```

5. **Add a public domain:**

```bash
railway domain
```

## Project Structure

```
example-nextjs-agent/
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Main chat interface
│   │   ├── globals.css       # Styles
│   │   └── api/
│   │       └── support/
│   │           └── route.ts  # API endpoint with event ingestion
│   ├── lib/
│   │   ├── noesis.ts         # Noesis SDK client setup
│   │   ├── agent.ts          # Agent simulation logic
│   │   └── scenarios.ts      # Demo scenarios for auto-simulation
│   └── types/
│       └── index.ts          # TypeScript types
├── .env.example              # Environment variables template
├── .npmrc                    # npm config for GitHub Packages (uses env vars)
└── railway.json              # Railway deployment config
```

## Troubleshooting

### "Not found" error when installing SDK

Ensure your `.npmrc` is configured correctly with a valid GitHub token that has `read:packages` scope.

### Events not appearing in Noesis

1. Verify `NOESIS_BASE_URL` points to the backend API (includes `backend` in subdomain)
2. Verify `NOESIS_API_KEY` is valid and was provided by your Noesis administrator
3. Check the browser console or server logs for error messages

### Need admin access?

This demo requires only an API key - no admin access needed. Contact your Noesis administrator if you need:
- Additional agents registered
- Rate limits adjusted
- Custom policies configured

## Example Policies

See [docs/example-policies.md](./docs/example-policies.md) for Rego policy examples tailored to this customer support agent:

| Policy | Description |
|--------|-------------|
| **PII Guard** | Flags responses containing SSN, credit cards, or emails |
| **Refund Authorization** | Requires approval for high-value refunds |
| **Complaint Escalation** | Auto-escalates severe complaints |
| **Confidence Guard** | Flags low-confidence intent classifications |
| **Tool Authorization** | Controls tool usage based on context |
| **Response Quality** | Ensures responses meet quality standards |
| **Content Filter** | Blocks profanity and competitor mentions |
| **Rate Control** | Prevents abuse and controls costs |

## License

MIT
