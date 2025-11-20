import { processInboundMessage } from "./inbound";

/**
 * Demo mode utilities for simulating message delivery and responses
 */

type MockResponseParams = {
  companyId: string;
  from: string;
  channel: "whatsapp" | "sms" | "email";
  externalId: string;
};

/**
 * Schedule a mock "YES" response from a patient after a delay
 * This simulates a patient accepting the slot invitation
 */
export function scheduleMockResponse(params: MockResponseParams, delayMs = 10000) {
  console.log(
    `[Demo Mode] Scheduling mock response from ${params.from} in ${delayMs / 1000}s`
  );

  // Use setTimeout to simulate async response
  setTimeout(async () => {
    try {
      console.log(`[Demo Mode] Sending mock "YES" response from ${params.from}`);
      
      await processInboundMessage({
        body: "YES",
        from: params.from,
        channel: params.channel,
        externalId: `demo-response-${params.externalId}`,
        metadata: {
          demo_mode: true,
          simulated_response: true,
          original_message_id: params.externalId,
        },
      });

      console.log(`[Demo Mode] Mock response processed successfully`);
    } catch (error) {
      console.error("[Demo Mode] Error processing mock response:", error);
    }
  }, delayMs);
}

/**
 * Generate a mock external message ID for demo mode
 */
export function generateMockExternalId(): string {
  return `demo-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Create a mock provider response for demo mode
 */
export function createMockProviderResponse(externalId: string) {
  return {
    externalId,
    response: {
      simulated: true,
      demo_mode: true,
      sid: externalId,
      status: "sent",
      timestamp: new Date().toISOString(),
    },
  };
}
