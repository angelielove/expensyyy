"use client";

import { createRecord, deleteRecord, nowISO, updateRecord } from "@/lib/store";
import { round2 } from "@/lib/format";
import type { BaseRecord, Grocery, GroceryPriceHistory } from "@/types";

export type GroceryDraft = Omit<Grocery, keyof BaseRecord | "dateAdded"> & {
  dateAdded?: string;
};

export async function addGrocery(userId: string, draft: GroceryDraft): Promise<Grocery> {
  const timestamp = nowISO();
  const record = await createRecord<Omit<Grocery, "id">>(userId, "groceries", {
    ...draft,
    currentPrice: round2(Number(draft.currentPrice) || 0),
    quantity: Number(draft.quantity) || 0,
    dateAdded: draft.dateAdded || timestamp.slice(0, 10),
    userId,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  return record as Grocery;
}

export async function updateGrocery(
  userId: string,
  existing: Grocery,
  draft: GroceryDraft,
): Promise<void> {
  const previousPrice = round2(Number(existing.currentPrice) || 0);
  const nextPrice = round2(Number(draft.currentPrice) || 0);
  const timestamp = nowISO();

  if (previousPrice !== nextPrice) {
    await createRecord<Omit<GroceryPriceHistory, "id">>(userId, "groceryPriceHistory", {
      userId,
      groceryId: existing.id,
      itemName: draft.name || existing.name,
      previousPrice,
      newPrice: nextPrice,
      date: timestamp,
      store: draft.store || existing.store || "",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  await updateRecord<Grocery>(userId, "groceries", existing.id, {
    ...draft,
    currentPrice: nextPrice,
    quantity: Number(draft.quantity) || 0,
    dateAdded: draft.dateAdded || existing.dateAdded,
  });
}

export async function deleteGrocery(userId: string, groceryId: string): Promise<void> {
  await deleteRecord(userId, "groceries", groceryId);
}

export async function addManualPriceHistory(
  userId: string,
  grocery: Grocery,
  newPrice: number,
): Promise<void> {
  const timestamp = nowISO();
  await createRecord<Omit<GroceryPriceHistory, "id">>(userId, "groceryPriceHistory", {
    userId,
    groceryId: grocery.id,
    itemName: grocery.name,
    previousPrice: round2(grocery.currentPrice),
    newPrice: round2(newPrice),
    date: timestamp,
    store: grocery.store ?? "",
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  await updateRecord<Grocery>(userId, "groceries", grocery.id, {
    currentPrice: round2(newPrice),
  });
}
