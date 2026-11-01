import { formatCurrency } from "@/lib/format";
import type { TransactionRecord } from "@/types";

function escapeCell(value: string | number): string {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number>>): void {
  const lines = [header, ...rows].map((row) => row.map(escapeCell).join(","));
  const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function transactionsToCsv(
  transactions: TransactionRecord[],
  filename = "expensyyy-transactions.csv",
): void {
  downloadCsv(
    filename,
    [
      "Name",
      "Category",
      "Billing Period",
      "Amount",
      "Paid Amount",
      "Status",
      "Due Date",
      "Paid Date",
      "Receipt",
    ],
    transactions.map((transaction) => [
      transaction.name,
      transaction.category,
      transaction.billingPeriod,
      formatCurrency(transaction.amount),
      formatCurrency(transaction.paidAmount),
      transaction.status,
      transaction.dueDate ?? "",
      transaction.paidDate ?? "",
      transaction.hasReceipt ? "Yes" : "No",
    ]),
  );
}
