import type { Intent, IntentClassification, ToolCall, ToolResult } from '@/types';

const INTENT_KEYWORDS: Record<Intent, string[]> = {
  refund_request: ['refund', 'return', 'money back', 'cancel order', 'exchange'],
  order_inquiry: ['where', 'track', 'status', 'shipping', 'delivery', 'package', 'order'],
  complaint: ['unhappy', 'disappointed', 'damaged', 'broken', 'wrong', 'terrible', 'awful', 'bad'],
  general_question: ['policy', 'how do', 'what is', 'can you', 'help', 'information'],
  inventory_check: ['stock', 'available', 'inventory', 'in stock', 'check if'],
};

const MOCK_ORDERS: Record<string, { status: string; eta: string; items: string[] }> = {
  '12345': { status: 'shipped', eta: '2 days', items: ['Blue Widget', 'Red Gadget'] },
  '67890': { status: 'processing', eta: '5 days', items: ['Green Gizmo'] },
  '11111': { status: 'delivered', eta: 'Delivered', items: ['Yellow Thing'] },
};

const MOCK_INVENTORY: Record<string, { available: boolean; quantity: number }> = {
  'blue widget': { available: true, quantity: 50 },
  'red gadget': { available: true, quantity: 12 },
  'green gizmo': { available: false, quantity: 0 },
  'yellow thing': { available: true, quantity: 3 },
};

export function classifyIntent(message: string): IntentClassification {
  const lowerMessage = message.toLowerCase();
  let bestIntent: Intent = 'general_question';
  let bestScore = 0;

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    const matches = keywords.filter(kw => lowerMessage.includes(kw)).length;
    if (matches > bestScore) {
      bestScore = matches;
      bestIntent = intent as Intent;
    }
  }

  const confidence = bestScore > 0 ? Math.min(0.5 + bestScore * 0.15, 0.98) : 0.4;

  return {
    intent: bestIntent,
    confidence: Math.round(confidence * 100) / 100,
  };
}

export function determineToolCalls(intent: Intent, message: string): ToolCall[] {
  const tools: ToolCall[] = [];
  const lowerMessage = message.toLowerCase();

  switch (intent) {
    case 'refund_request':
    case 'order_inquiry': {
      const orderMatch = message.match(/#?(\d{5})/);
      if (orderMatch) {
        tools.push({
          tool: 'lookup_order',
          input: { orderId: orderMatch[1] },
        });
      }
      if (intent === 'refund_request') {
        tools.push({
          tool: 'check_refund_eligibility',
          input: { orderId: orderMatch?.[1] || 'unknown' },
        });
      }
      break;
    }
    case 'inventory_check': {
      const itemMatch = lowerMessage.match(/(?:check|stock|available).*?(?:for\s+)?([a-z\s]+?)(?:\?|$)/);
      tools.push({
        tool: 'check_inventory',
        input: { item: itemMatch?.[1]?.trim() || 'unknown item' },
      });
      break;
    }
    case 'complaint': {
      tools.push({
        tool: 'log_complaint',
        input: { message, priority: 'high' },
      });
      const orderMatch = message.match(/#?(\d{5})/);
      if (orderMatch) {
        tools.push({
          tool: 'lookup_order',
          input: { orderId: orderMatch[1] },
        });
      }
      break;
    }
    case 'general_question':
    default:
      tools.push({
        tool: 'search_knowledge_base',
        input: { query: message },
      });
      break;
  }

  return tools;
}

export function executeTools(toolCalls: ToolCall[]): ToolResult[] {
  return toolCalls.map(call => {
    switch (call.tool) {
      case 'lookup_order': {
        const orderId = call.input.orderId as string;
        const order = MOCK_ORDERS[orderId];
        if (order) {
          return {
            tool: call.tool,
            output: { found: true, ...order },
            success: true,
          };
        }
        return {
          tool: call.tool,
          output: { found: false, message: 'Order not found' },
          success: true,
        };
      }
      case 'check_inventory': {
        const item = (call.input.item as string).toLowerCase();
        const inventory = MOCK_INVENTORY[item];
        if (inventory) {
          return {
            tool: call.tool,
            output: { item, ...inventory },
            success: true,
          };
        }
        return {
          tool: call.tool,
          output: { item, available: false, message: 'Item not found in catalog' },
          success: true,
        };
      }
      case 'check_refund_eligibility':
        return {
          tool: call.tool,
          output: { eligible: true, reason: 'Within 30-day return window' },
          success: true,
        };
      case 'log_complaint':
        return {
          tool: call.tool,
          output: { ticketId: `TKT-${Date.now()}`, status: 'created' },
          success: true,
        };
      case 'search_knowledge_base':
        return {
          tool: call.tool,
          output: {
            results: [
              { title: 'Return Policy', summary: '30-day return policy for most items' },
              { title: 'Shipping Info', summary: 'Standard shipping takes 3-5 business days' },
            ],
          },
          success: true,
        };
      default:
        return {
          tool: call.tool,
          output: { error: 'Unknown tool' },
          success: false,
        };
    }
  });
}

export function generateResponse(
  intent: IntentClassification,
  toolResults: ToolResult[]
): string {
  const responses: Record<Intent, () => string> = {
    refund_request: () => {
      const orderResult = toolResults.find(r => r.tool === 'lookup_order');
      const eligibility = toolResults.find(r => r.tool === 'check_refund_eligibility');
      
      if (orderResult?.output.found && eligibility?.output.eligible) {
        return `I found your order with items: ${(orderResult.output.items as string[]).join(', ')}. Good news - you're eligible for a refund! ${eligibility.output.reason}. Would you like me to process the refund now?`;
      }
      if (!orderResult?.output.found) {
        return "I couldn't find that order number. Could you please double-check and provide the correct order ID?";
      }
      return "I can help you with your refund request. Let me look into this for you.";
    },
    order_inquiry: () => {
      const orderResult = toolResults.find(r => r.tool === 'lookup_order');
      if (orderResult?.output.found) {
        return `Your order is currently ${orderResult.output.status}. Estimated arrival: ${orderResult.output.eta}. Items: ${(orderResult.output.items as string[]).join(', ')}.`;
      }
      return "I couldn't find that order. Please verify your order number and try again.";
    },
    complaint: () => {
      const ticketResult = toolResults.find(r => r.tool === 'log_complaint');
      if (ticketResult?.output.ticketId) {
        return `I'm sorry to hear about your experience. I've created a support ticket (${ticketResult.output.ticketId}) and our team will reach out within 24 hours. Is there anything else I can help with immediately?`;
      }
      return "I'm sorry for the inconvenience. Let me escalate this to our support team.";
    },
    inventory_check: () => {
      const invResult = toolResults.find(r => r.tool === 'check_inventory');
      if (invResult?.output.available) {
        return `Yes, ${invResult.output.item} is in stock! We have ${invResult.output.quantity} units available.`;
      }
      return `Sorry, ${invResult?.output.item || 'that item'} is currently out of stock. Would you like to be notified when it's available?`;
    },
    general_question: () => {
      const kbResult = toolResults.find(r => r.tool === 'search_knowledge_base');
      if (kbResult?.output.results) {
        const results = kbResult.output.results as { title: string; summary: string }[];
        return `Here's what I found: ${results.map(r => `${r.title} - ${r.summary}`).join('. ')}. Does this help answer your question?`;
      }
      return "I'd be happy to help! Could you provide more details about what you're looking for?";
    },
  };

  return responses[intent.intent]();
}
