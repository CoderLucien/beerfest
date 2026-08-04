export interface MessageRequest {
  visitorId: string;
  title: string;
  body: string;
  type: "promotion" | "notification" | "alert";
}

export interface MessageResult {
  success: boolean;
  messageId: string;
  sentAt: number;
}

let messageCounter = 0;

export function simulateSendMessage(request: MessageRequest): MessageResult {
  messageCounter++;
  return {
    success: true,
    messageId: `msg_${Date.now()}_${messageCounter}`,
    sentAt: Date.now(),
  };
}

export function simulateBroadcast(
  visitorIds: string[],
  title: string,
  body: string
): MessageResult[] {
  return visitorIds.map((vid) =>
    simulateSendMessage({ visitorId: vid, title, body, type: "promotion" })
  );
}
