export interface Product {
  productId: string;
  merchantId: string;
  name: string;
  category: ProductCategory;
  price: number;
  containsAlcohol: boolean;
  imageUrl?: string;
}

export type ProductCategory = "food" | "drink" | "cultural_goods" | "combo_bundle";

export interface Inventory {
  productId: string;
  merchantId: string;
  availableQuantity: number;
  reservedQuantity: number;
  thresholdLow: number;
  updatedAt: number;
}
