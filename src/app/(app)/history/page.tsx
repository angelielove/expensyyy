"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Home,
  Pencil,
  ReceiptText,
  RotateCcw,
  Search,
  ShoppingBasket,
  Trash2,
  Wallet,
} from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/common/card";
import { Button } from "@/components/common/button";
import { Input, Select } from "@/components/common/input";
import { StatusBadge } from "@/components/common/badge";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog, Modal } from "@/components/common/modal";
import {
  installmentsPaidCount,
  installmentMonths,
  installmentRemaining,
  toTransactions,
} from "@/lib/calculations";
import { transactionsToCsv } from "@/lib/csv";
import { formatCurrency } from "@/lib/format";
import { formatDate, monthLabel } from "@/lib/dates";
import { deleteBill } from "@/services/billService";
import { deleteRentPayment } from "@/services/rentService";
import { deleteShoppingList } from "@/services/shoppingService";
import type { TransactionRecord } from "@/types";

const pageSize = 10;

const groupOptions = [
  { value: "all", label: "All categories" },
  { value: "grocery", label: "Groceries" },
  { value: "meralco", label: "Meralco" },
  { value: "water", label: "Water" },
  { value: "internet", label: "Internet" },
  { value: "rent", label: "Rent" },
  { value: "monthly_due", label: "HOA due" },
  { value: "shopee", label: "Shopee" },
  { value: "tiktok", label: "TikTok Shop" },
];

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partial" },
  { value: "overdue", label: "Overdue" },
  { value: "completed", label: "Completed" },
  { value: "draft", label: "Draft" },
];

export default function HistoryPage() {
  const { profile, bills, shoppingLists, rentPayments, reload } = useData();
  const { toast } = useToast();
  const router = useRouter();
  const currency = profile?.currency ?? "PHP";

  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("all");
  const [status, setStatus] = useState("all");
  const [year, setYear] = useState("all");
  const [month, setMonth] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<TransactionRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TransactionRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const transactions = useMemo(
    () => toTransactions(bills, shoppingLists, rentPayments),
    [bills, shoppingLists, rentPayments],
  );

  const years = useMemo(() => {
    const set = new Set(
      transactions
        .map((transaction) => transaction.billingPeriod.slice(0, 4))
        .filter(Boolean),
    );
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const months = useMemo(() => {
    const set = new Set(
      transactions
        .filter((transaction) => year === "all" || transaction.billingPeriod.startsWith(year))
        .map((transaction) => transaction.billingPeriod)
        .filter((value) => value.length === 7),
    );
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [transactions, year]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = transactions.filter((transaction) => {
      const matchSearch =
        !term ||
        transaction.name.toLowerCase().includes(term) ||
        transaction.category.toLowerCase().includes(term);
      const matchGroup = group === "all" || transaction.group === group;
      const matchStatus = status === "all" || transaction.status === status;
      const matchYear = year === "all" || transaction.billingPeriod.startsWith(year);
      const matchMonth = month === "all" || transaction.billingPeriod === month;
      const referenceDate =
        transaction.paidDate?.slice(0, 10) ??
        transaction.dueDate?.slice(0, 10) ??
        transaction.createdAt.slice(0, 10);
      const matchFrom = !dateFrom || referenceDate >= dateFrom;
      const matchTo = !dateTo || referenceDate <= dateTo;
      return matchSearch && matchGroup && matchStatus && matchYear && matchMonth && matchFrom && matchTo;
    });
    return rows.sort((a, b) =>
      sort === "oldest"
        ? a.createdAt.localeCompare(b.createdAt)
        : b.createdAt.localeCompare(a.createdAt),
    );
  }, [transactions, search, group, status, year, month, dateFrom, dateTo, sort]);

  useEffect(() => {
    setPage(1);
  }, [search, group, status, year, month, dateFrom, dateTo, sort]);

  const totalPages = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totalAmount = filtered.reduce((sum, entry) => sum + entry.amount, 0);
  const totalPaid = filtered.reduce((sum, entry) => sum + entry.paidAmount, 0);
  const totalUnpaid = Math.max(totalAmount - totalPaid, 0);

  const sourceBill = detail?.source === "bill" ? bills.find((bill) => bill.id === detail.id) : null;
  const sourceList =
    detail?.source === "shopping"
      ? shoppingLists.find((list) => list.id === detail.id)
      : null;
  const sourceRent =
    detail?.source === "rent"
      ? rentPayments.find((payment) => payment.id === detail.id)
      : null;

  const resetFilters = () => {
    setSearch("");
    setGroup("all");
    setStatus("all");
    setYear("all");
    setMonth("all");
    setDateFrom("");
    setDateTo("");
    setSort("newest");
  };

  const handleEdit = (transaction: TransactionRecord) => {
    if (transaction.source === "bill") {
      sessionStorage.setItem("expensyyy:editBill", transaction.id);
      router.push("/bills");
      return;
    }
    if (transaction.source === "rent") {
      sessionStorage.setItem("expensyyy:editRent", transaction.id);
      router.push("/bills");
      return;
    }
    sessionStorage.setItem("expensyyy:editShoppingList", transaction.id);
    router.push("/grocery");
  };

  const handleDelete = async () => {
    if (!deleteTarget || !profile) return;
    setDeleting(true);
    try {
      if (deleteTarget.source === "bill") {
        await deleteBill(profile.uid, deleteTarget.id);
      } else if (deleteTarget.source === "rent") {
        await deleteRentPayment(profile.uid, deleteTarget.id);
      } else {
        await deleteShoppingList(profile.uid, deleteTarget.id);
      }
      toast("Transaction deleted.");
      setDeleteTarget(null);
      setDetail(null);
      await reload();
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not delete. Try again.", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="History"
        subtitle="Every record, searchable and filterable — even from months gone by."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              transactionsToCsv(filtered, `expensyyy-history-${new Date().toISOString().slice(0, 10)}.csv`);
              toast("Filtered history exported as CSV.");
            }}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Records"
          value={String(filtered.length)}
          hint="Matching your filters"
          icon={<ReceiptText className="h-4 w-4" />}
          tone="green"
        />
        <StatCard
          label="Amount"
          value={formatCurrency(totalAmount, currency)}
          hint="Total value"
          icon={<Wallet className="h-4 w-4" />}
          tone="amber"
        />
        <StatCard
          label="Paid"
          value={formatCurrency(totalPaid, currency)}
          hint="Settled amount"
          icon={<ReceiptText className="h-4 w-4" />}
          tone="blue"
        />
        <StatCard
          label="Unpaid"
          value={formatCurrency(totalUnpaid, currency)}
          hint="Remaining balance"
          icon={<Home className="h-4 w-4" />}
          tone="rose"
        />
      </div>

      <Card>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search transaction name or category…"
              className="pl-10"
              aria-label="Search transactions"
            />
          </div>
          <Select value={group} onChange={(event) => setGroup(event.target.value)} aria-label="Filter category">
            {groupOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter status">
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            value={year}
            onChange={(event) => {
              setYear(event.target.value);
              setMonth("all");
            }}
            aria-label="Filter year"
          >
            <option value="all">All years</option>
            {years.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </Select>
          <Select value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Filter month">
            <option value="all">All months</option>
            {months.map((entry) => (
              <option key={entry} value={entry}>
                {monthLabel(entry, "MMMM yyyy")}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            aria-label="Date from"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            aria-label="Date to"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <Select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="w-full sm:w-44"
            aria-label="Sort transactions"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </Select>
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset filters
          </Button>
        </div>
      </Card>

      <Card className="p-0">
        {transactions.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<ReceiptText className="h-5 w-5" />}
              title="No history yet"
              description="As you add bills, rent payments, and shopping lists, every transaction appears here."
              action={
                <Button size="sm" onClick={() => router.push("/bills")}>
                  Add your first bill
                </Button>
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Search className="h-5 w-5" />}
              title="No matching transactions"
              description="Try adjusting or resetting your filters to see more records."
              action={
                <Button size="sm" variant="outline" onClick={resetFilters}>
                  Reset filters
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-background/60 text-[10px] uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-bold">Transaction</th>
                    <th className="px-4 py-3 font-bold">Period</th>
                    <th className="px-4 py-3 font-bold">Due</th>
                    <th className="px-4 py-3 font-bold">Paid</th>
                    <th className="px-4 py-3 text-right font-bold">Amount</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pageRows.map((transaction) => (
                    <tr key={`${transaction.source}-${transaction.id}`} className="transition hover:bg-primary-50/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                            {transaction.source === "shopping" ? (
                              <ShoppingBasket className="h-3.5 w-3.5" />
                            ) : transaction.source === "rent" ? (
                              <Home className="h-3.5 w-3.5" />
                            ) : (
                              <ReceiptText className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-ink">{transaction.name}</p>
                            <p className="flex items-center gap-1 text-[11px] text-muted">
                              {transaction.category}
                              {transaction.hasReceipt ? <FileText className="h-3 w-3" /> : null}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-muted">
                        {transaction.billingPeriod
                          ? monthLabel(transaction.billingPeriod, "MMM yyyy")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {transaction.dueDate ? formatDate(transaction.dueDate) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {transaction.paidDate ? formatDate(transaction.paidDate) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-bold text-ink">{formatCurrency(transaction.amount, currency)}</p>
                        {transaction.paidAmount > 0 && transaction.paidAmount < transaction.amount ? (
                          <p className="text-[10px] text-warning">
                            {formatCurrency(transaction.paidAmount, currency)} paid
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={transaction.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDetail(transaction)}
                            className="rounded-lg p-2 text-muted transition hover:bg-primary-50 hover:text-primary-700"
                            aria-label="View transaction"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(transaction)}
                            className="rounded-lg p-2 text-muted transition hover:bg-primary-50 hover:text-primary-700"
                            aria-label="Edit transaction"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(transaction)}
                            className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                            aria-label="Delete transaction"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-line md:hidden">
              {pageRows.map((transaction) => (
                <div key={`${transaction.source}-${transaction.id}`} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">{transaction.name}</p>
                      <p className="text-[11px] text-muted">
                        {transaction.category} ·{" "}
                        {transaction.billingPeriod
                          ? monthLabel(transaction.billingPeriod, "MMM yyyy")
                          : "—"}
                      </p>
                    </div>
                    <StatusBadge status={transaction.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-sm font-extrabold text-ink">
                      {formatCurrency(transaction.amount, currency)}
                    </p>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setDetail(transaction)}
                        className="rounded-lg p-1.5 text-muted hover:bg-primary-50 hover:text-primary-700"
                        aria-label="View transaction"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(transaction)}
                        className="rounded-lg p-1.5 text-muted hover:bg-primary-50 hover:text-primary-700"
                        aria-label="Edit transaction"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(transaction)}
                        className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                        aria-label="Delete transaction"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
              <p className="text-[11px] font-semibold text-muted">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of{" "}
                {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((value) => Math.max(value - 1, 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </Button>
                <span className="px-2 text-xs font-bold text-muted">
                  {page} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((value) => Math.min(value + 1, totalPages))}
                  disabled={page >= totalPages}
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.name ?? "Transaction details"}
        description={
          detail
            ? `${detail.category} · ${detail.billingPeriod ? monthLabel(detail.billingPeriod, "MMMM yyyy") : "No period"}`
            : undefined
        }
        size="md"
        footer={
          detail ? (
            <>
              <Button
                variant="danger"
                onClick={() => setDeleteTarget(detail)}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
              <Button variant="ghost" onClick={() => setDetail(null)}>
                Close
              </Button>
              <Button onClick={() => handleEdit(detail)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            </>
          ) : undefined
        }
      >
        {detail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-background p-3">
                <p className="text-[10px] font-bold uppercase text-muted">Amount</p>
                <p className="mt-0.5 text-lg font-extrabold text-ink">
                  {formatCurrency(detail.amount, currency)}
                </p>
              </div>
              <div className="rounded-xl bg-background p-3">
                <p className="text-[10px] font-bold uppercase text-muted">Status</p>
                <div className="mt-1">
                  <StatusBadge status={detail.status} />
                </div>
              </div>
              <div className="rounded-xl bg-background p-3">
                <p className="text-[10px] font-bold uppercase text-muted">Billing period</p>
                <p className="mt-0.5 text-xs font-bold text-ink">
                  {detail.billingPeriod
                    ? monthLabel(detail.billingPeriod, "MMMM yyyy")
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-background p-3">
                <p className="text-[10px] font-bold uppercase text-muted">Amount paid</p>
                <p className="mt-0.5 text-xs font-bold text-ink">
                  {formatCurrency(detail.paidAmount, currency)}
                </p>
              </div>
              <div className="rounded-xl bg-background p-3">
                <p className="text-[10px] font-bold uppercase text-muted">Due date</p>
                <p className="mt-0.5 text-xs font-bold text-ink">
                  {detail.dueDate ? formatDate(detail.dueDate) : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-background p-3">
                <p className="text-[10px] font-bold uppercase text-muted">Paid date</p>
                <p className="mt-0.5 text-xs font-bold text-ink">
                  {detail.paidDate ? formatDate(detail.paidDate) : "—"}
                </p>
              </div>
            </div>

            {sourceBill ? (
              <div className="space-y-2 rounded-xl border border-line p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Type</span>
                  <span className="font-semibold capitalize text-ink">
                    {sourceBill.type.replace("_", " ")}
                  </span>
                </div>
                {sourceBill.provider ? (
                  <div className="flex justify-between">
                    <span className="text-muted">Provider</span>
                    <span className="font-semibold text-ink">{sourceBill.provider}</span>
                  </div>
                ) : null}
                {sourceBill.consumption !== undefined ? (
                  <div className="flex justify-between">
                    <span className="text-muted">Consumption</span>
                    <span className="font-semibold text-ink">
                      {sourceBill.consumption} {sourceBill.type === "meralco" ? "kWh" : "m³"}
                    </span>
                  </div>
                ) : null}
                {sourceBill.billingDate ? (
                  <div className="flex justify-between">
                    <span className="text-muted">Billing date</span>
                    <span className="font-semibold text-ink">
                      {formatDate(sourceBill.billingDate)}
                    </span>
                  </div>
                ) : null}
                {sourceBill.purchaseType === "installment" ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted">Installment plan</span>
                      <span className="font-semibold text-ink">
                        {installmentsPaidCount(sourceBill)} of {installmentMonths(sourceBill)} paid
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Monthly bill</span>
                      <span className="font-semibold text-ink">
                        {formatCurrency(Number(sourceBill.installmentAmount) || 0, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Remaining balance</span>
                      <span className="font-semibold text-ink">
                        {formatCurrency(installmentRemaining(sourceBill), currency)}
                      </span>
                    </div>
                  </>
                ) : null}
                {sourceBill.notes ? (
                  <div>
                    <p className="text-muted">Notes</p>
                    <p className="mt-0.5 leading-5 text-ink">{sourceBill.notes}</p>
                  </div>
                ) : null}
                {sourceBill.receiptUrl ? (
                  <a
                    href={sourceBill.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-primary-50 px-2.5 py-2 font-semibold text-primary-800"
                  >
                    <FileText className="h-4 w-4" /> View receipt ({sourceBill.receiptName || "attachment"})
                  </a>
                ) : null}
              </div>
            ) : null}

            {sourceRent ? (
              <div className="space-y-2 rounded-xl border border-line p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Member</span>
                  <span className="font-semibold text-ink">{sourceRent.memberName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Expected contribution</span>
                  <span className="font-semibold text-ink">
                    {formatCurrency(sourceRent.expectedAmount, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Payment date</span>
                  <span className="font-semibold text-ink">
                    {sourceRent.paymentDate ? formatDate(sourceRent.paymentDate, "MMM d, yyyy h:mm a") : "—"}
                  </span>
                </div>
                {sourceRent.notes ? (
                  <div>
                    <p className="text-muted">Notes</p>
                    <p className="mt-0.5 leading-5 text-ink">{sourceRent.notes}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {sourceList ? (
              <div className="rounded-xl border border-line p-3">
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-muted">Shopping date</span>
                  <span className="font-semibold text-ink">{formatDate(sourceList.shoppingDate)}</span>
                </div>
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-muted">Budget</span>
                  <span className="font-semibold text-ink">
                    {sourceList.budget > 0 ? formatCurrency(sourceList.budget, currency) : "None"}
                  </span>
                </div>
                <p className="mb-1 text-[10px] font-bold uppercase text-muted">Items</p>
                <ul className="divide-y divide-line">
                  {sourceList.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between py-1.5 text-xs">
                      <span className="text-ink">
                        {item.name}{" "}
                        <span className="text-[10px] text-muted">
                          × {item.quantity} {item.unit}
                        </span>
                      </span>
                      <span className="font-semibold text-ink">
                        {formatCurrency(item.quantity * item.unitPrice, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this transaction?"
        message={`"${deleteTarget?.name ?? ""}" will be permanently removed. This action cannot be undone.`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        busy={deleting}
      />
    </div>
  );
}
