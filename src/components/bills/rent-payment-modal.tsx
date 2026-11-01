"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/common/button";
import { Field, Input, MoneyInput, Select, Textarea } from "@/components/common/input";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import { addRentPayment, updateRentPayment } from "@/services/rentService";
import { formatCurrency, toNumber } from "@/lib/format";
import { currentMonthKey } from "@/lib/dates";
import type { MemberContribution, RentPayment } from "@/types";

function toLocalInput(iso?: string): string {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

interface RentPaymentModalProps {
  open: boolean;
  onClose: () => void;
  payment: RentPayment | null;
  members: MemberContribution[];
  defaultMemberId?: string;
  defaultPeriod?: string;
  defaultExpected?: number;
  onSaved: () => Promise<void> | void;
}

export function RentPaymentModal({
  open,
  onClose,
  payment,
  members,
  defaultMemberId,
  defaultPeriod,
  defaultExpected,
  onSaved,
}: RentPaymentModalProps) {
  const { user } = useAuth();
  const { profile } = useData();
  const { toast } = useToast();
  const currency = profile?.currency ?? "PHP";
  const [memberId, setMemberId] = useState("");
  const [expected, setExpected] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [period, setPeriod] = useState(currentMonthKey());
  const [paymentDate, setPaymentDate] = useState(toLocalInput());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fallbackMember =
      members.find((member) => member.id === defaultMemberId) ?? members[0];
    setMemberId(payment?.memberId ?? fallbackMember?.id ?? "");
    setExpected(
      payment
        ? String(payment.expectedAmount)
        : String(defaultExpected ?? fallbackMember?.contribution ?? 0),
    );
    setAmountPaid(payment ? String(payment.amountPaid) : "");
    setPeriod(payment?.billingPeriod ?? defaultPeriod ?? currentMonthKey());
    setPaymentDate(toLocalInput(payment?.paymentDate));
    setNotes(payment?.notes ?? "");
    setError(null);
  }, [open, payment, members, defaultMemberId, defaultPeriod, defaultExpected]);

  const selectedMember =
    members.find((member) => member.id === memberId) ??
    (payment
      ? { id: payment.memberId, name: payment.memberName, contribution: payment.expectedAmount }
      : null);

  const handleMemberChange = (value: string) => {
    setMemberId(value);
    const member = members.find((entry) => entry.id === value);
    if (member && !payment) setExpected(String(member.contribution));
  };

  const expectedValue = toNumber(expected);
  const paidValue = toNumber(amountPaid);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setError(null);
    if (!selectedMember) {
      setError("Please choose a household member.");
      return;
    }
    if (paidValue <= 0) {
      setError("Enter the amount paid.");
      return;
    }
    if (expectedValue < 0) {
      setError("Expected contribution cannot be negative.");
      return;
    }
    setBusy(true);
    try {
      const parsedDate = paymentDate ? new Date(paymentDate) : new Date();
      const draft = {
        billingPeriod: period,
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        expectedAmount: expectedValue,
        amountPaid: paidValue,
        paymentDate: Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString(),
        status: "unpaid" as const,
        notes: notes.trim(),
      };
      if (payment) {
        await updateRentPayment(user.uid, payment.id, draft);
        toast("Rent payment updated.");
      } else {
        await addRentPayment(user.uid, draft);
        toast("Rent payment recorded.");
      }
      await onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this payment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={payment ? "Edit rent payment" : "Record rent payment"}
      description="Each payment is saved separately, so partial and multiple payments are welcome."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="rent-payment-form" loading={busy}>
            {payment ? "Save changes" : "Record payment"}
          </Button>
        </>
      }
    >
      <form id="rent-payment-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Household member" requiredMark>
            <Select value={memberId} onChange={(event) => handleMemberChange(event.target.value)}>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
              {payment && !members.some((member) => member.id === payment.memberId) ? (
                <option value={payment.memberId}>{payment.memberName}</option>
              ) : null}
            </Select>
          </Field>
          <Field label="Billing period" requiredMark>
            <Input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} />
          </Field>
          <Field label="Expected contribution">
            <MoneyInput
              value={expected}
              onChange={(event) => setExpected(event.target.value)}
              placeholder="0.00"
            />
          </Field>
          <Field label="Amount paid" requiredMark>
            <MoneyInput
              value={amountPaid}
              onChange={(event) => setAmountPaid(event.target.value)}
              placeholder="0.00"
              required
            />
          </Field>
          <Field
            label="Payment date and time"
            hint="Defaults to now. You can change it."
            className="sm:col-span-2"
          >
            <Input
              type="datetime-local"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
            />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="e.g. Paid via GCash"
            />
          </Field>
        </div>

        <div className="rounded-xl bg-primary-50 px-3.5 py-3 text-xs text-primary-800">
          <div className="flex items-center justify-between">
            <span className="font-semibold">This payment</span>
            <span className="font-extrabold">{formatCurrency(paidValue, currency)}</span>
          </div>
          {expectedValue > 0 ? (
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span>Remaining after this payment</span>
              <span className="font-bold">
                {formatCurrency(Math.max(expectedValue - paidValue, 0), currency)}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-background px-3 py-2.5 text-[11px] leading-5 text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Add another payment later for the same month if the contribution is paid in parts.
            Payment dates are recorded automatically.
          </span>
        </div>

        {error ? (
          <p className="rounded-xl bg-danger/5 px-3 py-2 text-xs font-semibold text-danger">{error}</p>
        ) : null}
      </form>
    </Modal>
  );
}
