"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Database,
  Download,
  Droplets,
  Home,
  KeyRound,
  LogOut,
  Moon,
  Plus,
  ReceiptText,
  Save,
  Sun,
  Trash2,
  User,
  Wallet,
  Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardHeader } from "@/components/common/card";
import { Button } from "@/components/common/button";
import { Field, Input, MoneyInput, Select } from "@/components/common/input";
import { ConfirmDialog } from "@/components/common/modal";
import { uploadAvatar } from "@/services/receiptService";
import { clearDemoData } from "@/lib/store";
import { CURRENCY_OPTIONS, DATE_FORMATS } from "@/lib/defaults";
import { downloadCsv, transactionsToCsv } from "@/lib/csv";
import { getDashboardTotals, toTransactions } from "@/lib/calculations";
import { currentMonthKey, formatDate, monthLabel } from "@/lib/dates";
import { formatCurrency, toNumber } from "@/lib/format";
import { newId } from "@/lib/store";
import type {
  CurrencyCode,
  MemberContribution,
  ThemePreference,
} from "@/types";

export default function SettingsPage() {
  const { user, demoMode, setDisplayName, resetPassword, logout } = useAuth();
  const { profile, groceries, priceHistory, shoppingLists, bills, rentPayments, updateProfile, reload } =
    useData();
  const { toast } = useToast();

  const [name, setName] = useState(profile?.displayName ?? "");
  const [currency, setCurrency] = useState<CurrencyCode>(profile?.currency ?? "PHP");
  const [dateFormat, setDateFormat] = useState(profile?.dateFormat ?? "MMM d, yyyy");
  const [theme, setTheme] = useState<ThemePreference>(profile?.theme ?? "light");
  const [defaultMonthView, setDefaultMonthView] = useState(profile?.defaultMonthView ?? currentMonthKey());
  const [householdName, setHouseholdName] = useState(profile?.householdName ?? "My Household");
  const [members, setMembers] = useState<MemberContribution[]>(profile?.members ?? []);
  const [minimumCharge, setMinimumCharge] = useState(String(profile?.waterMinimumCharge ?? 345));
  const [minimumConsumption, setMinimumConsumption] = useState(
    String(profile?.waterMinimumConsumption ?? 10),
  );
  const [excessRate, setExcessRate] = useState(String(profile?.waterExcessRate ?? 0));
  const [electricityRate, setElectricityRate] = useState(String(profile?.electricityRate ?? 12.5));

  const [accountBusy, setAccountBusy] = useState(false);
  const [prefBusy, setPrefBusy] = useState(false);
  const [householdBusy, setHouseholdBusy] = useState(false);
  const [expenseBusy, setExpenseBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.displayName);
    setCurrency(profile.currency);
    setDateFormat(profile.dateFormat);
    setTheme(profile.theme);
    setDefaultMonthView(profile.defaultMonthView || currentMonthKey());
    setHouseholdName(profile.householdName);
    setMembers(profile.members);
    setMinimumCharge(String(profile.waterMinimumCharge));
    setMinimumConsumption(String(profile.waterMinimumConsumption));
    setExcessRate(String(profile.waterExcessRate));
    setElectricityRate(String(profile.electricityRate));
  }, [profile]);

  const receiptCount = bills.filter((bill) => bill.receiptUrl).length;

  const allTransactions = useMemo(
    () => toTransactions(bills, shoppingLists, rentPayments),
    [bills, shoppingLists, rentPayments],
  );

  const saveAccount = async () => {
    if (!name.trim()) {
      toast("Please enter your name.", "error");
      return;
    }
    setAccountBusy(true);
    try {
      await setDisplayName(name.trim());
      await updateProfile({ displayName: name.trim() });
      toast("Account updated.");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not update account.", "error");
    } finally {
      setAccountBusy(false);
    }
  };

  const handleAvatar = async (file: File | undefined) => {
    if (!file || !user) return;
    setAvatarBusy(true);
    try {
      const url = await uploadAvatar(user.uid, file);
      await updateProfile({ photoURL: url });
      toast("Profile picture updated.");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not upload picture.", "error");
    } finally {
      setAvatarBusy(false);
      if (avatarInput.current) avatarInput.current.value = "";
    }
  };

  const savePreferences = async () => {
    setPrefBusy(true);
    try {
      await updateProfile({ currency, dateFormat, theme, defaultMonthView });
      toast("Preferences saved.");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not save preferences.", "error");
    } finally {
      setPrefBusy(false);
    }
  };

  const saveHousehold = async () => {
    const cleanMembers = members
      .filter((member) => member.name.trim())
      .map((member) => ({
        ...member,
        name: member.name.trim(),
        contribution: Math.max(toNumber(member.contribution), 0),
      }));
    if (!householdName.trim()) {
      toast("Please name your household.", "error");
      return;
    }
    setHouseholdBusy(true);
    try {
      await updateProfile({ householdName: householdName.trim(), members: cleanMembers });
      toast("Household settings saved.");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not save household.", "error");
    } finally {
      setHouseholdBusy(false);
    }
  };

  const saveExpenseSettings = async () => {
    setExpenseBusy(true);
    try {
      await updateProfile({
        waterMinimumCharge: Math.max(toNumber(minimumCharge), 0),
        waterMinimumConsumption: Math.max(toNumber(minimumConsumption), 0),
        waterExcessRate: Math.max(toNumber(excessRate), 0),
        electricityRate: Math.max(toNumber(electricityRate), 0),
      });
      toast("Expense settings saved.");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not save preferences.", "error");
    } finally {
      setExpenseBusy(false);
    }
  };

  const exportAll = () => {
    transactionsToCsv(allTransactions, `expensyyy-all-${new Date().toISOString().slice(0, 10)}.csv`);
    toast("All transactions exported.");
  };

  const exportMonthly = () => {
    if (!profile) return;
    const totals = getDashboardTotals(
      bills,
      shoppingLists,
      rentPayments,
      currentMonthKey(),
      profile.members.map((member) => member.contribution),
    );
    downloadCsv(
      `expensyyy-summary-${currentMonthKey()}.csv`,
      ["Category", "Amount"],
      [
        ["Groceries", formatCurrency(totals.grocery, currency)],
        ["Meralco", formatCurrency(totals.electricity, currency)],
        ["Water", formatCurrency(totals.water, currency)],
        ["Internet", formatCurrency(totals.internet, currency)],
        ["Rent expected", formatCurrency(totals.rentExpected, currency)],
        ["Rent collected", formatCurrency(totals.rentCollected, currency)],
        ["HOA due", formatCurrency(totals.monthlyDues, currency)],
        ["Shopee", formatCurrency(totals.shopee, currency)],
        ["TikTok Shop", formatCurrency(totals.tiktok, currency)],
        ["Total", formatCurrency(totals.total, currency)],
        ["Paid", formatCurrency(totals.paid, currency)],
        ["Unpaid", formatCurrency(totals.unpaid, currency)],
        ["Generated", formatDate(new Date().toISOString(), "MMM d, yyyy h:mm a")],
      ],
    );
    toast("Monthly summary exported.");
  };

  const exportBackup = () => {
    const backup = {
      app: "Expensyyy",
      version: 1,
      exportedAt: new Date().toISOString(),
      profile,
      groceries,
      groceryPriceHistory: priceHistory,
      shoppingLists,
      bills,
      rentPayments,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expensyyy-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast("Backup downloaded.");
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await resetPassword(user.email);
      toast("Password reset email sent.");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not send reset email.", "error");
    }
  };

  const clearData = async () => {
    if (!user) return;
    setClearing(true);
    try {
      clearDemoData(user.uid);
      await reload();
      setClearOpen(false);
      toast("Demo data cleared.");
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not clear data.", "error");
    } finally {
      setClearing(false);
    }
  };

  const updateMember = (id: string, patch: Partial<MemberContribution>) => {
    setMembers((current) =>
      current.map((member) => (member.id === id ? { ...member, ...patch } : member)),
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        subtitle="Make Expensyyy feel like your own little household command center."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Account"
            description="Your profile and sign-in details"
            icon={<User className="h-4 w-4" />}
          />
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-primary-100 text-sm font-extrabold text-primary-800">
                {profile?.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.photoURL} alt={profile.displayName} className="h-full w-full object-cover" />
                ) : (
                  (profile?.displayName?.[0] ?? "E").toUpperCase()
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={avatarInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void handleAvatar(event.target.files?.[0])}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => avatarInput.current?.click()}
                  disabled={avatarBusy}
                >
                  <Camera className="h-3.5 w-3.5" /> {avatarBusy ? "Uploading…" : "Change photo"}
                </Button>
                {profile?.photoURL ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void updateProfile({ photoURL: "" })}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>

            <Field label="Display name">
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="Email" hint="Email changes are handled through your Firebase account.">
              <Input value={user?.email ?? ""} readOnly disabled />
            </Field>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void saveAccount()} loading={accountBusy}>
                <Save className="h-3.5 w-3.5" /> Save account
              </Button>
              <Button size="sm" variant="outline" onClick={() => void handlePasswordReset()}>
                <KeyRound className="h-3.5 w-3.5" /> Change password
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void logout()}>
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Preferences"
            description="How your money and dates are displayed"
            icon={<Wallet className="h-4 w-4" />}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Currency">
              <Select
                value={currency}
                onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
              >
                {CURRENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date format">
              <Select value={dateFormat} onChange={(event) => setDateFormat(event.target.value)}>
                {DATE_FORMATS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Default month view">
              <Input
                type="month"
                value={defaultMonthView}
                onChange={(event) => setDefaultMonthView(event.target.value)}
              />
            </Field>
            <Field label="Theme">
              <div className="grid grid-cols-2 gap-2">
                {(["light", "dark"] as ThemePreference[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setTheme(option)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold capitalize transition ${
                      theme === option
                        ? "border-primary-500 bg-primary-50 text-primary-800"
                        : "border-line bg-surface text-muted hover:border-primary-300"
                    }`}
                  >
                    {option === "light" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                    {option}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <div className="mt-4">
            <Button size="sm" onClick={() => void savePreferences()} loading={prefBusy}>
              <Save className="h-3.5 w-3.5" /> Save preferences
            </Button>
          </div>
          <p className="mt-3 text-[10px] leading-4 text-muted">
            Dates and payment timestamps are displayed in Asia/Manila time. Theme changes apply
            instantly after saving.
          </p>
        </Card>

        <Card>
          <CardHeader
            title="Household"
            description="Rent contributions come from these members"
            icon={<Home className="h-4 w-4" />}
          />
          <div className="space-y-4">
            <Field label="Household name">
              <Input
                value={householdName}
                onChange={(event) => setHouseholdName(event.target.value)}
                placeholder="e.g. Dela Cruz Household"
              />
            </Field>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Members</p>
              {members.length === 0 ? (
                <p className="rounded-xl bg-background px-3 py-3 text-xs text-muted">
                  No members yet. Add the people sharing this household.
                </p>
              ) : (
                members.map((member) => (
                  <div key={member.id} className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[120px] flex-1">
                      <Input
                        value={member.name}
                        onChange={(event) => updateMember(member.id, { name: event.target.value })}
                        placeholder="Member name"
                        aria-label="Member name"
                      />
                    </div>
                    <div className="w-36">
                      <MoneyInput
                        value={member.contribution}
                        onChange={(event) =>
                          updateMember(member.id, { contribution: toNumber(event.target.value) })
                        }
                        aria-label="Monthly contribution"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setMembers((current) => current.filter((entry) => entry.id !== member.id))
                      }
                      className="rounded-lg p-2.5 text-muted transition hover:bg-danger/10 hover:text-danger"
                      aria-label={`Remove ${member.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setMembers((current) => [
                    ...current,
                    { id: newId(), name: "", contribution: 0 },
                  ])
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add member
              </Button>
              <p className="text-[10px] leading-4 text-muted">
                The contribution is the expected monthly rent amount for each member.
              </p>
            </div>

            <Button size="sm" onClick={() => void saveHousehold()} loading={householdBusy}>
              <Save className="h-3.5 w-3.5" /> Save household
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Expense settings"
            description="Defaults used by the bill calculators"
            icon={<Zap className="h-4 w-4" />}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Electricity rate per kWh">
              <MoneyInput
                value={electricityRate}
                onChange={(event) => setElectricityRate(event.target.value)}
              />
            </Field>
            <Field label="Water minimum charge">
              <MoneyInput
                value={minimumCharge}
                onChange={(event) => setMinimumCharge(event.target.value)}
              />
            </Field>
            <Field label="Minimum consumption (m³)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={minimumConsumption}
                onChange={(event) => setMinimumConsumption(event.target.value)}
              />
            </Field>
            <Field label="Water excess rate per m³" hint="Set this from your water provider's tariff.">
              <MoneyInput
                value={excessRate}
                onChange={(event) => setExcessRate(event.target.value)}
                placeholder="0.00"
              />
            </Field>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-primary-50 px-3 py-2.5 text-[11px] leading-5 text-primary-800">
            <Droplets className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              The first {toNumber(minimumConsumption)} m³ defaults to{" "}
              {formatCurrency(toNumber(minimumCharge), currency)}. Expensyyy never assumes an
              excess rate for you.
            </span>
          </div>
          <div className="mt-4">
            <Button size="sm" onClick={() => void saveExpenseSettings()} loading={expenseBusy}>
              <Save className="h-3.5 w-3.5" /> Save expense settings
            </Button>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Data management"
          description="Your records, your backup, your peace of mind"
          icon={<Database className="h-4 w-4" />}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={exportAll}
            className="flex items-start gap-2 rounded-xl border border-line bg-background/50 p-3 text-left transition hover:border-primary-300 hover:bg-primary-50/40"
          >
            <Download className="mt-0.5 h-4 w-4 text-primary-700" />
            <span>
              <span className="block text-xs font-bold text-ink">Export all expenses</span>
              <span className="mt-0.5 block text-[10px] leading-4 text-muted">
                Download every transaction as CSV.
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={exportMonthly}
            className="flex items-start gap-2 rounded-xl border border-line bg-background/50 p-3 text-left transition hover:border-primary-300 hover:bg-primary-50/40"
          >
            <ReceiptText className="mt-0.5 h-4 w-4 text-primary-700" />
            <span>
              <span className="block text-xs font-bold text-ink">Export monthly report</span>
              <span className="mt-0.5 block text-[10px] leading-4 text-muted">
                {monthLabel(currentMonthKey(), "MMMM yyyy")} summary CSV.
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={exportBackup}
            className="flex items-start gap-2 rounded-xl border border-line bg-background/50 p-3 text-left transition hover:border-primary-300 hover:bg-primary-50/40"
          >
            <Database className="mt-0.5 h-4 w-4 text-primary-700" />
            <span>
              <span className="block text-xs font-bold text-ink">Backup information</span>
              <span className="mt-0.5 block text-[10px] leading-4 text-muted">
                Download a full JSON backup.
              </span>
            </span>
          </button>
          <div className="flex items-start gap-2 rounded-xl border border-line bg-background/50 p-3">
            <ReceiptText className="mt-0.5 h-4 w-4 text-primary-700" />
            <span>
              <span className="block text-xs font-bold text-ink">Receipts</span>
              <span className="mt-0.5 block text-[10px] leading-4 text-muted">
                {receiptCount} receipt{receiptCount === 1 ? "" : "s"} attached.{" "}
                {demoMode ? "Stored in this browser." : "Stored in Firebase Storage."}
              </span>
            </span>
          </div>
        </div>

        {demoMode ? (
          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-danger/20 bg-danger/5 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold text-danger">Demo data</p>
              <p className="text-[10px] leading-4 text-danger/80">
                This browser holds your demo records. Clearing cannot be undone — export a backup
                first if you need it.
              </p>
            </div>
            <Button size="sm" variant="danger" onClick={() => setClearOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Clear demo data
            </Button>
          </div>
        ) : null}
      </Card>

      <ConfirmDialog
        open={clearOpen}
        title="Clear all demo data?"
        message="All grocery items, price history, shopping lists, bills, and rent payments in this browser will be deleted. This cannot be undone."
        confirmLabel="Clear everything"
        onClose={() => setClearOpen(false)}
        onConfirm={() => void clearData()}
        busy={clearing}
      />
    </div>
  );
}
