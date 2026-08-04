import type { OrderStatus } from "../types/order";

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["paid", "cancelled"],
  paid: ["verified", "refunded"],
  verified: ["completed"],
  completed: [],
  cancelled: [],
  refunded: [],
};

export function canTransitionOrder(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isValidOrderStatus(status: string): status is OrderStatus {
  return Object.keys(ORDER_TRANSITIONS).includes(status);
}

export function isFinalized(status: OrderStatus): boolean {
  return ["completed", "cancelled", "refunded"].includes(status);
}

export function isRefundable(status: OrderStatus): boolean {
  return status === "paid" || status === "verified";
}
