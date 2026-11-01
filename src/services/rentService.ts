"use client";

import { createRecord, deleteRecord, nowISO, updateRecord } from "@/lib/store";
import { round2 } from "@/lib/format";
import { rentStatus } from "@/lib/calculations";
import type { BaseRecord, RentPayment } from "@/types";

export type RentDraft = Omit<RentPayment, keyof BaseRecord>;

export function normalizeRent(draft: RentDraft): RentDraft {
  const expectedAmount = round2(Number(draft.expectedAmount) || 0);
  const amountPaid = Math.max(round2(Number(draft.amountPaid) || 0), 0);
  return {
    ...draft,
    expectedAmount,
    amountPaid,
    status: rentStatus(expectedAmount, amountPaid),
  };
}

export async function addRentPayment(
  userId: string,
  draft: RentDraft,
): Promise<RentPayment> {
  const timestamp = nowISO();
  const normalized = normalizeRent(draft);
  const record = await createRecord<Omit<RentPayment, "id">>(userId, "rentPayments", {
    ...normalized,
    userId,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  return record as RentPayment;
}

export async function updateRentPayment(
  userId: string,
  id: string,
  draft: RentDraft,
): Promise<void> {
  await updateRecord<RentPayment>(userId, "rentPayments", id, normalizeRent(draft));
}

export async function deleteRentPayment(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, "rentPayments", id);
}
