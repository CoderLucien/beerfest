export interface PaymentRequest {
  orderId: string;
  amount: number;
  visitorId: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  orderId: string;
  amount: number;
  timestamp: number;
  message: string;
}

let transactionCounter = 0;

export function simulatePayment(request: PaymentRequest): PaymentResult {
  transactionCounter++;
  return {
    success: true,
    transactionId: `txn_${Date.now()}_${transactionCounter}`,
    orderId: request.orderId,
    amount: request.amount,
    timestamp: Date.now(),
    message: "Mock payment successful",
  };
}

export function simulateRefund(orderId: string, amount: number): PaymentResult {
  transactionCounter++;
  return {
    success: true,
    transactionId: `ref_${Date.now()}_${transactionCounter}`,
    orderId,
    amount,
    timestamp: Date.now(),
    message: "Mock refund successful",
  };
}
