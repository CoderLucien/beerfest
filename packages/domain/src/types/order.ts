export type OrderStatus = "pending" | "paid" | "verified" | "completed" | "cancelled" | "refunded";

export interface Order {
  orderId: string;
  visitorId: string;
  campaignId: string;
  couponId: string;
  products: OrderProduct[];
  netPayment: number;
  discountAmount: number;
  status: OrderStatus;
  createdAt: number;
  verifiedAt?: number;
  completedAt?: number;
}

export interface OrderProduct {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CreateOrderInput {
  visitorId: string;
  couponId: string;
  products: { productId: string; quantity: number }[];
}
