import type { Inventory } from "../types/product";

export interface InventoryResult {
  allowed: boolean;
  reason?: string;
}

export function checkInventory(inventory: Inventory, requestQuantity: number): InventoryResult {
  if (inventory.availableQuantity <= 0) {
    return { allowed: false, reason: "OUT_OF_STOCK" };
  }

  if (requestQuantity > inventory.availableQuantity) {
    return {
      allowed: false,
      reason: `INSUFFICIENT_STOCK: request=${requestQuantity}, available=${inventory.availableQuantity}`,
    };
  }

  return { allowed: true };
}

export function reserveInventory(inventory: Inventory, quantity: number): Inventory {
  return {
    ...inventory,
    availableQuantity: inventory.availableQuantity - quantity,
    reservedQuantity: inventory.reservedQuantity + quantity,
    updatedAt: Date.now(),
  };
}

export function isBelowThreshold(inventory: Inventory, threshold: number): boolean {
  return inventory.availableQuantity < threshold;
}

export function getTotalAvailable(items: Inventory[]): number {
  return items.reduce((sum, item) => sum + item.availableQuantity, 0);
}

export function getTotalInventory(items: Inventory[]): number {
  return items.reduce(
    (sum, item) => sum + item.availableQuantity + item.reservedQuantity,
    0
  );
}
