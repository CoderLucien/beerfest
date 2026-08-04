import type { Merchant } from "@beerfest/domain";

export const MERCHANTS: Merchant[] = [
  { merchantId: "m_a_01", zoneId: "zone_a", name: "青岛精酿坊", category: "drink", operating: true },
  { merchantId: "m_a_02", zoneId: "zone_a", name: "海鲜烧烤王", category: "food", operating: true },
  { merchantId: "m_a_03", zoneId: "zone_a", name: "海风小吃", category: "food", operating: true },
  { merchantId: "m_a_04", zoneId: "zone_a", name: "鲜啤一号", category: "drink", operating: true },
  { merchantId: "m_b_01", zoneId: "zone_b", name: "德国啤酒屋", category: "drink", operating: true },
  { merchantId: "m_b_02", zoneId: "zone_b", name: "文创工坊", category: "cultural", operating: true },
  { merchantId: "m_b_03", zoneId: "zone_b", name: "特色小吃集", category: "food", operating: true },
  { merchantId: "m_b_04", zoneId: "zone_b", name: "海边茶座", category: "food", operating: true },
  { merchantId: "m_c_01", zoneId: "zone_c", name: "国际美食汇", category: "food", operating: true },
  { merchantId: "m_c_02", zoneId: "zone_c", name: "音乐酒吧", category: "drink", operating: true },
  { merchantId: "m_c_03", zoneId: "zone_c", name: "手作集市", category: "cultural", operating: true },
  { merchantId: "m_c_04", zoneId: "zone_c", name: "冰爽世界", category: "drink", operating: true },
];

export function getMerchantsByZone(zoneId: string): Merchant[] {
  return MERCHANTS.filter((m) => m.zoneId === zoneId);
}
