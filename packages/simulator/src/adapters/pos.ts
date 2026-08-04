export interface VerificationRequest {
  couponId: string;
  orderId: string;
  visitorId: string;
  merchantId: string;
}

export interface VerificationResult {
  verified: boolean;
  reason?: string;
  timestamp: number;
}

export function simulateVerify(request: VerificationRequest): VerificationResult {
  return {
    verified: true,
    timestamp: Date.now(),
  };
}

export function simulateReject(request: VerificationRequest, reason: string): VerificationResult {
  return {
    verified: false,
    reason,
    timestamp: Date.now(),
  };
}
