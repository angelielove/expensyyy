"use client";

import { createRecord, deleteRecord, nowISO, updateRecord } from "@/lib/store";
import { round2 } from "@/lib/format";
import { todayDateInput } from "@/lib/dates";
import type { BaseRecord, Bill, PaymentStatus } from "@/types";

export type BillDraft = Omit<Bill, keyof BaseRecord>;

export function normalizeBill(draft: BillDraft): BillDraft {
  const amount = round2(Number(draft.amount) || 0);
  let paidAmount = round2(Number(draft.paidAmount) || 0);
  if (draft.status === "paid" && paidAmount === 0) paidAmount = amount;
  paidAmount = Math.min(Math.max(paidAmount, 0), Math.max(amount, paidAmount));

  let status: PaymentStatus = draft.status;
  if (paidAmount >= amount && amount > 0 && draft.status !== "unpaid") {
    status = "paid";
  } else if (paidAmount > 0 && paidAmount < amount) {
    status = "partial";
  } else if (draft.status === "paid" && paidAmount === 0 && amount === 0) {
    status = "paid";
  } else if (draft.status === "paid" && paidAmount < amount) {
    status = "partial";
  }

  if (draft.purchaseType === "installment") {
    const months = Math.max(Math.floor(Number(draft.installmentMonths) || 0), 0);
    const monthly = round2(Number(draft.installmentAmount) || 0);
    const paidCount = Math.min(
      Math.max(Math.floor(Number(draft.installmentsPaid) || 0), 0),
      months,
    );
    paidAmount =
      paidCount >= months && months > 0 ? amount : Math.min(round2(monthly * paidCount), amount);
    status = paidCount >= months && months > 0 ? "paid" : paidAmount > 0 ? "partial" : "unpaid";
  }

  return {
    ...draft,
    amount,
    paidAmount,
    status,
    billingPeriod: draft.billingPeriod,
    dueDate: draft.dueDate || "",
    title: draft.title.trim(),
  };
}

export async function addBill(userId: string, draft: BillDraft): Promise<Bill> {
  const timestamp = nowISO();
  const normalized = normalizeBill(draft);
  const record = await createRecord<Omit<Bill, "id">>(userId, "bills", {
    ...normalized,
    userId,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  return record as Bill;
}

export async function updateBill(
  userId: string,
  id: string,
  draft: BillDraft,
): Promise<void> {
  await updateRecord<Bill>(userId, "bills", id, normalizeBill(draft));
}

export async function deleteBill(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, "bills", id);
}

export async function payNextInstallment(userId: string, bill: Bill): Promise<void> {
  const months = Math.max(Math.floor(Number(bill.installmentMonths) || 0), 0);
  const paidCount = Math.min(Math.max(Math.floor(Number(bill.installmentsPaid) || 0), 0), months);
  if (months === 0 || paidCount >= months) return;

  const nextCount = paidCount + 1;
  const amount = round2(Number(bill.amount) || 0);
  const monthly = round2(Number(bill.installmentAmount) || 0);
  const paidAmount = nextCount >= months ? amount : Math.min(round2(monthly * nextCount), amount);
  const status: PaymentStatus = nextCount >= months ? "paid" : "partial";

  await updateRecord<Bill>(userId, "bills", bill.id, {
    installmentsPaid: nextCount,
    paidAmount,
    status,
    paidDate: status === "paid" ? todayDateInput() : bill.paidDate ?? "",
  });
}
