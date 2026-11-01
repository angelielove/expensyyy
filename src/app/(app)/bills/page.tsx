"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Droplets,
  Home,
  Pencil,
  Plus,
  ReceiptText,
  Repeat,
  Search,
  ShoppingBag,
  Store,
  Trash2,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import { PageHeader } from "@/components/common/page-header";
import { Tabs } from "@/components/common/tabs";
import { Card, CardHeader } from "@/components/common/card";
import { Button } from "@/components/common/button";
import { Input, Select } from "@/components/common/input";
import { StatCard } from "@/components/common/stat-card";
import { MonthSelector } from "@/components/common/month-selector";
import { StatusBadge } from "@/components/common/badge";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/modal";
import { BillFormModal } from "@/components/bills/bill-form-modal";
import { BillList } from "@/components/bills/bill-list";
import { RentPaymentModal } from "@/components/bills/rent-payment-modal";
import { ExpenseBarChart, ExpenseLineChart } from "@/components/charts/chart-card";
import { deleteBill, payNextInstallment } from "@/services/billService";
import { deleteRentPayment } from "@/services/rentService";
import { billPaidValue, rentStatus } from "@/lib/calculations";
import {
  currentMonthKey,
  formatDate,
  formatDateTime,
  lastNMonths,
  monthLabel,
} from "@/lib/dates";
import { formatCompactCurrency, formatCurrency, formatNumber } from "@/lib/format";
import type { Bill, BillType, RentPayment } from "@/types";

type TabId = BillType | "rent";

const tabItems: Array<{ id: TabId; label: string }> = [
  { id: "meralco", label: "Meralco" },
  { id: "water", label: "Water" },
  { id: "internet", label: "Internet" },
  { id: "rent", label: "Rent" },
  { id: "monthly_due", label: "HOA due" },
  { id: "shopee", label: "Shopee" },
  { id: "tiktok", label: "TikTok" },
];

const addLabels: Record<TabId, string> = {
  meralco: "Add Meralco bill",
  water: "Add water bill",
  internet: "Add internet bill",
  rent: "Record rent payment",
  monthly_due: "Add HOA due",
  shopee: "Add Shopee purchase",
  tiktok: "Add TikTok purchase",
};

type DeleteTarget = { kind: "bill" | "rent"; id: string; label: string };

export default function BillsPage() {
  const { profile, bills, rentPayments, reload } = useData();
  const { toast } = useToast();
  const currency = profile?.currency ?? "PHP";
  const members = useMemo(() => profile?.members ?? [], [profile]);

  const [tab, setTab] = useState<TabId>("meralco");
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [rentPeriod, setRentPeriod] = useState(currentMonthKey());
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<BillType>("meralco");
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [rentModalOpen, setRentModalOpen] = useState(false);
  const [editingRent, setEditingRent] = useState<RentPayment | null>(null);
  const [rentDefaults, setRentDefaults] = useState<{ memberId?: string; expected?: number }>({});
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openBillForm = (type: BillType, bill: Bill | null) => {
    setFormType(type);
    setEditingBill(bill);
    setFormOpen(true);
  };

  const openRentForm = (payment: RentPayment | null, memberId?: string, expected?: number) => {
    setEditingRent(payment);
    setRentDefaults(payment ? {} : { memberId, expected });
    setRentModalOpen(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryTab = params.get("tab");
    const queryNew = params.get("new");
    const validTabs: TabId[] = [
      "meralco",
      "water",
      "internet",
      "rent",
      "monthly_due",
      "shopee",
      "tiktok",
    ];
    if (queryTab && validTabs.includes(queryTab as TabId)) {
      setTab(queryTab as TabId);
    }
    if (queryNew) {
      if (queryNew === "rent") {
        setTab("rent");
        openRentForm(null);
      } else if (validTabs.includes(queryNew as TabId)) {
        setTab(queryNew as TabId);
        openBillForm(queryNew as BillType, null);
      }
    }
    if (queryTab || queryNew) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const billId = sessionStorage.getItem("expensyyy:editBill");
    if (billId) {
      sessionStorage.removeItem("expensyyy:editBill");
      const bill = bills.find((entry) => entry.id === billId);
      if (bill) {
        setTab(bill.type);
        openBillForm(bill.type, bill);
      }
    }
    const rentId = sessionStorage.getItem("expensyyy:editRent");
    if (rentId) {
      sessionStorage.removeItem("expensyyy:editRent");
      const payment = rentPayments.find((entry) => entry.id === rentId);
      if (payment) {
        setTab("rent");
        setRentPeriod(payment.billingPeriod);
        openRentForm(payment);
      }
    }
  }, [bills, rentPayments]);

  const years = useMemo(() => {
    const found = new Set(bills.map((bill) => bill.billingPeriod.slice(0, 4)));
    found.add(String(new Date().getFullYear()));
    return Array.from(found).sort((a, b) => b.localeCompare(a));
  }, [bills]);

  const typeBills = useMemo(
    () => (tab === "rent" ? [] : bills.filter((bill) => bill.type === tab)),
    [bills, tab],
  );

  const monthOptions = useMemo(() => {
    const found = new Set(typeBills.map((bill) => bill.billingPeriod));
    return Array.from(found).sort((a, b) => b.localeCompare(a));
  }, [typeBills]);

  const visibleBills = useMemo(() => {
    const term = search.trim().toLowerCase();
    return typeBills
      .filter((bill) => {
        const matchYear = yearFilter === "all" || bill.billingPeriod.startsWith(yearFilter);
        const matchMonth = monthFilter === "all" || bill.billingPeriod === monthFilter;
        const matchSearch =
          !term ||
          bill.title.toLowerCase().includes(term) ||
          (bill.category ?? "").toLowerCase().includes(term) ||
          (bill.notes ?? "").toLowerCase().includes(term) ||
          (bill.paymentMethod ?? "").toLowerCase().includes(term);
        return matchYear && matchMonth && matchSearch;
      })
      .sort((a, b) => b.billingPeriod.localeCompare(a.billingPeriod) || b.createdAt.localeCompare(a.createdAt));
  }, [typeBills, yearFilter, monthFilter, search]);

  const periodPayments = useMemo(
    () =>
      rentPayments
        .filter((payment) => payment.billingPeriod === rentPeriod)
        .sort((a, b) => (b.paymentDate ?? b.createdAt).localeCompare(a.paymentDate ?? a.createdAt)),
    [rentPayments, rentPeriod],
  );

  const memberRows = useMemo(
    () =>
      members.map((member) => {
        const payments = periodPayments.filter((payment) => payment.memberId === member.id);
        const collected = payments.reduce((sum, payment) => sum + (Number(payment.amountPaid) || 0), 0);
        return {
          member,
          payments,
          expected: member.contribution,
          collected,
          remaining: Math.max(member.contribution - collected, 0),
        };
      }),
    [members, periodPayments],
  );

  const rentTotals = useMemo(() => {
    const expected = members.reduce((sum, member) => sum + (Number(member.contribution) || 0), 0);
    const collected = periodPayments.reduce((sum, payment) => sum + (Number(payment.amountPaid) || 0), 0);
    return { expected, collected, remaining: Math.max(expected - collected, 0) };
  }, [members, periodPayments]);

  const chartData = useMemo(() => {
    if (tab !== "meralco" && tab !== "water") return [];
    const scope = typeBills.filter(
      (bill) => yearFilter === "all" || bill.billingPeriod.startsWith(yearFilter),
    );
    if (scope.length === 0) return [];
    const months =
      yearFilter === "all"
        ? lastNMonths(currentMonthKey(), 6)
        : Array.from({ length: 12 }, (_, index) => `${yearFilter}-${String(index + 1).padStart(2, "0")}`);
    return months.map((key) => {
      const entries = typeBills.filter((bill) => bill.billingPeriod === key);
      const amount = entries.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0);
      const consumption = entries.reduce((sum, bill) => sum + (Number(bill.consumption) || 0), 0);
      const rates = entries
        .map((bill) => Number(bill.ratePerKwh) || 0)
        .filter((rate) => rate > 0);
      const rate =
        rates.length > 0 ? rates.reduce((sum, value) => sum + value, 0) / rates.length : 0;
      return {
        month: monthLabel(key, "MMM"),
        amount,
        consumption,
        rate: Number(rate.toFixed(2)),
      };
    });
  }, [tab, typeBills, yearFilter]);

  const latestBill = useMemo(
    () =>
      [...typeBills].sort((a, b) => b.billingPeriod.localeCompare(a.billingPeriod))[0] ?? null,
    [typeBills],
  );

  const scopeYear = yearFilter === "all" ? String(new Date().getFullYear()) : yearFilter;
  const yearlyBills = typeBills.filter((bill) => bill.billingPeriod.startsWith(scopeYear));
  const yearlyTotal = yearlyBills.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0);
  const visibleTotal = visibleBills.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0);
  const visiblePaid = visibleBills.reduce((sum, bill) => sum + billPaidValue(bill), 0);
  const visibleUnpaid = Math.max(visibleTotal - visiblePaid, 0);

  const handleDelete = async () => {
    if (!deleteTarget || !profile) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === "bill") {
        await deleteBill(profile.uid, deleteTarget.id);
        toast("Bill deleted.");
      } else {
        await deleteRentPayment(profile.uid, deleteTarget.id);
        toast("Rent payment deleted.");
      }
      await reload();
      setDeleteTarget(null);
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not delete. Try again.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handlePayInstallment = async (bill: Bill) => {
    if (!profile) return;
    try {
      await payNextInstallment(profile.uid, bill);
      await reload();
      toast("Monthly installment recorded and deducted from the balance.");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not record installment.", "error");
    }
  };

  const isOnlineTab = tab === "shopee" || tab === "tiktok";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bills"
        subtitle="Utilities, rent, dues, and online shopping — organized in one place."
        actions={
          <Button
            size="sm"
            onClick={() => {
              if (tab === "rent") openRentForm(null);
              else openBillForm(tab, null);
            }}
          >
            <Plus className="h-4 w-4" /> {addLabels[tab]}
          </Button>
        }
      />

      <Tabs
        items={tabItems.map((item) => ({
          ...item,
          count:
            item.id === "rent"
              ? rentPayments.length
              : bills.filter((bill) => bill.type === item.id).length,
        }))}
        value={tab}
        onChange={(value) => {
          setTab(value as TabId);
          setYearFilter("all");
          setMonthFilter("all");
          setSearch("");
        }}
      />

      {tab !== "rent" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            {isOnlineTab ? (
              <>
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search purchases…"
                    className="pl-10"
                    aria-label="Search purchases"
                  />
                </div>
                <Select
                  value={monthFilter}
                  onChange={(event) => setMonthFilter(event.target.value)}
                  className="sm:w-48"
                  aria-label="Filter by month"
                >
                  <option value="all">All months</option>
                  {monthOptions.map((month) => (
                    <option key={month} value={month}>
                      {monthLabel(month, "MMM yyyy")}
                    </option>
                  ))}
                </Select>
              </>
            ) : null}
          </div>
          <Select
            value={yearFilter}
            onChange={(event) => {
              setYearFilter(event.target.value);
              setMonthFilter("all");
            }}
            className="sm:w-44"
            aria-label="Filter by year"
          >
            <option value="all">All years</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {tab === "meralco" ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Latest bill"
              value={latestBill ? formatCompactCurrency(latestBill.amount, currency) : formatCurrency(0, currency)}
              hint={latestBill ? monthLabel(latestBill.billingPeriod, "MMMM yyyy") : "No bills yet"}
              icon={<Zap className="h-4 w-4" />}
              tone="amber"
            />
            <StatCard
              label="Consumption"
              value={latestBill ? `${formatNumber(Number(latestBill.consumption) || 0, 0)} kWh` : "—"}
              hint="Latest reading"
              icon={<ReceiptText className="h-4 w-4" />}
              tone="blue"
            />
            <StatCard
              label="Rate per kWh"
              value={
                latestBill?.ratePerKwh
                  ? formatCurrency(latestBill.ratePerKwh, currency)
                  : "—"
              }
              hint="Latest rate"
              icon={<Wallet className="h-4 w-4" />}
              tone="violet"
            />
            <StatCard
              label={`Total ${scopeYear}`}
              value={formatCompactCurrency(yearlyTotal, currency)}
              hint={`${yearlyBills.length} bill(s)`}
              icon={<CalendarDays className="h-4 w-4" />}
              tone="green"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ExpenseBarChart
              title="Electricity consumption"
              description="kWh used per month"
              data={chartData}
              xKey="month"
              series={[{ key: "consumption", label: "kWh", color: "#E6A34B" }]}
              currency={false}
              height={220}
              emptyMessage="Add a Meralco bill to see consumption"
            />
            <ExpenseBarChart
              title="Electricity bill"
              description="Actual amount paid or due"
              data={chartData}
              xKey="month"
              series={[{ key: "amount", label: "Bill", color: "#6FA986" }]}
              height={220}
              emptyMessage="Add a Meralco bill to see costs"
            />
            <ExpenseLineChart
              title="Rate per kWh"
              description="Average rate entered per month"
              data={chartData}
              xKey="month"
              series={[{ key: "rate", label: "Rate", color: "#A08CC4" }]}
              height={220}
              emptyMessage="Add a Meralco bill to see rates"
            />
          </div>

          <Card className="p-0">
            <div className="p-4 pb-3">
              <CardHeader
                title="Meralco history"
                description={`${visibleBills.length} record(s) shown`}
                icon={<Zap className="h-4 w-4" />}
                className="mb-0"
              />
            </div>
            <BillList
              bills={visibleBills}
              type="meralco"
              currency={currency}
              onEdit={(bill) => openBillForm("meralco", bill)}
              onDelete={(bill) =>
                setDeleteTarget({ kind: "bill", id: bill.id, label: bill.title })
              }
              emptyTitle="No Meralco bills yet"
              emptyDescription="Add your electricity readings and actual bill to start tracking usage."
            />
          </Card>
        </>
      ) : null}

      {tab === "water" ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Latest bill"
              value={latestBill ? formatCompactCurrency(latestBill.amount, currency) : formatCurrency(0, currency)}
              hint={latestBill ? monthLabel(latestBill.billingPeriod, "MMMM yyyy") : "No bills yet"}
              icon={<Droplets className="h-4 w-4" />}
              tone="blue"
            />
            <StatCard
              label="Consumption"
              value={latestBill ? `${formatNumber(Number(latestBill.consumption) || 0, 2)} m³` : "—"}
              hint="Latest reading"
              icon={<ReceiptText className="h-4 w-4" />}
              tone="green"
            />
            <StatCard
              label="Minimum charge"
              value={formatCurrency(profile?.waterMinimumCharge ?? 345, currency)}
              hint={`For ${profile?.waterMinimumConsumption ?? 10} m³`}
              icon={<Wallet className="h-4 w-4" />}
              tone="violet"
            />
            <StatCard
              label={`Total ${scopeYear}`}
              value={formatCompactCurrency(yearlyTotal, currency)}
              hint={`${yearlyBills.length} bill(s)`}
              icon={<CalendarDays className="h-4 w-4" />}
              tone="amber"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ExpenseBarChart
              title="Water consumption"
              description="Cubic meters used per month"
              data={chartData}
              xKey="month"
              series={[{ key: "consumption", label: "m³", color: "#7FB6BA" }]}
              currency={false}
              height={240}
              emptyMessage="Add a water bill to see consumption"
            />
            <ExpenseBarChart
              title="Water bill"
              description="Actual amount per month"
              data={chartData}
              xKey="month"
              series={[{ key: "amount", label: "Bill", color: "#6FA986" }]}
              height={240}
              emptyMessage="Add a water bill to see costs"
            />
          </div>

          <Card className="p-0">
            <div className="p-4 pb-3">
              <CardHeader
                title="Water history"
                description={`${visibleBills.length} record(s) shown`}
                icon={<Droplets className="h-4 w-4" />}
                className="mb-0"
              />
            </div>
            <BillList
              bills={visibleBills}
              type="water"
              currency={currency}
              onEdit={(bill) => openBillForm("water", bill)}
              onDelete={(bill) =>
                setDeleteTarget({ kind: "bill", id: bill.id, label: bill.title })
              }
              emptyTitle="No water bills yet"
              emptyDescription="Track your meter readings and actual water bill here."
            />
          </Card>
        </>
      ) : null}

      {tab === "internet" ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Latest bill"
              value={latestBill ? formatCompactCurrency(latestBill.amount, currency) : formatCurrency(0, currency)}
              hint={latestBill ? monthLabel(latestBill.billingPeriod, "MMMM yyyy") : "No bills yet"}
              icon={<Wifi className="h-4 w-4" />}
              tone="violet"
            />
            <StatCard
              label={`Total ${scopeYear}`}
              value={formatCompactCurrency(yearlyTotal, currency)}
              hint={`${yearlyBills.length} month(s)`}
              icon={<CalendarDays className="h-4 w-4" />}
              tone="green"
            />
            <StatCard
              label="Unpaid shown"
              value={formatCompactCurrency(visibleUnpaid, currency)}
              hint="Based on your filters"
              icon={<Wallet className="h-4 w-4" />}
              tone="rose"
            />
            <StatCard
              label="Paid shown"
              value={formatCompactCurrency(visiblePaid, currency)}
              hint="Based on your filters"
              icon={<ReceiptText className="h-4 w-4" />}
              tone="blue"
            />
          </div>
          <Card className="p-0">
            <div className="p-4 pb-3">
              <CardHeader
                title="Internet history"
                description="Monthly internet expenses and receipts"
                icon={<Wifi className="h-4 w-4" />}
                className="mb-0"
              />
            </div>
            <BillList
              bills={visibleBills}
              type="internet"
              currency={currency}
              onEdit={(bill) => openBillForm("internet", bill)}
              onDelete={(bill) =>
                setDeleteTarget({ kind: "bill", id: bill.id, label: bill.title })
              }
              emptyTitle="No internet bills yet"
              emptyDescription="Add your monthly internet bill to keep the record complete."
            />
          </Card>
        </>
      ) : null}

      {tab === "monthly_due" ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="HOA dues shown"
              value={String(visibleBills.length)}
              hint="Filtered records"
              icon={<Repeat className="h-4 w-4" />}
              tone="slate"
            />
            <StatCard
              label={`Total ${scopeYear}`}
              value={formatCompactCurrency(yearlyTotal, currency)}
              hint="HOA monthly dues"
              icon={<CalendarDays className="h-4 w-4" />}
              tone="green"
            />
            <StatCard
              label="Paid shown"
              value={formatCompactCurrency(visiblePaid, currency)}
              hint="Settled obligations"
              icon={<ReceiptText className="h-4 w-4" />}
              tone="blue"
            />
            <StatCard
              label="Remaining shown"
              value={formatCompactCurrency(visibleUnpaid, currency)}
              hint="Still to pay"
              icon={<Wallet className="h-4 w-4" />}
              tone="rose"
            />
          </div>
          <Card className="p-0">
            <div className="p-4 pb-3">
              <CardHeader
                title="HOA monthly due"
                description="Homeowners association dues only — ₱200 expected per month"
                icon={<Repeat className="h-4 w-4" />}
                className="mb-0"
              />
            </div>
            <BillList
              bills={visibleBills}
              type="monthly_due"
              currency={currency}
              onEdit={(bill) => openBillForm("monthly_due", bill)}
              onDelete={(bill) =>
                setDeleteTarget({ kind: "bill", id: bill.id, label: bill.title })
              }
              emptyTitle="No HOA dues yet"
              emptyDescription="Record your HOA monthly due so the expected ₱200 is tracked each month."
            />
          </Card>
        </>
      ) : null}

      {isOnlineTab ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Purchases shown"
              value={String(visibleBills.length)}
              hint="Filtered records"
              icon={tab === "shopee" ? <ShoppingBag className="h-4 w-4" /> : <Store className="h-4 w-4" />}
              tone="rose"
            />
            <StatCard
              label="Purchase totals"
              value={formatCompactCurrency(visibleTotal, currency)}
              hint="Actual order amounts"
              icon={<Wallet className="h-4 w-4" />}
              tone="amber"
            />
            <StatCard
              label="Unpaid shown"
              value={formatCompactCurrency(visibleUnpaid, currency)}
              hint="Still to settle"
              icon={<ReceiptText className="h-4 w-4" />}
              tone="rose"
            />
            <StatCard
              label={`Total ${scopeYear}`}
              value={formatCompactCurrency(yearlyTotal, currency)}
              hint={`${yearlyBills.length} purchase(s)`}
              icon={<CalendarDays className="h-4 w-4" />}
              tone="violet"
            />
          </div>
          <Card className="p-0">
            <div className="p-4 pb-3">
              <CardHeader
                title={tab === "shopee" ? "Shopee purchases" : "TikTok Shop purchases"}
                description="Orders, installments, and payment status"
                icon={tab === "shopee" ? <ShoppingBag className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                className="mb-0"
              />
            </div>
            <BillList
              bills={visibleBills}
              type={tab === "shopee" ? "shopee" : "tiktok"}
              currency={currency}
              onEdit={(bill) => openBillForm(bill.type, bill)}
              onDelete={(bill) =>
                setDeleteTarget({ kind: "bill", id: bill.id, label: bill.title })
              }
              onPayInstallment={(bill) => void handlePayInstallment(bill)}
              emptyTitle="No purchases yet"
              emptyDescription="Add orders manually to monitor full payments and monthly installments."
            />
          </Card>
        </>
      ) : null}

      {tab === "rent" ? (
        <>
          <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-ink">Rent contributions</p>
              <p className="mt-0.5 text-xs text-muted">
                Expected contributions come from your household settings.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <MonthSelector value={rentPeriod} onChange={setRentPeriod} />
              <Button size="sm" onClick={() => openRentForm(null)}>
                <Plus className="h-4 w-4" /> Record payment
              </Button>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Expected"
              value={formatCompactCurrency(rentTotals.expected, currency)}
              hint={monthLabel(rentPeriod, "MMMM yyyy")}
              icon={<Home className="h-4 w-4" />}
              tone="green"
            />
            <StatCard
              label="Collected"
              value={formatCompactCurrency(rentTotals.collected, currency)}
              hint={`${periodPayments.length} payment(s)`}
              icon={<Wallet className="h-4 w-4" />}
              tone="blue"
            />
            <StatCard
              label="Remaining"
              value={formatCompactCurrency(rentTotals.remaining, currency)}
              hint="To collect"
              icon={<ReceiptText className="h-4 w-4" />}
              tone="rose"
            />
            <StatCard
              label="Members"
              value={String(members.length)}
              hint="Household contributors"
              icon={<CalendarDays className="h-4 w-4" />}
              tone="violet"
            />
          </div>

          {members.length === 0 ? (
            <EmptyState
              icon={<Home className="h-5 w-5" />}
              title="No household members yet"
              description="Add members and their monthly rent contributions in Settings to begin."
              action={
                <Link href="/settings">
                  <Button size="sm" variant="outline">
                    Open settings
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {memberRows.map((row) => {
                const status = rentStatus(row.expected, row.collected);
                const progress =
                  row.expected > 0 ? Math.min((row.collected / row.expected) * 100, 100) : 0;
                return (
                  <Card key={row.member.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-extrabold text-ink">{row.member.name}</p>
                        <p className="text-[11px] text-muted">
                          Expected {formatCurrency(row.expected, currency)}
                        </p>
                      </div>
                      <StatusBadge status={status} />
                    </div>
                    <div className="mt-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                        Collected
                      </p>
                      <p className="text-lg font-extrabold text-ink">
                        {formatCurrency(row.collected, currency)}
                      </p>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background">
                        <div
                          className={`h-full rounded-full ${
                            status === "paid" ? "bg-success" : "bg-primary-500"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-muted">
                        {row.remaining > 0
                          ? `${formatCurrency(row.remaining, currency)} remaining`
                          : "Fully paid"}
                      </p>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        onClick={() =>
                          openRentForm(null, row.member.id, row.member.contribution)
                        }
                      >
                        <Plus className="h-3.5 w-3.5" /> Add payment
                      </Button>
                      <Link href="/settings">
                        <Button size="sm" variant="ghost" title="Edit contribution in settings">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="p-0">
            <div className="p-4 pb-3">
              <CardHeader
                title={`Payments for ${monthLabel(rentPeriod, "MMMM yyyy")}`}
                description="Partial and multiple payments are recorded separately"
                icon={<Home className="h-4 w-4" />}
                className="mb-0"
              />
            </div>
            {periodPayments.length === 0 ? (
              <div className="p-4 pt-0">
                <EmptyState
                  icon={<Home className="h-5 w-5" />}
                  title="No rent payments this month"
                  description="Record a contribution from any household member. Payment dates are saved automatically."
                />
              </div>
            ) : (
              <div className="divide-y divide-line">
                {periodPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                      <Home className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink">{payment.memberName}</p>
                      <p className="text-[11px] text-muted">
                        {payment.paymentDate
                          ? formatDateTime(payment.paymentDate)
                          : formatDate(payment.createdAt)}
                        {payment.notes ? ` · ${payment.notes}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-ink">
                        {formatCurrency(payment.amountPaid, currency)}
                      </p>
                      <p className="text-[10px] text-muted">
                        of {formatCurrency(payment.expectedAmount, currency)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openRentForm(payment)}
                        className="rounded-lg p-1.5 text-muted transition hover:bg-primary-50 hover:text-primary-700"
                        aria-label="Edit rent payment"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({
                            kind: "rent",
                            id: payment.id,
                            label: `${payment.memberName} rent payment`,
                          })
                        }
                        className="rounded-lg p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger"
                        aria-label="Delete rent payment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : null}

      <BillFormModal
        key={`${formType}-${editingBill?.id ?? "new"}-${formOpen ? "open" : "closed"}`}
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingBill(null);
        }}
        type={formType}
        bill={editingBill}
        onSaved={reload}
      />

      <RentPaymentModal
        key={`${editingRent?.id ?? "new"}-${rentDefaults.memberId ?? "any"}-${rentModalOpen ? "open" : "closed"}`}
        open={rentModalOpen}
        onClose={() => {
          setRentModalOpen(false);
          setEditingRent(null);
        }}
        payment={editingRent}
        members={members}
        defaultMemberId={rentDefaults.memberId}
        defaultPeriod={rentPeriod}
        defaultExpected={rentDefaults.expected}
        onSaved={reload}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget?.kind === "bill" ? "Delete this bill?" : "Delete this rent payment?"}
        message={`"${deleteTarget?.label ?? ""}" will be permanently removed. This cannot be undone.`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        busy={deleting}
      />
    </div>
  );
}
