"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Home,
  Minus,
  PiggyBank,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardHeader } from "@/components/common/card";
import { MonthSelector } from "@/components/common/month-selector";
import { StatCard } from "@/components/common/stat-card";
import { Button } from "@/components/common/button";
import {
  ExpenseBarChart,
  ExpenseLineChart,
  ExpensePieChart,
} from "@/components/charts/chart-card";
import {
  getDashboardTotals,
  installmentChargeForMonth,
  isInstallmentBill,
  shoppingListTotal,
} from "@/lib/calculations";
import { downloadCsv } from "@/lib/csv";
import { currentMonthKey, formatDate, lastNMonths, monthLabel, shiftMonth } from "@/lib/dates";
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
  percentChange,
} from "@/lib/format";
import { cn } from "@/lib/cn";
import type { DashboardTotals } from "@/types";

const categoryColors: Record<string, string> = {
  Groceries: "#8CBF9F",
  Meralco: "#E6A34B",
  Water: "#7FB6BA",
  Internet: "#A08CC4",
  Rent: "#6FA986",
  "HOA due": "#C9A66B",
  Shopee: "#D98E8E",
  "TikTok Shop": "#B78FB8",
};

export default function ReportsPage() {
  const { profile, bills, shoppingLists, rentPayments } = useData();
  const { toast } = useToast();
  const currency = profile?.currency ?? "PHP";
  const members = useMemo(() => profile?.members ?? [], [profile]);
  const contributions = useMemo(
    () => members.map((member) => member.contribution),
    [members],
  );

  const [month, setMonth] = useState(currentMonthKey());
  const [compareMonth, setCompareMonth] = useState(shiftMonth(currentMonthKey(), -1));

  const totalsFor = useCallback(
    (key: string): DashboardTotals =>
      getDashboardTotals(bills, shoppingLists, rentPayments, key, contributions),
    [bills, shoppingLists, rentPayments, contributions],
  );

  const current = useMemo(() => totalsFor(month), [totalsFor, month]);
  const previous = useMemo(() => totalsFor(compareMonth), [totalsFor, compareMonth]);

  const categories = useMemo(
    () => [
      { label: "Groceries", current: current.grocery, previous: previous.grocery },
      { label: "Meralco", current: current.electricity, previous: previous.electricity },
      { label: "Water", current: current.water, previous: previous.water },
      { label: "Internet", current: current.internet, previous: previous.internet },
      { label: "Rent", current: current.rentExpected, previous: previous.rentExpected },
      { label: "HOA due", current: current.monthlyDues, previous: previous.monthlyDues },
      { label: "Shopee", current: current.shopee, previous: previous.shopee },
      { label: "TikTok Shop", current: current.tiktok, previous: previous.tiktok },
    ],
    [current, previous],
  );

  const pieData = categories.map((category) => ({
    name: category.label,
    value: category.current,
    color: categoryColors[category.label],
  }));

  const trendMonths = lastNMonths(month, 6);
  const trendData = trendMonths.map((key) => {
    const entry = totalsFor(key);
    return {
      month: monthLabel(key, "MMM"),
      total: entry.total,
      paid: entry.paid,
    };
  });

  const groceryData = trendMonths.map((key) => ({
    month: monthLabel(key, "MMM"),
    grocery: shoppingLists
      .filter((list) => list.shoppingDate.slice(0, 7) === key)
      .reduce((sum, list) => sum + shoppingListTotal(list), 0),
  }));

  const utilityMonths = trendMonths;
  const meralcoData = utilityMonths.map((key) => {
    const entries = bills.filter((bill) => bill.type === "meralco" && bill.billingPeriod === key);
    return {
      month: monthLabel(key, "MMM"),
      consumption: entries.reduce((sum, bill) => sum + (Number(bill.consumption) || 0), 0),
      bill: entries.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0),
    };
  });
  const waterData = utilityMonths.map((key) => {
    const entries = bills.filter((bill) => bill.type === "water" && bill.billingPeriod === key);
    return {
      month: monthLabel(key, "MMM"),
      consumption: entries.reduce((sum, bill) => sum + (Number(bill.consumption) || 0), 0),
      bill: entries.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0),
    };
  });

  const onlineData = utilityMonths.map((key) => {
    const monthBills = bills.filter(
      (bill) =>
        (bill.type === "shopee" || bill.type === "tiktok") &&
        (bill.billingPeriod === key || isInstallmentBill(bill)),
    );
    return {
      month: monthLabel(key, "MMM"),
      shopee: monthBills
        .filter((bill) => bill.type === "shopee")
        .reduce((sum, bill) => sum + installmentChargeForMonth(bill, key), 0),
      tiktok: monthBills
        .filter((bill) => bill.type === "tiktok")
        .reduce((sum, bill) => sum + installmentChargeForMonth(bill, key), 0),
    };
  });

  const rentData = members.map((member) => {
    const collected = rentPayments
      .filter(
        (payment) =>
          payment.billingPeriod === month && payment.memberId === member.id,
      )
      .reduce((sum, payment) => sum + (Number(payment.amountPaid) || 0), 0);
    return {
      member: member.name,
      expected: member.contribution,
      collected,
    };
  });

  const year = Number(month.slice(0, 4));
  const previousYear = year - 1;

  const yearTotals = (targetYear: number) => {
    const yearBills = bills.filter((bill) => bill.billingPeriod.startsWith(String(targetYear)));
    const yearLists = shoppingLists.filter((list) =>
      (list.shoppingDate || "").startsWith(String(targetYear)),
    );
    const yearRent = rentPayments.filter((payment) =>
      payment.billingPeriod.startsWith(String(targetYear)),
    );
    const sumType = (type: string) => {
      if (type === "shopee" || type === "tiktok") {
        return bills
          .filter((bill) => bill.type === type)
          .reduce((sum, bill) => {
            let value = 0;
            for (let index = 1; index <= 12; index += 1) {
              value += installmentChargeForMonth(
                bill,
                `${targetYear}-${String(index).padStart(2, "0")}`,
              );
            }
            return sum + value;
          }, 0);
      }
      return yearBills
        .filter((bill) => bill.type === type)
        .reduce((sum, bill) => sum + bill.amount, 0);
    };
    const grocery = yearLists.reduce((sum, list) => sum + shoppingListTotal(list), 0);
    const rent = yearRent.reduce((sum, payment) => sum + payment.amountPaid, 0);
    const rows = [
      { label: "Groceries", value: grocery },
      { label: "Meralco", value: sumType("meralco") },
      { label: "Water", value: sumType("water") },
      { label: "Internet", value: sumType("internet") },
      { label: "Rent collected", value: rent },
      { label: "HOA due", value: sumType("monthly_due") },
      { label: "Shopee", value: sumType("shopee") },
      { label: "TikTok Shop", value: sumType("tiktok") },
    ];
    return {
      rows,
      total: rows.reduce((sum, row) => sum + row.value, 0),
    };
  };

  const yearCurrent = yearTotals(year);
  const yearPrevious = yearTotals(previousYear);
  const yearlyChange = percentChange(yearCurrent.total, yearPrevious.total);

  const totalChange = percentChange(current.total, previous.total);

  const exportReport = () => {
    downloadCsv(
      `expensyyy-report-${month}.csv`,
      ["Category", `${monthLabel(month, "MMM yyyy")}`, `${monthLabel(compareMonth, "MMM yyyy")}`, "Change %"],
      categories.map((category) => [
        category.label,
        formatCurrency(category.current, currency),
        formatCurrency(category.previous, currency),
        formatPercent(percentChange(category.current, category.previous)),
      ]),
    );
    toast("Monthly report exported as CSV.");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        subtitle="Compare months, spot trends, and understand where your money goes."
        actions={
          <Button size="sm" variant="outline" onClick={exportReport}>
            <Download className="h-4 w-4" /> Export report
          </Button>
        }
      />

      <Card className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Reporting month</p>
          <MonthSelector
            value={month}
            onChange={(value) => {
              setMonth(value);
              setCompareMonth(shiftMonth(value, -1));
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Compare with</p>
          <MonthSelector value={compareMonth} onChange={setCompareMonth} />
        </div>
        <div className="text-xs text-muted">
          Comparing <span className="font-bold text-ink">{monthLabel(month, "MMM yyyy")}</span> with{" "}
          <span className="font-bold text-ink">{monthLabel(compareMonth, "MMM yyyy")}</span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={monthLabel(month, "MMM yyyy")}
          value={formatCompactCurrency(current.total, currency)}
          hint="Total expenses"
          icon={<Wallet className="h-4 w-4" />}
          tone="green"
        />
        <StatCard
          label={monthLabel(compareMonth, "MMM yyyy")}
          value={formatCompactCurrency(previous.total, currency)}
          hint="Comparison month"
          icon={<ReceiptText className="h-4 w-4" />}
          tone="slate"
        />
        <StatCard
          label="Change"
          value={formatPercent(totalChange)}
          hint={totalChange !== null && totalChange > 0 ? "Spending increased" : totalChange !== null && totalChange < 0 ? "Spending decreased" : "No baseline"}
          icon={
            totalChange !== null && totalChange < 0 ? (
              <ArrowDownRight className="h-4 w-4" />
            ) : (
              <ArrowUpRight className="h-4 w-4" />
            )
          }
          tone={totalChange !== null && totalChange > 0 ? "rose" : "blue"}
        />
        <StatCard
          label="Paid"
          value={formatCompactCurrency(current.paid, currency)}
          hint={`${current.total > 0 ? Math.round((current.paid / current.total) * 100) : 0}% of expenses`}
          icon={<PiggyBank className="h-4 w-4" />}
          tone="violet"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ExpenseLineChart
            title="Monthly total expense"
            description="Total and paid amounts over six months"
            data={trendData}
            xKey="month"
            series={[
              { key: "total", label: "Total", color: "#6FA986" },
              { key: "paid", label: "Paid", color: "#7FB6BA" },
            ]}
          />
        </div>
        <ExpensePieChart
          title="Expense categories"
          description={monthLabel(month, "MMMM yyyy")}
          data={pieData}
        />
      </div>

      <Card>
        <CardHeader
          title="Month comparison"
          description="Category totals with percentage change"
          icon={<ReceiptText className="h-4 w-4" />}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead className="border-b border-line text-[10px] uppercase tracking-wide text-muted">
              <tr>
                <th className="py-2 font-bold">Category</th>
                <th className="py-2 text-right font-bold">{monthLabel(month, "MMM yyyy")}</th>
                <th className="py-2 text-right font-bold">{monthLabel(compareMonth, "MMM yyyy")}</th>
                <th className="py-2 text-right font-bold">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {categories.map((category) => {
                const change = percentChange(category.current, category.previous);
                return (
                  <tr key={category.label}>
                    <td className="py-2.5">
                      <span className="flex items-center gap-2 text-xs font-bold text-ink">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: categoryColors[category.label] }}
                        />
                        {category.label}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-xs font-semibold text-ink">
                      {formatCurrency(category.current, currency)}
                    </td>
                    <td className="py-2.5 text-right text-xs text-muted">
                      {formatCurrency(category.previous, currency)}
                    </td>
                    <td className="py-2.5 text-right">
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 text-[11px] font-bold",
                          change === null
                            ? "text-muted"
                            : change > 0
                              ? "text-danger"
                              : change < 0
                                ? "text-success"
                                : "text-muted",
                        )}
                      >
                        {change === null ? (
                          <Minus className="h-3 w-3" />
                        ) : change > 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : change < 0 ? (
                          <ArrowDownRight className="h-3 w-3" />
                        ) : (
                          <Minus className="h-3 w-3" />
                        )}
                        {formatPercent(change)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <ExpenseBarChart
          title="Grocery spending"
          description="Shopping list totals per month"
          data={groceryData}
          xKey="month"
          series={[{ key: "grocery", label: "Groceries", color: "#8CBF9F" }]}
          height={230}
        />
        <ExpenseBarChart
          title="Meralco consumption"
          description="kWh used per month"
          data={meralcoData}
          xKey="month"
          series={[{ key: "consumption", label: "kWh", color: "#E6A34B" }]}
          currency={false}
          height={230}
          emptyMessage="No Meralco readings yet"
        />
        <ExpenseBarChart
          title="Water consumption"
          description="Cubic meters per month"
          data={waterData}
          xKey="month"
          series={[{ key: "consumption", label: "m³", color: "#7FB6BA" }]}
          currency={false}
          height={230}
          emptyMessage="No water readings yet"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ExpenseBarChart
          title="Meralco bill comparison"
          description="Monthly electricity cost"
          data={meralcoData}
          xKey="month"
          series={[{ key: "bill", label: "Meralco", color: "#E6A34B" }]}
          height={230}
          emptyMessage="No Meralco bills yet"
        />
        <ExpenseBarChart
          title="Water bill comparison"
          description="Monthly water cost"
          data={waterData}
          xKey="month"
          series={[{ key: "bill", label: "Water", color: "#7FB6BA" }]}
          height={230}
          emptyMessage="No water bills yet"
        />
        <ExpenseBarChart
          title="Shopee vs TikTok Shop"
          description="Monthly online shopping spend"
          data={onlineData}
          xKey="month"
          series={[
            { key: "shopee", label: "Shopee", color: "#D98E8E" },
            { key: "tiktok", label: "TikTok", color: "#B78FB8" },
          ]}
          height={230}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ExpenseBarChart
          title="Rent contribution comparison"
          description={monthLabel(month, "MMMM yyyy")}
          data={rentData}
          xKey="member"
          series={[
            { key: "expected", label: "Expected", color: "#B5D7BF" },
            { key: "collected", label: "Collected", color: "#6FA986" },
          ]}
          height={230}
          emptyMessage="Add household members in Settings"
        />

        <Card>
          <CardHeader
            title={`Year comparison · ${year} vs ${previousYear}`}
            description={`Total spending changed ${formatPercent(yearlyChange)}`}
            icon={<Home className="h-4 w-4" />}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-[10px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2 font-bold">Category</th>
                  <th className="py-2 text-right font-bold">{year}</th>
                  <th className="py-2 text-right font-bold">{previousYear}</th>
                  <th className="py-2 text-right font-bold">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {yearCurrent.rows.map((row, index) => {
                  const before = yearPrevious.rows[index]?.value ?? 0;
                  const change = percentChange(row.value, before);
                  return (
                    <tr key={row.label}>
                      <td className="py-2 text-xs font-semibold text-ink">{row.label}</td>
                      <td className="py-2 text-right text-xs font-bold text-ink">
                        {formatCompactCurrency(row.value, currency)}
                      </td>
                      <td className="py-2 text-right text-xs text-muted">
                        {formatCompactCurrency(before, currency)}
                      </td>
                      <td
                        className={cn(
                          "py-2 text-right text-[11px] font-bold",
                          change === null
                            ? "text-muted"
                            : change > 0
                              ? "text-danger"
                              : change < 0
                                ? "text-success"
                                : "text-muted",
                        )}
                      >
                        {formatPercent(change)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-background/60">
                  <td className="py-2 text-xs font-extrabold text-ink">Total</td>
                  <td className="py-2 text-right text-xs font-extrabold text-ink">
                    {formatCurrency(yearCurrent.total, currency)}
                  </td>
                  <td className="py-2 text-right text-xs font-semibold text-muted">
                    {formatCurrency(yearPrevious.total, currency)}
                  </td>
                  <td className="py-2 text-right text-[11px] font-extrabold text-ink">
                    {formatPercent(yearlyChange)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[10px] text-muted">
            Generated {formatDate(new Date().toISOString())} · Rent uses collected payments for the
            year comparison.
          </p>
        </Card>
      </div>
    </div>
  );
}
