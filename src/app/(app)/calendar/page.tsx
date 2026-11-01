"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Droplets,
  FileText,
  Home,
  ReceiptText,
  Repeat,
  ShoppingBag,
  Store,
  Wifi,
  Zap,
} from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardHeader } from "@/components/common/card";
import { MonthSelector } from "@/components/common/month-selector";
import { StatusBadge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { StatCard } from "@/components/common/stat-card";
import { resolveBillStatus } from "@/lib/calculations";
import { currentMonthKey, daysUntil, formatDate, monthLabel } from "@/lib/dates";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Bill, BillType, RentPayment } from "@/types";

type EventSource = "bill" | "rent";

interface CalendarEvent {
  key: string;
  source: EventSource;
  date: string;
  title: string;
  amount: number;
  status: string;
  type?: BillType;
  bill?: Bill;
  rent?: RentPayment;
}

const typeIcons: Record<BillType, typeof Zap> = {
  meralco: Zap,
  water: Droplets,
  internet: Wifi,
  monthly_due: Repeat,
  shopee: ShoppingBag,
  tiktok: Store,
};

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function statusChipClass(status: string): string {
  if (status === "paid" || status === "completed") {
    return "border-success/25 bg-success/10 text-success";
  }
  if (status === "overdue") return "border-danger/25 bg-danger/10 text-danger";
  if (status === "partial") return "border-warning/30 bg-warning/10 text-[#9a6b22]";
  return "border-primary-200 bg-primary-50 text-primary-800";
}

export default function CalendarPage() {
  const { profile, bills, rentPayments } = useData();
  const currency = profile?.currency ?? "PHP";
  const [month, setMonth] = useState(currentMonthKey());
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const events = useMemo<CalendarEvent[]>(() => {
    const billEvents: CalendarEvent[] = bills
      .filter((bill) => Boolean(bill.dueDate))
      .map((bill) => ({
        key: `bill-${bill.id}`,
        source: "bill",
        date: bill.dueDate,
        title: bill.title,
        amount: bill.amount,
        status: resolveBillStatus(bill),
        type: bill.type,
        bill,
      }));
    const rentEvents: CalendarEvent[] = rentPayments
      .filter((payment) => Boolean(payment.paymentDate))
      .map((payment) => ({
        key: `rent-${payment.id}`,
        source: "rent",
        date: (payment.paymentDate ?? "").slice(0, 10),
        title: `Rent — ${payment.memberName}`,
        amount: payment.amountPaid,
        status: payment.status,
        rent: payment,
      }));
    return [...billEvents, ...rentEvents];
  }, [bills, rentPayments]);

  const monthStart = parseISO(`${month}-01`);
  const calendarStart = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const monthBills = bills.filter((bill) => (bill.billingPeriod || "").slice(0, 7) === month);
  const dueThisMonth = monthBills.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0);
  const paidThisMonth = monthBills
    .filter((bill) => resolveBillStatus(bill) === "paid")
    .reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0);
  const overdueCount = bills.filter((bill) => resolveBillStatus(bill) === "overdue").length;

  const selectedEvents = events
    .filter((event) => event.date === selectedDate)
    .sort((a, b) => a.amount - b.amount);

  const upcoming = useMemo(
    () =>
      bills
        .filter((bill) => resolveBillStatus(bill) !== "paid" && bill.dueDate)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 6),
    [bills],
  );

  const selectedEventDetails = selectedEvent
    ? selectedEvent.bill
      ? {
          title: selectedEvent.bill.title,
          category: selectedEvent.bill.category ?? selectedEvent.bill.type,
          period: selectedEvent.bill.billingPeriod,
          amount: selectedEvent.bill.amount,
          paid: selectedEvent.bill.paidAmount,
          dueDate: selectedEvent.bill.dueDate,
          paidDate: selectedEvent.bill.paidDate,
          status: resolveBillStatus(selectedEvent.bill),
          receiptUrl: selectedEvent.bill.receiptUrl,
          notes: selectedEvent.bill.notes,
          link: `/bills?tab=${selectedEvent.bill.type}`,
        }
      : selectedEvent.rent
        ? {
            title: `Rent — ${selectedEvent.rent.memberName}`,
            category: "Rent contribution",
            period: selectedEvent.rent.billingPeriod,
            amount: selectedEvent.rent.amountPaid,
            paid: selectedEvent.rent.amountPaid,
            dueDate: "",
            paidDate: selectedEvent.rent.paymentDate,
            status: selectedEvent.rent.status,
            receiptUrl: "",
            notes: selectedEvent.rent.notes,
            link: "/bills?tab=rent",
          }
        : null
    : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payment calendar"
        subtitle="See every due date at a glance. Bills are never marked paid automatically."
        actions={<MonthSelector value={month} onChange={setMonth} />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Due this month"
          value={formatCurrency(dueThisMonth, currency)}
          hint={monthLabel(month, "MMMM yyyy")}
          icon={<ReceiptText className="h-4 w-4" />}
          tone="amber"
        />
        <StatCard
          label="Paid this month"
          value={formatCurrency(paidThisMonth, currency)}
          hint={`${monthBills.filter((bill) => resolveBillStatus(bill) === "paid").length} paid bill(s)`}
          icon={<CircleDollarSign className="h-4 w-4" />}
          tone="green"
        />
        <StatCard
          label="Overdue bills"
          value={String(overdueCount)}
          hint="Across all months"
          icon={<Clock3 className="h-4 w-4" />}
          tone="rose"
        />
        <StatCard
          label="Scheduled events"
          value={String(events.filter((event) => event.date.slice(0, 7) === month).length)}
          hint="Due dates and payments"
          icon={<CalendarDays className="h-4 w-4" />}
          tone="violet"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-ink">{monthLabel(month, "MMMM yyyy")}</h2>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-muted">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-success" /> Paid
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-primary-500" /> Unpaid
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-warning" /> Partial
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-danger" /> Overdue
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => (
              <div
                key={day}
                className="pb-1 text-center text-[10px] font-bold uppercase tracking-wide text-muted"
              >
                {day}
              </div>
            ))}
            {days.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayEvents = events.filter((event) => event.date === dateKey);
              const isSelected = selectedDate === dateKey;
              const inMonth = isSameMonth(day, monthStart);
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={dateKey}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedDate(dateKey)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedDate(dateKey);
                    }
                  }}
                  className={cn(
                    "min-h-[78px] cursor-pointer rounded-lg border p-1 transition sm:min-h-[92px] sm:p-1.5",
                    inMonth ? "bg-surface" : "bg-background/50",
                    isSelected
                      ? "border-primary-500 ring-2 ring-primary-100"
                      : "border-line/70 hover:border-primary-300",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                      isToday
                        ? "bg-primary-600 text-white"
                        : inMonth
                          ? "text-ink"
                          : "text-muted/60",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map((event) => (
                      <button
                        key={event.key}
                        type="button"
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          setSelectedDate(dateKey);
                          setSelectedEvent(event);
                        }}
                        className={cn(
                          "block w-full truncate rounded border px-1 py-0.5 text-left text-[9px] font-bold leading-tight",
                          statusChipClass(event.status),
                        )}
                        title={`${event.title} — ${formatCurrency(event.amount, currency)}`}
                      >
                        {event.title}
                      </button>
                    ))}
                    {dayEvents.length > 2 ? (
                      <p className="pl-1 text-[9px] font-semibold text-muted">
                        +{dayEvents.length - 2} more
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title={formatDate(selectedDate, "EEEE, MMM d")}
              description={`${selectedEvents.length} event(s) on this day`}
              icon={<CalendarDays className="h-4 w-4" />}
            />
            {selectedEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-background/60 px-4 py-8 text-center">
                <p className="text-xs font-semibold text-muted">Nothing scheduled</p>
                <p className="mt-1 text-[11px] text-muted/80">
                  Pick another day or add a bill with this due date.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {selectedEvents.map((event) => (
                  <li key={event.key}>
                    <button
                      type="button"
                      onClick={() => setSelectedEvent(event)}
                      className="flex w-full items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-left transition hover:border-primary-200 hover:bg-primary-50/40"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-muted">
                        {event.source === "rent" ? (
                          <Home className="h-4 w-4" />
                        ) : event.type ? (
                          (() => {
                            const Icon = typeIcons[event.type];
                            return <Icon className="h-4 w-4" />;
                          })()
                        ) : (
                          <ReceiptText className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-ink">{event.title}</p>
                        <p className="text-[10px] text-muted">
                          {formatCurrency(event.amount, currency)}
                        </p>
                      </div>
                      <StatusBadge status={event.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Next up"
              description="Unpaid bills by due date"
              icon={<Clock3 className="h-4 w-4" />}
              action={
                <Link href="/bills" className="text-[11px] font-bold text-primary-700 hover:underline">
                  Bills
                </Link>
              }
            />
            {upcoming.length === 0 ? (
              <p className="rounded-xl bg-background px-3 py-4 text-center text-xs font-semibold text-muted">
                No unpaid bills. Nice work.
              </p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((bill) => {
                  const days = daysUntil(bill.dueDate);
                  return (
                    <li key={bill.id}>
                      <Link
                        href={`/bills?tab=${bill.type}`}
                        className="flex items-center justify-between gap-2 rounded-xl px-2 py-2 transition hover:bg-primary-50/50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-ink">{bill.title}</p>
                          <p
                            className={cn(
                              "text-[10px] font-semibold",
                              days < 0
                                ? "text-danger"
                                : days <= 7
                                  ? "text-warning"
                                  : "text-muted",
                            )}
                          >
                            {formatDate(bill.dueDate, "MMM d")} ·{" "}
                            {days < 0
                              ? `${Math.abs(days)}d overdue`
                              : days === 0
                                ? "today"
                                : `in ${days}d`}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] font-extrabold text-ink">
                          {formatCurrency(bill.amount, currency)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={Boolean(selectedEventDetails)}
        onClose={() => setSelectedEvent(null)}
        title={selectedEventDetails?.title ?? "Event details"}
        description={selectedEventDetails ? `${selectedEventDetails.category} · ${monthLabel(selectedEventDetails.period, "MMMM yyyy")}` : undefined}
        footer={
          selectedEventDetails ? (
            <>
              <Button variant="ghost" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
              <Link href={selectedEventDetails.link}>
                <Button>
                  Manage <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </>
          ) : undefined
        }
      >
        {selectedEventDetails ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-background p-3">
                <p className="text-[10px] font-bold uppercase text-muted">Amount</p>
                <p className="mt-0.5 text-lg font-extrabold text-ink">
                  {formatCurrency(selectedEventDetails.amount, currency)}
                </p>
              </div>
              <div className="rounded-xl bg-background p-3">
                <p className="text-[10px] font-bold uppercase text-muted">Status</p>
                <div className="mt-1">
                  <StatusBadge status={selectedEventDetails.status} />
                </div>
              </div>
              <div className="rounded-xl bg-background p-3">
                <p className="text-[10px] font-bold uppercase text-muted">Due date</p>
                <p className="mt-0.5 text-xs font-bold text-ink">
                  {selectedEventDetails.dueDate
                    ? formatDate(selectedEventDetails.dueDate)
                    : "No due date"}
                </p>
              </div>
              <div className="rounded-xl bg-background p-3">
                <p className="text-[10px] font-bold uppercase text-muted">Paid date</p>
                <p className="mt-0.5 text-xs font-bold text-ink">
                  {selectedEventDetails.paidDate
                    ? formatDate(selectedEventDetails.paidDate)
                    : "Not paid yet"}
                </p>
              </div>
            </div>
            {selectedEventDetails.receiptUrl ? (
              <a
                href={selectedEventDetails.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-xs font-semibold text-primary-700 hover:bg-primary-50"
              >
                <FileText className="h-4 w-4" /> View attached receipt
              </a>
            ) : null}
            {selectedEventDetails.notes ? (
              <div className="rounded-xl bg-background p-3">
                <p className="text-[10px] font-bold uppercase text-muted">Notes</p>
                <p className="mt-1 text-xs leading-5 text-ink">{selectedEventDetails.notes}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
