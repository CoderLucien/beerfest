export interface Zone {
  zoneId: string;
  name: string;
  currentVisitors: number;
  baselineVisitors: number;
  avgWaitTime: number;
  status: "normal" | "busy" | "under_capacity";
}

export interface Merchant {
  merchantId: string;
  zoneId: string;
  name: string;
  category: MerchantCategory;
  operating: boolean;
}

export type MerchantCategory = "food" | "drink" | "cultural" | "combo";
