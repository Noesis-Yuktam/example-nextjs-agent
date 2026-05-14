import type { DemoScenario } from '@/types';

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    message: "I want to return order #12345",
    expectedIntent: "refund_request",
    description: "Customer requesting a refund for a specific order"
  },
  {
    message: "Where is my package? Order #67890",
    expectedIntent: "order_inquiry",
    description: "Customer tracking their order status"
  },
  {
    message: "The product arrived damaged and I'm very disappointed",
    expectedIntent: "complaint",
    description: "Customer filing a complaint about product quality"
  },
  {
    message: "What's your refund policy?",
    expectedIntent: "general_question",
    description: "Customer asking about store policies"
  },
  {
    message: "Can you check if Blue Widget is in stock?",
    expectedIntent: "inventory_check",
    description: "Customer checking product availability"
  },
  {
    message: "I need to cancel my order #11111 and get a refund",
    expectedIntent: "refund_request",
    description: "Customer wanting to cancel and refund"
  },
  {
    message: "When will my order be delivered?",
    expectedIntent: "order_inquiry",
    description: "Customer asking about delivery timeline"
  },
  {
    message: "This is terrible service, the wrong item was sent",
    expectedIntent: "complaint",
    description: "Upset customer with wrong order"
  },
  {
    message: "How do I track my shipping?",
    expectedIntent: "general_question",
    description: "Customer asking for help with tracking"
  },
  {
    message: "Is Red Gadget available for purchase?",
    expectedIntent: "inventory_check",
    description: "Customer checking specific item availability"
  },
  {
    message: "I want my money back for order #12345",
    expectedIntent: "refund_request",
    description: "Direct refund request"
  },
  {
    message: "The package hasn't arrived yet, where is it?",
    expectedIntent: "order_inquiry",
    description: "Customer with missing package"
  },
  {
    message: "I'm unhappy with the quality of the product",
    expectedIntent: "complaint",
    description: "Quality complaint"
  },
  {
    message: "Do you have Green Gizmo in stock?",
    expectedIntent: "inventory_check",
    description: "Checking out-of-stock item"
  },
  {
    message: "Can you help me with information about returns?",
    expectedIntent: "general_question",
    description: "General return inquiry"
  }
];

export function getRandomScenario(): DemoScenario {
  const index = Math.floor(Math.random() * DEMO_SCENARIOS.length);
  return DEMO_SCENARIOS[index];
}
