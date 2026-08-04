import type { Product, Inventory, ProductCategory } from "@beerfest/domain";

export interface ProductSeed extends Product {
  initialStock: number;
}

export const PRODUCTS: ProductSeed[] = [
  { productId: "p_a_01", merchantId: "m_a_01", name: "原浆精酿 500ml", category: "drink", price: 48, containsAlcohol: true, initialStock: 200 },
  { productId: "p_a_02", merchantId: "m_a_01", name: "果味精酿 330ml", category: "drink", price: 38, containsAlcohol: true, initialStock: 150 },
  { productId: "p_a_03", merchantId: "m_a_02", name: "烤鱿鱼大串", category: "food", price: 25, containsAlcohol: false, initialStock: 300 },
  { productId: "p_a_04", merchantId: "m_a_02", name: "烤羊肉串 5 支", category: "food", price: 30, containsAlcohol: false, initialStock: 250 },
  { productId: "p_a_05", merchantId: "m_a_03", name: "海鲜拼盘", category: "food", price: 68, containsAlcohol: false, initialStock: 100 },
  { productId: "p_a_06", merchantId: "m_a_04", name: "鲜啤杯 500ml", category: "drink", price: 35, containsAlcohol: true, initialStock: 400 },
  { productId: "p_b_01", merchantId: "m_b_01", name: "德式黑啤", category: "drink", price: 55, containsAlcohol: true, initialStock: 80 },
  { productId: "p_b_02", merchantId: "m_b_01", name: "德式小麦啤", category: "drink", price: 45, containsAlcohol: true, initialStock: 100 },
  { productId: "p_b_03", merchantId: "m_b_02", name: "青岛主题冰箱贴", category: "cultural_goods", price: 25, containsAlcohol: false, initialStock: 200 },
  { productId: "p_b_04", merchantId: "m_b_02", name: "手工扎染丝巾", category: "cultural_goods", price: 88, containsAlcohol: false, initialStock: 80 },
  { productId: "p_b_05", merchantId: "m_b_02", name: "啤酒节纪念明信片套装", category: "cultural_goods", price: 15, containsAlcohol: false, initialStock: 300 },
  { productId: "p_b_06", merchantId: "m_b_03", name: "章鱼小丸子", category: "food", price: 20, containsAlcohol: false, initialStock: 200 },
  { productId: "p_b_07", merchantId: "m_b_03", name: "炸鸡块", category: "food", price: 28, containsAlcohol: false, initialStock: 150 },
  { productId: "p_b_08", merchantId: "m_b_04", name: "柠檬茶", category: "food", price: 18, containsAlcohol: false, initialStock: 300 },
  { productId: "p_c_01", merchantId: "m_c_01", name: "德式香肠拼盘", category: "food", price: 58, containsAlcohol: false, initialStock: 120 },
  { productId: "p_c_02", merchantId: "m_c_01", name: "泰式冬阴功", category: "food", price: 48, containsAlcohol: false, initialStock: 100 },
  { productId: "p_c_03", merchantId: "m_c_02", name: "特调鸡尾酒", category: "drink", price: 68, containsAlcohol: true, initialStock: 80 },
];

export function getProductsByZone(zoneId: string): ProductSeed[] {
  const merchantsInZone = ["m_a_01", "m_a_02", "m_a_03", "m_a_04"];
  if (zoneId === "zone_b") {
    return PRODUCTS.filter((p) => p.merchantId.startsWith("m_b_"));
  }
  if (zoneId === "zone_c") {
    return PRODUCTS.filter((p) => p.merchantId.startsWith("m_c_"));
  }
  return PRODUCTS.filter((p) => p.merchantId.startsWith("m_a_"));
}

export function createInitialInventory(products: ProductSeed[]): Inventory[] {
  return products.map((p) => ({
    productId: p.productId,
    merchantId: p.merchantId,
    availableQuantity: p.initialStock,
    reservedQuantity: 0,
    thresholdLow: Math.floor(p.initialStock * 0.1),
    updatedAt: Date.now(),
  }));
}

export function getBZoneInventory(): Inventory[] {
  const bProducts = getProductsByZone("zone_b");
  return createInitialInventory(bProducts);
}

export function getComboProducts(): ProductSeed[] {
  return PRODUCTS.filter(
    (p) =>
      p.productId.startsWith("p_b_") &&
      !p.containsAlcohol
  );
}
