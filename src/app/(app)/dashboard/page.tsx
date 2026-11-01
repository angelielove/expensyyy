"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarCheck2,
  CreditCard,
  Droplets,
  Home,
  PiggyBank,
  Plus,
  ReceiptText,
  Repeat,
  ShoppingBag,
  ShoppingBasket,
  Store,
  TrendingDown,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { Card, CardHeader } from "@/components/common/card";
import { MonthSelector } from "@/components/common/month-selector";
import { StatusBadge } from "@/components/common/badge";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/common/button";
import { ExpenseAreaChart } from "@/components/charts/chart-card";
import {
  getDashboardTotals,
  resolveBillStatus,
  toTransactions,
} from "@/lib/calculations";
import { formatCurrency, formatCompactCurrency } from "@/lib/format";
import {
  currentMonthKey,
  daysUntil,
  formatDate,
  lastNMonths,
  monthLabel,
} from "@/lib/dates";
import type { BillType } from "@/types";

const typeMeta: Record<
  BillType,
  { label: string; icon: typeof Zap; tone: "green" | "blue" | "amber" | "rose" | "violet" | "slate" }
> = {
  meralco: { label: "Meralco", icon: Zap, tone: "amber" },
  water: { label: "Water", icon: Droplets, tone: "blue" },
  internet: { label: "Internet", icon: Wifi, tone: "violet" },
  monthly_due: { label: "HOA due", icon: Repeat, tone: "slate" },
  shopee: { label: "Shopee", icon: ShoppingBag, tone: "rose" },
  tiktok: { label: "TikTok Shop", icon: Store, tone: "rose" },
};

function dueLabel(dueDate: string): { text: string; className: string } {
  const days = daysUntil(dueDate);
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, className: "text-danger" };
  if (days === 0) return { text: "Due today", className: "text-danger" };
  if (days === 1) return { text: "Due tomorrow", className: "text-warning" };
  if (days <= 7) return { text: `In ${days} days`, className: "text-warning" };
  return { text: formatDate(dueDate, "MMM d"), className: "text-muted" };
}

export default function DashboardPage() {
  const { profile, bills, shoppingLists, rentPayments, groceries, priceHistory } = useData();
  const currency = profile?.currency ?? "PHP";
  const [month, setMonth] = useState(currentMonthKey());

  const contributions = useMemo(
    () => (profile?.members ?? []).map((member) => member.contribution),
    [profile],
  );

  const totals = useMemo(
    () => getDashboardTotals(bills, shoppingLists, rentPayments, month, contributions),
    [bills, shoppingLists, rentPayments, month, contributions],
  );

  const chartData = useMemo(
    () =>
      lastNMonths(month, 6).map((key) => {
        const monthTotals = getDashboardTotals(
          bills,
          shoppingLists,
          rentPayments,
          key,
          contributions,
        );
        return {
          month: monthLabel(key, "MMM"),
          total: monthTotals.total,
          paid: monthTotals.paid,
        };
      }),
    [bills, shoppingLists, rentPayments, month, contributions],
  );

  const upcoming = useMemo(
    () =>
      bills
        .filter((bill) => resolveBillStatus(bill) !== "paid" && bill.dueDate)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 5),
    [bills],
  );

  const recent = useMemo(
    () => toTransactions(bills, shoppingLists, rentPayments).slice(0, 6),
    [bills, shoppingLists, rentPayments],
  );

  const isEmpty =
    bills.length === 0 && shoppingLists.length === 0 && rentPayments.length === 0 && groceries.length === 0;

  const utilityRows = [
    { label: "Meralco", value: totals.electricity, icon: Zap, color: "bg-warning", href: "/bills?tab=meralco" },
    { label: "Water", value: totals.water, icon: Droplets, color: "bg-[#7FB6BA]", href: "/bills?tab=water" },
    { label: "Internet", value: totals.internet, icon: Wifi, color: "bg-[#A08CC4]", href: "/bills?tab=internet" },
  ];
  const maxUtility = Math.max(...utilityRows.map((row) => row.value), 1);

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          profile?.displayName
            ? `Hi, ${profile.displayName.split(" ")[0]}`
            : "Your dashboard"
        }
        subtitle="Here is a clear look at your household spending."
        actions={
          <>
            <MonthSelector value={month} onChange={setMonth} />
            <Link href="/bills">
              <Button size="sm" variant="secondary">
                <Plus className="h-4 w-4" /> Add expense
              </Button>
            </Link>
          </>
        }
      />

      {isEmpty ? (
        <Card className="border-primary-200 bg-gradient-to-br from-primary-50 to-surface">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-primary-600 shadow-soft">
                <PiggyBank className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-ink">Let&apos;s set up your first month</h2>
                <p className="mt-1 max-w-xl text-xs leading-5 text-muted">
                  Add a grocery item, record a bill, or log a rent contribution. Every number
                  on this dashboard will update automatically from your own records.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/grocery?new=1">
                <Button size="sm">
                  <ShoppingBasket className="h-4 w-4" /> Add grocery
                </Button>
              </Link>
              <Link href="/bills?new=meralco">
                <Button size="sm" variant="outline">
                  <ReceiptText className="h-4 w-4" /> Add bill
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total expenses"
          value={formatCompactCurrency(totals.total, currency)}
          hint={monthLabel(month, "MMMM yyyy")}
          icon={<Wallet className="h-4 w-4" />}
          tone="green"
        />
        <StatCard
          label="Paid"
          value={formatCompactCurrency(totals.paid, currency)}
          hint={`${totals.total > 0 ? Math.round((totals.paid / totals.total) * 100) : 0}% of total`}
          icon={<CalendarCheck2 className="h-4 w-4" />}
          tone="blue"
        />
        <StatCard
          label="Unpaid"
          value={formatCompactCurrency(totals.unpaid, currency)}
          hint="Remaining balance"
          icon={<CreditCard className="h-4 w-4" />}
          tone="rose"
        />
        <StatCard
          label="Groceries"
          value={formatCompactCurrency(totals.grocery, currency)}
          hint={`${shoppingLists.filter((list) => list.shoppingDate.slice(0, 7) === month).length} shopping list(s)`}
          icon={<ShoppingBasket className="h-4 w-4" />}
          tone="amber"
        />
        <StatCard
          label="Utilities"
          value={formatCompactCurrency(totals.utilities, currency)}
          hint="Meralco + water + internet"
          icon={<Zap className="h-4 w-4" />}
          tone="violet"
        />
        <StatCard
          label="Rent collected"
          value={formatCompactCurrency(totals.rentCollected, currency)}
          hint={`of ${formatCurrency(totals.rentExpected, currency)} expected`}
          icon={<Home className="h-4 w-4" />}
          tone="green"
        />
        <StatCard
          label="Online shopping"
          value={formatCompactCurrency(totals.onlineShopping, currency)}
          hint="Shopee + TikTok Shop"
          icon={<ShoppingBag className="h-4 w-4" />}
          tone="rose"
        />
        <StatCard
          label="HOA due"
          value={formatCompactCurrency(totals.monthlyDues, currency)}
          hint="Expected ₱200 per month"
          icon={<Repeat className="h-4 w-4" />}
          tone="slate"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ExpenseAreaChart
            title="Spending trend"
            description="Total expenses across the last 6 months"
            data={chartData}
            xKey="month"
            series={[{ key: "total", label: "Total spent", color: "#6FA986" }]}
            currency
          />
        </div>

        <Card>
          <CardHeader
            title="Upcoming payments"
            description="Bills that still need attention"
            icon={<CalendarCheck2 className="h-4 w-4" />}
            action={
              <Link href="/calendar" className="text-[11px] font-bold text-primary-700 hover:underline">
                Calendar
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarCheck2 className="h-5 w-5" />}
              title="You're all caught up"
              description="No unpaid bills with a due date right now."
              action={
                <Link href="/bills?new=meralco">
                  <Button size="sm" variant="outline">
                    Add a bill
                  </Button>
                </Link>
              }
            />
          ) : (
            <ul className="space-y-2">
              {upcoming.map((bill) => {
                const meta = typeMeta[bill.type];
                const Icon = meta.icon;
                const due = dueLabel(bill.dueDate);
                return (
                  <li key={bill.id}>
                    <Link
                      href={`/bills?tab=${bill.type}`}
                      className="flex items-center gap-3 rounded-xl border border-line/70 px-3 py-2.5 transition hover:border-primary-200 hover:bg-primary-50/40"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-ink">{bill.title}</p>
                        <p className={`text-[11px] font-semibold ${due.className}`}>{due.text}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-extrabold text-ink">
                          {formatCurrency(bill.amount, currency)}
                        </p>
                        <StatusBadge status={resolveBillStatus(bill)} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent transactions"
            description="Your latest records across every category"
            icon={<ReceiptText className="h-4 w-4" />}
            action={
              <Link href="/history" className="text-[11px] font-bold text-primary-700 hover:underline">
                View all
              </Link>
            }
          />
          {recent.length === 0 ? (
            <EmptyState
              icon={<ReceiptText className="h-5 w-5" />}
              title="No transactions yet"
              description="Your newest bills, shopping lists, and rent payments will appear here."
            />
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((transaction) => {
                const isShopping = transaction.source === "shopping";
                const isRent = transaction.source === "rent";
                const meta = isShopping || isRent ? null : typeMeta[transaction.group as BillType];
                const Icon = isShopping
                  ? ShoppingBasket
                  : isRent
                    ? Home
                    : (meta?.icon ?? ReceiptText);
                return (
                  <li key={`${transaction.source}-${transaction.id}`} className="flex items-center gap-3 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-ink">{transaction.name}</p>
                      <p className="text-[11px] text-muted">
                        {monthLabel(transaction.billingPeriod, "MMM yyyy")} · {transaction.category}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <p className="text-xs font-extrabold text-ink">
                        {formatCurrency(transaction.amount, currency)}
                      </p>
                      <StatusBadge status={transaction.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Utility breakdown"
              description={monthLabel(month, "MMMM yyyy")}
              icon={<Zap className="h-4 w-4" />}
            />
            <div className="space-y-3">
              {utilityRows.map((row) => {
                const Icon = row.icon;
                return (
                  <Link key={row.label} href={row.href} className="block">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                        <Icon className="h-3.5 w-3.5" /> {row.label}
                      </span>
                      <span className="text-xs font-bold text-ink">
                        {formatCurrency(row.value, currency)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
                      <div
                        className={`h-full rounded-full ${row.color}`}
                        style={{ width: `${Math.max((row.value / maxUtility) * 100, row.value > 0 ? 6 : 0)}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="mt-4 rounded-xl bg-background px-3 py-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted">Total utilities</span>
                <span className="font-extrabold text-ink">
                  {formatCurrency(totals.utilities, currency)}
                </span>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-primary-50 to-surface">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-primary-700 shadow-soft">
                <TrendingDown className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">Price watch</h3>
                <p className="mt-0.5 text-[11px] leading-5 text-muted">
                  {priceHistory.length > 0
                    ? `${priceHistory.length} grocery price change${priceHistory.length === 1 ? "" : "s"} recorded. Latest: ${priceHistory[0].itemName} is now ${formatCurrency(priceHistory[0].newPrice, currency)}.`
                    : "Update a grocery price and Expensyyy saves the old price automatically."}
                </p>
                <Link
                  href="/grocery?tab=history"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary-700 hover:underline"
                >
                  View price history <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
