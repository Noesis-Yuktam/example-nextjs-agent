export type Intent = 
  | 'refund_request'
  | 'order_inquiry'
  | 'complaint'
  | 'general_question'
  | 'inventory_check';

export interface IntentClassification {
  intent: Intent;
  confidence: number;
}

export interface ToolCall {
  tool: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  tool: string;
  output: Record<string, unknown>;
  success: boolean;
}

export interface AgentResponse {
  traceId: string;
  message: string;
  intent: IntentClassification;
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
}

export interface SupportRequest {
  message: string;
  sessionId?: string;
}

export interface DemoScenario {
  message: string;
  expectedIntent: Intent;
  description: string;
}
