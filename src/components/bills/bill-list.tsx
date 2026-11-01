"use client";

import { Check, FileText, Pencil, ReceiptText, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/common/badge";
import { EmptyState } from "@/components/common/empty-state";
import { formatCurrency, formatNumber } from "@/lib/format";
import { formatDate, monthLabel } from "@/lib/dates";
import {
  billRemaining,
  installmentsPaidCount,
  installmentMonths,
  installmentRemaining,
  isInstallmentBill,
  nextInstallmentMonth,
  resolveBillStatus,
} from "@/lib/calculations";
import type { Bill, BillType } from "@/types";

interface BillListProps {
  bills: Bill[];
  type: BillType;
  currency: string;
  onEdit: (bill: Bill) => void;
  onDelete: (bill: Bill) => void;
  onPayInstallment?: (bill: Bill) => void;
  emptyTitle: string;
  emptyDescription: string;
}

export function BillList({
  bills,
  type,
  currency,
  onEdit,
  onDelete,
  onPayInstallment,
  emptyTitle,
  emptyDescription,
}: BillListProps) {
  const isUtility = type === "meralco" || type === "water";
  const isOnline = type === "shopee" || type === "tiktok";

  if (bills.length === 0) {
    return (
      <EmptyState
        icon={<ReceiptText className="h-5 w-5" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-y border-line bg-background/60 text-[10px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-bold">Record</th>
              <th className="px-4 py-3 font-bold">{isUtility ? "Billing date" : "Period"}</th>
              {isUtility ? <th className="px-4 py-3 text-right font-bold">Consumption</th> : null}
              {isOnline ? <th className="px-4 py-3 font-bold">Order date</th> : null}
              <th className="px-4 py-3 font-bold">Due</th>
              <th className="px-4 py-3 text-right font-bold">Amount</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {bills.map((bill) => {
              const status = resolveBillStatus(bill);
              const remaining = billRemaining(bill);
              const installment = isInstallmentBill(bill);
              const paidInstallments = installmentsPaidCount(bill);
              const months = installmentMonths(bill);
              const nextMonth = nextInstallmentMonth(bill);
              return (
                <tr key={bill.id} className="transition hover:bg-primary-50/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-ink">{bill.title}</p>
                      {bill.receiptUrl ? (
                        <a
                          href={bill.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary-600 hover:text-primary-800"
                          title="View receipt"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-muted">
                      {bill.category}
                      {bill.provider ? ` · ${bill.provider}` : ""}
                      {installment ? ` · ${paidInstallments}/${months} installments` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-muted">
                    {isUtility
                      ? formatDate(bill.billingDate || `${bill.billingPeriod}-01`)
                      : monthLabel(bill.billingPeriod, "MMM yyyy")}
                  </td>
                  {isUtility ? (
                    <td className="px-4 py-3 text-right text-xs">
                      <p className="font-bold text-ink">
                        {formatNumber(Number(bill.consumption) || 0, 2)}{" "}
                        {type === "meralco" ? "kWh" : "m³"}
                      </p>
                      <p className="text-[10px] text-muted">
                        {formatNumber(Number(bill.previousReading) || 0, 0)} →{" "}
                        {formatNumber(Number(bill.currentReading) || 0, 0)}
                      </p>
                    </td>
                  ) : null}
                  {isOnline ? (
                    <td className="px-4 py-3 text-xs text-muted">
                      {formatDate(bill.orderDate)}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 text-xs text-muted">
                    {bill.dueDate ? formatDate(bill.dueDate) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-bold text-ink">{formatCurrency(bill.amount, currency)}</p>
                    {installment ? (
                      <p className="text-[10px] font-semibold text-muted">
                        {formatCurrency(Number(bill.installmentAmount) || 0, currency)}/mo ·{" "}
                        {formatCurrency(installmentRemaining(bill), currency)} left
                      </p>
                    ) : status === "partial" ? (
                      <p className="text-[10px] font-semibold text-warning">
                        {formatCurrency(remaining, currency)} left
                      </p>
                    ) : bill.status === "paid" || status === "paid" ? (
                      <p className="text-[10px] text-muted">
                        Paid {bill.paidDate ? formatDate(bill.paidDate) : ""}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {installment && nextMonth && onPayInstallment ? (
                        <button
                          type="button"
                          onClick={() => onPayInstallment(bill)}
                          className="rounded-lg p-2 text-muted transition hover:bg-success/10 hover:text-success"
                          aria-label={`Pay ${monthLabel(nextMonth, "MMMM yyyy")} installment for ${bill.title}`}
                          title={`Pay ${monthLabel(nextMonth, "MMMM yyyy")} installment`}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onEdit(bill)}
                        className="rounded-lg p-2 text-muted transition hover:bg-primary-50 hover:text-primary-700"
                        aria-label={`Edit ${bill.title}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(bill)}
                        className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                        aria-label={`Delete ${bill.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-line md:hidden">
        {bills.map((bill) => {
          const status = resolveBillStatus(bill);
          const installment = isInstallmentBill(bill);
          const paidInstallments = installmentsPaidCount(bill);
          const months = installmentMonths(bill);
          const nextMonth = nextInstallmentMonth(bill);
          return (
            <div key={bill.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-bold text-ink">{bill.title}</p>
                    {bill.receiptUrl ? (
                      <a
                        href={bill.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-600"
                        aria-label="View receipt"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-muted">
                    {isUtility
                      ? formatDate(bill.billingDate || `${bill.billingPeriod}-01`)
                      : monthLabel(bill.billingPeriod, "MMM yyyy")}{" "}
                    · {bill.category}
                  </p>
                </div>
                <StatusBadge status={status} />
              </div>
              <div className="mt-2 flex items-end justify-between">
                <div className="text-[11px] text-muted">
                  {isUtility ? (
                    <p>
                      {formatNumber(Number(bill.consumption) || 0, 2)}{" "}
                      {type === "meralco" ? "kWh" : "m³"}
                    </p>
                  ) : null}
                  <p>{bill.dueDate ? `Due ${formatDate(bill.dueDate)}` : "No due date"}</p>
                  {installment ? (
                    <p className="font-semibold text-primary-700">
                      {formatCurrency(Number(bill.installmentAmount) || 0, currency)}/mo ·{" "}
                      {paidInstallments}/{months} paid
                      {nextMonth ? ` · next ${monthLabel(nextMonth, "MMM yyyy")}` : ""}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-extrabold text-ink">
                    {formatCurrency(bill.amount, currency)}
                  </p>
                  {installment && nextMonth && onPayInstallment ? (
                    <button
                      type="button"
                      onClick={() => onPayInstallment(bill)}
                      className="rounded-lg p-1.5 text-muted hover:bg-success/10 hover:text-success"
                      aria-label={`Pay ${monthLabel(nextMonth, "MMMM yyyy")} installment for ${bill.title}`}
                      title={`Pay ${monthLabel(nextMonth, "MMMM yyyy")} installment`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onEdit(bill)}
                    className="rounded-lg p-1.5 text-muted hover:bg-primary-50 hover:text-primary-700"
                    aria-label={`Edit ${bill.title}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(bill)}
                    className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                    aria-label={`Delete ${bill.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
