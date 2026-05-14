import { NextRequest, NextResponse } from 'next/server';
import { getNoesisClient } from '@/lib/noesis';
import { classifyIntent, determineToolCalls, executeTools, generateResponse } from '@/lib/agent';
import type { SupportRequest, AgentResponse } from '@/types';

export async function POST(request: NextRequest) {
  const noesis = getNoesisClient();
  const body = (await request.json()) as SupportRequest;
  const { message, sessionId } = body;

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const traceId = sessionId || `trace-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // Step 1: Ingest user message event
  if (noesis) {
    await noesis.ingest({
      source: 'customer-support-agent',
      event_type: 'user_message',
      trace_id: traceId,
      payload: {
        message,
        timestamp: new Date().toISOString(),
      },
    }).catch(err => console.error('Failed to ingest user_message:', err));
  }

  // Step 2: Classify intent
  const intent = classifyIntent(message);

  if (noesis) {
    // Enable policy evaluation to check confidence thresholds
    await noesis.ingest({
      source: 'customer-support-agent',
      event_type: 'intent_classification',
      trace_id: traceId,
      evaluate: true,
      payload: {
        user_message: message,
        detected_intent: intent.intent,
        intent: intent.intent,
        confidence: intent.confidence,
      },
      metadata: { model: 'rule-based-classifier' },
    }).catch(err => console.error('Failed to ingest intent_classification:', err));
  }

  // Step 3: Determine and execute tool calls
  const toolCalls = determineToolCalls(intent.intent, message);

  for (const call of toolCalls) {
    if (noesis) {
      // Enable policy evaluation for tool authorization
      await noesis.ingest({
        source: 'customer-support-agent',
        event_type: 'tool_call',
        trace_id: traceId,
        evaluate: true,
        payload: {
          tool: call.tool,
          input: call.input,
          intent: intent.intent,
        },
      }).catch(err => console.error('Failed to ingest tool_call:', err));
    }
  }

  const toolResults = executeTools(toolCalls);

  for (const result of toolResults) {
    if (noesis) {
      await noesis.ingest({
        source: 'customer-support-agent',
        event_type: 'tool_result',
        trace_id: traceId,
        payload: {
          tool: result.tool,
          output: result.output,
          success: result.success,
        },
      }).catch(err => console.error('Failed to ingest tool_result:', err));
    }
  }

  // Step 4: Generate response
  const responseMessage = generateResponse(intent, toolResults);

  if (noesis) {
    // Enable policy evaluation on agent_response to check for PII, quality, etc.
    await noesis.ingest({
      source: 'customer-support-agent',
      event_type: 'agent_response',
      trace_id: traceId,
      evaluate: true,
      payload: {
        response: responseMessage,
        user_message: message,
        intent: intent.intent,
        confidence: intent.confidence,
        tools_used: toolCalls.map(t => t.tool),
      },
    }).catch(err => console.error('Failed to ingest agent_response:', err));
  }

  const response: AgentResponse = {
    traceId,
    message: responseMessage,
    intent,
    toolCalls,
    toolResults,
  };

  return NextResponse.json(response);
}
