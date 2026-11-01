"use client";

import { createRecord, deleteRecord, nowISO, updateRecord } from "@/lib/store";
import { round2 } from "@/lib/format";
import type { BaseRecord, ShoppingList, ShoppingListItem } from "@/types";

export type ShoppingListDraft = Omit<ShoppingList, keyof BaseRecord>;

function normalizeItems(items: ShoppingListItem[]): ShoppingListItem[] {
  return items.map((item) => ({
    ...item,
    quantity: Number(item.quantity) || 0,
    unitPrice: round2(Number(item.unitPrice) || 0),
    purchased: Boolean(item.purchased),
  }));
}

export async function addShoppingList(
  userId: string,
  draft: ShoppingListDraft,
): Promise<ShoppingList> {
  const timestamp = nowISO();
  const record = await createRecord<Omit<ShoppingList, "id">>(userId, "shoppingLists", {
    ...draft,
    budget: round2(Number(draft.budget) || 0),
    items: normalizeItems(draft.items ?? []),
    userId,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  return record as ShoppingList;
}

export async function updateShoppingList(
  userId: string,
  id: string,
  draft: ShoppingListDraft,
): Promise<void> {
  await updateRecord<ShoppingList>(userId, "shoppingLists", id, {
    ...draft,
    budget: round2(Number(draft.budget) || 0),
    items: normalizeItems(draft.items ?? []),
  });
}

export async function deleteShoppingList(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, "shoppingLists", id);
}
