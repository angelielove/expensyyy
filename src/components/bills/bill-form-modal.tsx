"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, Info } from "lucide-react";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/common/button";
import { Field, Input, MoneyInput, Select, Textarea } from "@/components/common/input";
import { ReceiptField } from "@/components/common/receipt-field";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import { addBill, updateBill, type BillDraft } from "@/services/billService";
import { calculateMeralco, calculateWater } from "@/lib/calculations";
import { HOA_MONTHLY_DUE } from "@/lib/defaults";
import { formatCurrency, round2, toNumber } from "@/lib/format";
import { currentMonthKey, monthKeyFromDate, monthLabel, shiftMonth, todayDateInput } from "@/lib/dates";
import type { Bill, BillType, PaymentStatus, PurchaseType, ReceiptUpload } from "@/types";

interface BillFormModalProps {
  open: boolean;
  onClose: () => void;
  type: BillType;
  bill: Bill | null;
  onSaved: () => Promise<void> | void;
}

interface FormState {
  title: string;
  category: string;
  billingPeriod: string;
  billingDate: string;
  dueDate: string;
  amount: string;
  paidAmount: string;
  status: PaymentStatus;
  paidDate: string;
  notes: string;
  provider: string;
  orderDate: string;
  orderAmount: string;
  paymentMethod: string;
  purchaseType: PurchaseType;
  installmentMonths: string;
  installmentsPaid: string;
  previousReading: string;
  currentReading: string;
  ratePerKwh: string;
  minimumCharge: string;
  minimumConsumption: string;
  excessRate: string;
}

const typeTitles: Record<BillType, string> = {
  meralco: "Meralco bill",
  water: "Water bill",
  internet: "Internet bill",
  monthly_due: "HOA monthly due",
  shopee: "Shopee purchase",
  tiktok: "TikTok Shop purchase",
};

const nameLabels: Record<BillType, string> = {
  meralco: "Bill name",
  water: "Bill name",
  internet: "Bill name",
  monthly_due: "HOA due name",
  shopee: "Product name",
  tiktok: "Product name",
};

const categoryOptions: Record<string, string[]> = {
  online: [
    "Fashion",
    "Electronics",
    "Home & living",
    "Beauty",
    "Food & groceries",
    "Hobbies",
    "Others",
  ],
};

const paymentMethods = [
  "Cash",
  "GCash",
  "Maya",
  "Bank transfer",
  "Credit card",
  "Debit card",
  "Cash on delivery",
  "Other",
];

const statusOptions: Array<{ value: PaymentStatus; label: string }> = [
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

function buildInitial(
  bill: Bill | null,
  type: BillType,
  electricityRate: number,
  minimumCharge: number,
  minimumConsumption: number,
  excessRate: number,
): FormState {
  const online = type === "shopee" || type === "tiktok";
  const utility = type === "meralco" || type === "water";
  return {
    title:
      bill?.title ??
      (type === "monthly_due" ? "HOA Monthly Due" : ""),
    category: bill?.category ?? (online ? categoryOptions.online[0] : ""),
    billingPeriod: bill?.billingPeriod ?? currentMonthKey(),
    billingDate:
      bill?.billingDate ??
      (utility
        ? bill
          ? `${bill.billingPeriod}-01`
          : todayDateInput()
        : ""),
    dueDate: bill?.dueDate ?? "",
    amount:
      bill?.amount !== undefined
        ? String(bill.amount)
        : type === "monthly_due"
          ? String(HOA_MONTHLY_DUE)
          : "",
    paidAmount: bill ? String(bill.paidAmount || "") : "",
    status: bill && bill.status !== "overdue" ? bill.status : "unpaid",
    paidDate: bill?.paidDate ?? "",
    notes: bill?.notes ?? "",
    provider: bill?.provider ?? "",
    orderDate: bill?.orderDate ?? todayDateInput(),
    orderAmount:
      bill?.orderAmount !== undefined
        ? String(bill.orderAmount)
        : bill && online
          ? String(bill.amount)
          : "",
    paymentMethod: bill?.paymentMethod ?? "GCash",
    purchaseType:
      bill?.purchaseType ??
      (bill?.installmentMonths ? "installment" : "full"),
    installmentMonths: bill?.installmentMonths !== undefined ? String(bill.installmentMonths) : "3",
    installmentsPaid:
      bill?.installmentsPaid !== undefined ? String(bill.installmentsPaid) : "0",
    previousReading: bill?.previousReading !== undefined ? String(bill.previousReading) : "",
    currentReading: bill?.currentReading !== undefined ? String(bill.currentReading) : "",
    ratePerKwh:
      bill?.ratePerKwh !== undefined ? String(bill.ratePerKwh) : String(electricityRate || ""),
    minimumCharge:
      bill?.minimumCharge !== undefined ? String(bill.minimumCharge) : String(minimumCharge),
    minimumConsumption:
      bill?.minimumConsumption !== undefined
        ? String(bill.minimumConsumption)
        : String(minimumConsumption),
    excessRate: bill?.excessRate !== undefined ? String(bill.excessRate) : String(excessRate),
  };
}

export function BillFormModal({ open, onClose, type, bill, onSaved }: BillFormModalProps) {
  const { user } = useAuth();
  const { profile } = useData();
  const { toast } = useToast();
  const currency = profile?.currency ?? "PHP";
  const isUtilityReading = type === "meralco" || type === "water";
  const isOnline = type === "shopee" || type === "tiktok";

  const [form, setForm] = useState<FormState>(() =>
    buildInitial(
      bill,
      type,
      profile?.electricityRate ?? 12.5,
      profile?.waterMinimumCharge ?? 345,
      profile?.waterMinimumConsumption ?? 10,
      profile?.waterExcessRate ?? 0,
    ),
  );
  const [receipt, setReceipt] = useState<ReceiptUpload | null>(
    bill?.receiptUrl ? { url: bill.receiptUrl, name: bill.receiptName ?? "Receipt" } : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      buildInitial(
        bill,
        type,
        profile?.electricityRate ?? 12.5,
        profile?.waterMinimumCharge ?? 345,
        profile?.waterMinimumConsumption ?? 10,
        profile?.waterExcessRate ?? 0,
      ),
    );
    setReceipt(
      bill?.receiptUrl ? { url: bill.receiptUrl, name: bill.receiptName ?? "Receipt" } : null,
    );
    setError(null);
  }, [open, bill, type, profile]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const meralco = useMemo(
    () =>
      calculateMeralco(
        toNumber(form.previousReading),
        toNumber(form.currentReading),
        toNumber(form.ratePerKwh),
      ),
    [form.previousReading, form.currentReading, form.ratePerKwh],
  );

  const waterConsumption = useMemo(
    () =>
      Math.max(
        round2(toNumber(form.currentReading) - toNumber(form.previousReading)),
        0,
      ),
    [form.currentReading, form.previousReading],
  );

  const waterEstimate = useMemo(
    () =>
      calculateWater(
        waterConsumption,
        toNumber(form.minimumCharge),
        toNumber(form.minimumConsumption),
        toNumber(form.excessRate),
      ),
    [waterConsumption, form.minimumCharge, form.minimumConsumption, form.excessRate],
  );

  const onlineTotal = round2(Math.max(toNumber(form.orderAmount), 0));
  const isInstallment = isOnline && form.purchaseType === "installment";
  const planMonths = Math.max(Math.floor(toNumber(form.installmentMonths)), 0);
  const planMonthly = planMonths > 0 ? round2(onlineTotal / planMonths) : 0;
  const planPaidCount = Math.min(
    Math.max(Math.floor(toNumber(form.installmentsPaid)), 0),
    planMonths,
  );
  const planPaidAmount =
    planPaidCount >= planMonths && planMonths > 0
      ? onlineTotal
      : Math.min(round2(planMonthly * planPaidCount), onlineTotal);
  const planRemaining = round2(Math.max(onlineTotal - planPaidAmount, 0));
  const nextPlanMonth =
    planMonths > 0 && planPaidCount < planMonths
      ? shiftMonth(form.billingPeriod || currentMonthKey(), planPaidCount)
      : null;

  const handleStatusChange = (value: PaymentStatus) => {
    setForm((current) => {
      const next = { ...current, status: value };
      if (value === "paid") {
        next.paidDate = current.paidDate || todayDateInput();
        if (!current.paidAmount) {
          next.paidAmount = isOnline ? String(onlineTotal) : current.amount;
        }
      }
      if (value === "unpaid") {
        next.paidDate = "";
        next.paidAmount = "";
      }
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setError(null);
    if (!form.title.trim()) {
      setError(`Please enter the ${nameLabels[type].toLowerCase()}.`);
      return;
    }
    if (isUtilityReading && !form.billingDate) {
      setError("Please choose the billing date.");
      return;
    }
    const billingPeriod = isUtilityReading
      ? monthKeyFromDate(form.billingDate)
      : form.billingPeriod;
    if (!billingPeriod) {
      setError("Please choose a billing period.");
      return;
    }

    const resolvedAmount = isOnline ? onlineTotal : round2(toNumber(form.amount));
    if (isOnline && resolvedAmount <= 0) {
      setError("Enter an order amount greater than zero.");
      return;
    }
    if (!isOnline && resolvedAmount <= 0) {
      setError("Please enter an amount greater than zero.");
      return;
    }
    if (isInstallment && (planMonths < 1 || planMonths > 60)) {
      setError("Installment plans should be between 1 and 60 months.");
      return;
    }
    if (isUtilityReading) {
      const previous = toNumber(form.previousReading);
      const current = toNumber(form.currentReading);
      if (form.previousReading === "" || form.currentReading === "") {
        setError("Please enter both meter readings.");
        return;
      }
      if (current < previous) {
        setError("The current meter reading cannot be lower than the previous reading.");
        return;
      }
    }
    if (!isInstallment && form.paidAmount && toNumber(form.paidAmount) > resolvedAmount) {
      setError("Amount paid cannot be higher than the total amount.");
      return;
    }

    setBusy(true);
    try {
      const status: PaymentStatus = isInstallment
        ? planPaidCount >= planMonths
          ? "paid"
          : planPaidAmount > 0
            ? "partial"
            : "unpaid"
        : form.status;
      const paidAmount = isInstallment
        ? planPaidAmount
        : status === "paid"
          ? resolvedAmount
          : Math.min(toNumber(form.paidAmount), resolvedAmount);
      const category = isOnline
        ? form.category || "Others"
        : type === "monthly_due"
          ? "HOA"
          : typeTitles[type];

      const draft: BillDraft = {
        type,
        title: form.title.trim(),
        category,
        billingPeriod,
        billingDate: isUtilityReading ? form.billingDate : "",
        dueDate: form.dueDate,
        amount: resolvedAmount,
        paidAmount,
        status,
        paidDate: paidAmount > 0 || status === "paid"
          ? form.paidDate || todayDateInput()
          : "",
        receiptUrl: receipt?.url ?? "",
        receiptName: receipt?.name ?? "",
        notes: form.notes.trim(),
        provider: type === "internet" ? form.provider.trim() : "",
        orderDate: isOnline ? form.orderDate : "",
        orderAmount: isOnline ? onlineTotal : undefined,
        paymentMethod: isOnline ? form.paymentMethod : "",
        purchaseType: isOnline ? form.purchaseType : undefined,
        installmentMonths: isInstallment ? planMonths : undefined,
        installmentAmount: isInstallment ? planMonthly : undefined,
        installmentsPaid: isInstallment ? planPaidCount : undefined,
        previousReading: isUtilityReading ? toNumber(form.previousReading) : undefined,
        currentReading: isUtilityReading ? toNumber(form.currentReading) : undefined,
        consumption: isUtilityReading
          ? type === "meralco"
            ? meralco.consumption
            : waterConsumption
          : undefined,
        ratePerKwh: type === "meralco" ? round2(toNumber(form.ratePerKwh)) : undefined,
        minimumCharge: type === "water" ? round2(toNumber(form.minimumCharge)) : undefined,
        minimumConsumption:
          type === "water" ? round2(toNumber(form.minimumConsumption)) : undefined,
        excessRate: type === "water" ? round2(toNumber(form.excessRate)) : undefined,
      };

      if (bill) {
        await updateBill(user.uid, bill.id, draft);
        toast("Bill updated.");
      } else {
        await addBill(user.uid, draft);
        toast("Bill saved.");
      }
      await onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this bill.");
    } finally {
      setBusy(false);
    }
  };

  const categoryList = categoryOptions.online;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={bill ? `Edit ${typeTitles[type].toLowerCase()}` : `Add ${typeTitles[type].toLowerCase()}`}
      description={
        isUtilityReading
          ? "Enter the billing date and readings, then confirm the actual bill."
          : isOnline
            ? "Choose full payment or an installment plan for this purchase."
            : type === "monthly_due"
              ? `Record the HOA monthly due. The expected amount is ${formatCurrency(HOA_MONTHLY_DUE, currency)} per month.`
              : "Record this payment and keep its history."
      }
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="bill-form" loading={busy}>
            {bill ? "Save changes" : "Save bill"}
          </Button>
        </>
      }
    >
      <form id="bill-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={nameLabels[type]} requiredMark className="sm:col-span-2">
            <Input
              value={form.title}
              onChange={(event) => set("title", event.target.value)}
              placeholder={
                isOnline
                  ? "e.g. Wireless earphones"
                  : type === "monthly_due"
                    ? "HOA Monthly Due"
                    : type === "internet"
                      ? "e.g. Home fiber"
                      : `${typeTitles[type]} — ${currentMonthKey()}`
              }
              required
            />
          </Field>

          {type === "internet" ? (
            <Field label="Internet provider" className="sm:col-span-2">
              <Input
                value={form.provider}
                onChange={(event) => set("provider", event.target.value)}
                placeholder="e.g. PLDT, Globe, Converge"
              />
            </Field>
          ) : null}

          {isOnline ? (
            <Field label="Category" className="sm:col-span-2">
              <Select
                value={form.category}
                onChange={(event) => set("category", event.target.value)}
              >
                {categoryList?.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          {isUtilityReading ? (
            <Field
              label="Billing date"
              hint={`Billing month: ${monthLabel(form.billingPeriod || currentMonthKey(), "MMMM yyyy")}`}
              requiredMark
            >
              <Input
                type="date"
                value={form.billingDate}
                onChange={(event) => {
                  const value = event.target.value;
                  setForm((current) => ({
                    ...current,
                    billingDate: value,
                    billingPeriod: value ? monthKeyFromDate(value) : current.billingPeriod,
                  }));
                }}
                required
              />
            </Field>
          ) : (
            <Field label="Billing period" requiredMark>
              <Input
                type="month"
                value={form.billingPeriod}
                onChange={(event) => set("billingPeriod", event.target.value)}
                required
              />
            </Field>
          )}
          <Field
            label={isOnline ? "Payment due date" : "Due date"}
            hint={isOnline ? "Optional" : undefined}
          >
            <Input
              type="date"
              value={form.dueDate}
              onChange={(event) => set("dueDate", event.target.value)}
            />
          </Field>

          {type === "meralco" ? (
            <>
              <div className="sm:col-span-2 rounded-xl border border-line bg-background/60 px-3.5 py-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                  <Calculator className="h-3.5 w-3.5" /> Electricity calculator
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] font-semibold text-muted">Consumption</p>
                    <p className="text-sm font-extrabold text-ink">
                      {meralco.consumption.toLocaleString()} kWh
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted">Rate</p>
                    <p className="text-sm font-extrabold text-ink">
                      {formatCurrency(toNumber(form.ratePerKwh), currency)}/kWh
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted">Estimated charge</p>
                    <p className="text-sm font-extrabold text-primary-700">
                      {formatCurrency(meralco.estimatedCharge, currency)}
                    </p>
                  </div>
                </div>
              </div>
              <Field label="Previous reading (kWh)" requiredMark>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.previousReading}
                  onChange={(event) => set("previousReading", event.target.value)}
                  placeholder="12500"
                  required
                />
              </Field>
              <Field label="Current reading (kWh)" requiredMark>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.currentReading}
                  onChange={(event) => set("currentReading", event.target.value)}
                  placeholder="12650"
                  required
                />
              </Field>
              <Field label="Rate per kWh" requiredMark>
                <MoneyInput
                  value={form.ratePerKwh}
                  onChange={(event) => set("ratePerKwh", event.target.value)}
                  placeholder="12.50"
                />
              </Field>
            </>
          ) : null}

          {type === "water" ? (
            <>
              <div className="sm:col-span-2 rounded-xl border border-line bg-background/60 px-3.5 py-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                  <Calculator className="h-3.5 w-3.5" /> Water calculator
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] font-semibold text-muted">Consumption</p>
                    <p className="text-sm font-extrabold text-ink">
                      {waterConsumption.toLocaleString()} m³
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted">Included</p>
                    <p className="text-sm font-extrabold text-ink">
                      {toNumber(form.minimumConsumption)} m³
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted">Estimated bill</p>
                    <p className="text-sm font-extrabold text-primary-700">
                      {formatCurrency(waterEstimate, currency)}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-[10px] leading-4 text-muted">
                  First {toNumber(form.minimumConsumption)} m³ costs{" "}
                  {formatCurrency(toNumber(form.minimumCharge), currency)}. Excess is computed
                  using your configured rate.
                </p>
              </div>
              <Field label="Previous reading (m³)" requiredMark>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.previousReading}
                  onChange={(event) => set("previousReading", event.target.value)}
                  placeholder="120"
                  required
                />
              </Field>
              <Field label="Current reading (m³)" requiredMark>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.currentReading}
                  onChange={(event) => set("currentReading", event.target.value)}
                  placeholder="132"
                  required
                />
              </Field>
              <Field label="Minimum charge">
                <MoneyInput
                  value={form.minimumCharge}
                  onChange={(event) => set("minimumCharge", event.target.value)}
                />
              </Field>
              <Field label="Minimum consumption (m³)">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minimumConsumption}
                  onChange={(event) => set("minimumConsumption", event.target.value)}
                />
              </Field>
              <Field label="Excess rate per m³" className="sm:col-span-2">
                <MoneyInput
                  value={form.excessRate}
                  onChange={(event) => set("excessRate", event.target.value)}
                  placeholder="Set from your provider tariff"
                />
              </Field>
            </>
          ) : null}

          {isOnline ? (
            <>
              <Field label="Order date">
                <Input
                  type="date"
                  value={form.orderDate}
                  onChange={(event) => set("orderDate", event.target.value)}
                />
              </Field>
              <Field label="Order amount" hint="Actual total paid for the purchase" requiredMark>
                <MoneyInput
                  value={form.orderAmount}
                  onChange={(event) => set("orderAmount", event.target.value)}
                  placeholder="0.00"
                  required
                />
              </Field>
              <Field label="Purchase type">
                <Select
                  value={form.purchaseType}
                  onChange={(event) => set("purchaseType", event.target.value as PurchaseType)}
                >
                  <option value="full">Full payment</option>
                  <option value="installment">Installment</option>
                </Select>
              </Field>
              <Field label="Payment method">
                <Select
                  value={form.paymentMethod}
                  onChange={(event) => set("paymentMethod", event.target.value)}
                >
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </Select>
              </Field>

              {isInstallment ? (
                <>
                  <Field label="Number of months" requiredMark>
                    <Input
                      type="number"
                      min="1"
                      max="60"
                      step="1"
                      value={form.installmentMonths}
                      onChange={(event) => set("installmentMonths", event.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Installments already paid">
                    <Input
                      type="number"
                      min="0"
                      max={planMonths || 60}
                      step="1"
                      value={form.installmentsPaid}
                      onChange={(event) => set("installmentsPaid", event.target.value)}
                    />
                  </Field>
                  <div className="sm:col-span-2 rounded-xl border border-primary-200 bg-primary-50 px-3.5 py-3">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-primary-700">
                          Purchase total
                        </p>
                        <p className="text-sm font-extrabold text-ink">
                          {formatCurrency(onlineTotal, currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-primary-700">
                          Monthly bill
                        </p>
                        <p className="text-sm font-extrabold text-primary-800">
                          {formatCurrency(planMonthly, currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-primary-700">
                          Paid so far
                        </p>
                        <p className="text-sm font-extrabold text-ink">
                          {formatCurrency(planPaidAmount, currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-primary-700">
                          Remaining
                        </p>
                        <p className="text-sm font-extrabold text-ink">
                          {formatCurrency(planRemaining, currency)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-[10px] leading-4 text-primary-700">
                      {nextPlanMonth
                        ? `${planPaidCount} of ${planMonths} installment(s) paid. Next monthly bill: ${monthLabel(nextPlanMonth, "MMMM yyyy")}.`
                        : "All installments are paid."}{" "}
                      Checking each monthly installment automatically deducts it from the remaining
                      balance.
                    </p>
                  </div>
                </>
              ) : null}
            </>
          ) : null}

          <Field
            label={isOnline ? "Purchase total" : type === "monthly_due" ? "HOA due amount" : "Actual bill amount"}
            hint={
              type === "monthly_due"
                ? `Expected HOA due is ${formatCurrency(HOA_MONTHLY_DUE, currency)} per month`
                : undefined
            }
            requiredMark
          >
            {isOnline ? (
              <div className="flex h-[42px] items-center rounded-xl border border-line bg-background px-3.5 text-sm font-extrabold text-ink">
                {formatCurrency(onlineTotal, currency)}
              </div>
            ) : (
              <div className="space-y-1.5">
                <MoneyInput
                  value={form.amount}
                  onChange={(event) => set("amount", event.target.value)}
                  placeholder="0.00"
                  required
                />
                {isUtilityReading ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1 text-[10px]"
                    onClick={() =>
                      set(
                        "amount",
                        String(type === "meralco" ? meralco.estimatedCharge : waterEstimate),
                      )
                    }
                  >
                    Use estimate ({formatCurrency(type === "meralco" ? meralco.estimatedCharge : waterEstimate, currency)})
                  </Button>
                ) : null}
              </div>
            )}
          </Field>

          {isInstallment ? (
            <Field label="Installment status">
              <div className="flex h-[42px] items-center rounded-xl border border-line bg-background px-3.5 text-sm font-bold text-ink">
                {planPaidCount >= planMonths
                  ? "Fully paid"
                  : planPaidCount > 0
                    ? `${planPaidCount} of ${planMonths} paid`
                    : "Not started"}
              </div>
            </Field>
          ) : (
            <>
              <Field label="Payment status">
                <Select
                  value={form.status}
                  onChange={(event) => handleStatusChange(event.target.value as PaymentStatus)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Amount paid" hint="Useful for partial payments">
                <MoneyInput
                  value={form.paidAmount}
                  onChange={(event) => set("paidAmount", event.target.value)}
                  placeholder="0.00"
                  disabled={form.status === "paid"}
                />
              </Field>
              <Field label="Paid date">
                <Input
                  type="date"
                  value={form.paidDate}
                  onChange={(event) => set("paidDate", event.target.value)}
                  disabled={form.status === "unpaid"}
                />
              </Field>
            </>
          )}
          <Field label="Receipt" className="sm:col-span-2">
            <ReceiptField value={receipt} onChange={setReceipt} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea
              value={form.notes}
              onChange={(event) => set("notes", event.target.value)}
              placeholder="Anything worth remembering about this bill…"
            />
          </Field>
        </div>

        {isUtilityReading ? (
          <div className="flex items-start gap-2 rounded-xl bg-primary-50 px-3 py-2.5 text-[11px] font-medium leading-5 text-primary-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              The estimate excludes taxes, adjustments, and other provider charges. Enter the
              actual total from your official bill for accurate records.
            </span>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-xl bg-danger/5 px-3 py-2 text-xs font-semibold text-danger">{error}</p>
        ) : null}
      </form>
    </Modal>
  );
}
