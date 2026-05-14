# Example Next.js Agent with Noesis SDK

A simple customer support agent simulation demonstrating [Noesis SDK](https://noesis.dev) integration for event ingestion.

## Features

- **Customer Support Agent Simulation**: Simulates an AI agent that handles customer inquiries
- **Intent Classification**: Detects intents like refund requests, order inquiries, complaints, and inventory checks
- **Tool Execution**: Simulates agent tools (lookup_order, check_inventory, process_refund, etc.)
- **Noesis Integration**: Ingests events at each step for full observability
- **Auto-Simulation Mode**: Continuously generates simulated customer interactions for demo purposes

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/tankhiwale-rohan/example-nextjs-agent.git
cd example-nextjs-agent
```

### 2. Configure npm for GitHub Packages

The Noesis SDK is distributed via GitHub Packages. You need a GitHub personal access token with `read:packages` scope.

Create or edit `~/.npmrc` (or `.npmrc` in your project root):

```
@noesis-yuktam:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

Replace `YOUR_GITHUB_TOKEN` with your personal access token.

### 3. Install Dependencies

```bash
npm install
```

### 4. Set Environment Variables

Copy the example env file and configure your Noesis credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```
NOESIS_BASE_URL=https://your-noesis-instance.com
NOESIS_API_KEY=your-api-key
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

## Deploy to Railway

### Prerequisites

- [Railway CLI](https://docs.railway.app/develop/cli) installed
- Access to the Railway project

### Deployment Steps

1. **Link to the Railway project:**

```bash
railway link 36361720-86b2-4c1b-9522-bcfc9ade697f
railway environment production-agents
```

2. **Set environment variables in Railway:**

Go to your Railway project dashboard and add:

- `NOESIS_BASE_URL` - Your Noesis API endpoint
- `NOESIS_API_KEY` - Your Noesis API key
- `NPM_TOKEN` - GitHub token with `read:packages` scope (for installing the SDK)

3. **Deploy:**

```bash
railway up
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
├── railway.json              # Railway deployment config
├── .env.example              # Environment variables template
└── .npmrc.example            # npm config for GitHub Packages
```

## License

MIT
