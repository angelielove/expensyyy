import { round2 } from "@/lib/format";
import { daysUntil } from "@/lib/dates";
import type {
  Bill,
  DashboardTotals,
  GroceryPriceHistory,
  PaymentStatus,
  RentPayment,
  ShoppingList,
  ShoppingListItem,
  TransactionRecord,
} from "@/types";

export function shoppingItemSubtotal(item: ShoppingListItem): number {
  return round2((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0));
}

export function shoppingListTotal(list: Pick<ShoppingList, "items">): number {
  return round2(list.items.reduce((sum, item) => sum + shoppingItemSubtotal(item), 0));
}

export function shoppingListPurchasedTotal(list: Pick<ShoppingList, "items">): number {
  return round2(
    list.items.filter((item) => item.purchased).reduce((sum, item) => sum + shoppingItemSubtotal(item), 0),
  );
}

export function shoppingItemCount(list: Pick<ShoppingList, "items">): number {
  return list.items.length;
}

export function priceChange(history: GroceryPriceHistory): {
  difference: number;
  percent: number | null;
} {
  const difference = round2(history.newPrice - history.previousPrice);
  const percent =
    history.previousPrice > 0 ? (difference / history.previousPrice) * 100 : null;
  return { difference, percent };
}

export function calculateMeralco(
  previousReading: number,
  currentReading: number,
  ratePerKwh: number,
): { consumption: number; estimatedCharge: number } {
  const consumption = round2((Number(currentReading) || 0) - (Number(previousReading) || 0));
  const safeConsumption = Math.max(consumption, 0);
  return {
    consumption: safeConsumption,
    estimatedCharge: round2(safeConsumption * (Number(ratePerKwh) || 0)),
  };
}

export function calculateWater(
  consumption: number,
  minimumCharge: number,
  minimumConsumption: number,
  excessRate: number,
): number {
  const used = Math.max(Number(consumption) || 0, 0);
  const minimum = Number(minimumCharge) || 0;
  const included = Number(minimumConsumption) || 0;
  if (used <= included) return round2(minimum);
  return round2(minimum + (used - included) * (Number(excessRate) || 0));
}

function monthIndex(monthKey: string): number {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return 0;
  return year * 12 + (month - 1);
}

export function monthGap(startMonth: string, endMonth: string): number {
  return monthIndex(endMonth) - monthIndex(startMonth);
}

export function installmentMonths(bill: Bill): number {
  return Math.max(Math.floor(Number(bill.installmentMonths) || 0), 0);
}

export function isInstallmentBill(bill: Bill): boolean {
  return bill.purchaseType === "installment" && installmentMonths(bill) > 0;
}

export function installmentChargeForMonth(bill: Bill, monthKey: string): number {
  const months = installmentMonths(bill);
  if (!isInstallmentBill(bill)) {
    return bill.billingPeriod === monthKey ? Number(bill.amount) || 0 : 0;
  }
  const elapsed = monthGap(bill.billingPeriod, monthKey);
  if (elapsed < 0 || elapsed >= months) return 0;
  const monthly = Number(bill.installmentAmount) || 0;
  if (elapsed === months - 1) {
    return round2(Math.max((Number(bill.amount) || 0) - monthly * (months - 1), 0));
  }
  return round2(monthly);
}

export function installmentPaidForMonth(bill: Bill, monthKey: string): number {
  const months = installmentMonths(bill);
  if (!isInstallmentBill(bill)) return billPaidValue(bill);
  const elapsed = monthGap(bill.billingPeriod, monthKey);
  if (elapsed < 0 || elapsed >= months) return 0;
  return elapsed < installmentsPaidCount(bill)
    ? installmentChargeForMonth(bill, monthKey)
    : 0;
}

export function installmentsPaidCount(bill: Bill): number {
  return Math.min(
    Math.max(Math.floor(Number(bill.installmentsPaid) || 0), 0),
    installmentMonths(bill),
  );
}

export function installmentRemaining(bill: Bill): number {
  const months = installmentMonths(bill);
  const monthly = Number(bill.installmentAmount) || 0;
  const paid = Math.min(round2(monthly * installmentsPaidCount(bill)), Number(bill.amount) || 0);
  if (installmentsPaidCount(bill) >= months && months > 0) return 0;
  return round2(Math.max((Number(bill.amount) || 0) - paid, 0));
}

export function nextInstallmentMonth(bill: Bill): string | null {
  const months = installmentMonths(bill);
  const paid = installmentsPaidCount(bill);
  if (months === 0 || paid >= months) return null;
  const index = monthIndex(bill.billingPeriod) + paid;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function resolveBillStatus(bill: Bill): PaymentStatus {
  const amount = Number(bill.amount) || 0;
  const paid = Number(bill.paidAmount) || 0;
  if (bill.status === "paid" || (paid > 0 && paid >= amount && amount > 0)) return "paid";
  if (paid > 0 && paid < amount) return "partial";
  if (bill.dueDate && daysUntil(bill.dueDate) < 0) return "overdue";
  return "unpaid";
}

export function billPaidValue(bill: Bill): number {
  const status = resolveBillStatus(bill);
  if (status === "paid") return Number(bill.amount) || 0;
  return Math.min(Number(bill.paidAmount) || 0, Number(bill.amount) || 0);
}

export function billRemaining(bill: Bill): number {
  return round2(Math.max((Number(bill.amount) || 0) - billPaidValue(bill), 0));
}

export function rentStatus(expected: number, paid: number): PaymentStatus {
  if (expected > 0 && paid >= expected) return "paid";
  if (paid > 0) return "partial";
  return "unpaid";
}

export function rentSummary(payments: RentPayment[]): {
  expected: number;
  collected: number;
  remaining: number;
} {
  const expectedByMember = new Map<string, number>();
  payments.forEach((payment) => {
    const expected = Number(payment.expectedAmount) || 0;
    const key = payment.memberId || payment.memberName;
    expectedByMember.set(key, Math.max(expectedByMember.get(key) ?? 0, expected));
  });
  const expected = round2(
    Array.from(expectedByMember.values()).reduce((sum, value) => sum + value, 0),
  );
  const collected = round2(payments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0));
  return { expected, collected, remaining: round2(Math.max(expected - collected, 0)) };
}

export function getDashboardTotals(
  bills: Bill[],
  shoppingLists: ShoppingList[],
  rentPayments: RentPayment[],
  monthKey: string,
  memberContributions: number[] = [],
): DashboardTotals {
  const monthBills = bills.filter(
    (bill) =>
      bill.billingPeriod === monthKey ||
      (isInstallmentBill(bill) && installmentChargeForMonth(bill, monthKey) > 0),
  );
  const monthLists = shoppingLists.filter(
    (list) => (list.shoppingDate || "").slice(0, 7) === monthKey,
  );
  const monthRent = rentPayments.filter((payment) => payment.billingPeriod === monthKey);

  const grocery = round2(monthLists.reduce((sum, list) => sum + shoppingListTotal(list), 0));

  const billAmountForMonth = (bill: Bill) =>
    bill.type === "shopee" || bill.type === "tiktok"
      ? installmentChargeForMonth(bill, monthKey)
      : Number(bill.amount) || 0;

  const sumByType = (types: Bill["type"][]) =>
    round2(
      monthBills
        .filter((bill) => types.includes(bill.type))
        .reduce((sum, bill) => sum + billAmountForMonth(bill), 0),
    );

  const paidByType = (types: Bill["type"][]) =>
    round2(
      monthBills
        .filter((bill) => types.includes(bill.type))
        .reduce((sum, bill) => {
          if (bill.type === "shopee" || bill.type === "tiktok") {
            return sum + installmentPaidForMonth(bill, monthKey);
          }
          return sum + billPaidValue(bill);
        }, 0),
    );

  const electricity = sumByType(["meralco"]);
  const water = sumByType(["water"]);
  const internet = sumByType(["internet"]);
  const monthlyDues = sumByType(["monthly_due"]);
  const shopee = sumByType(["shopee"]);
  const tiktok = sumByType(["tiktok"]);
  const onlineShopping = round2(shopee + tiktok);
  const utilities = round2(electricity + water + internet);
  const billsTotal = round2(utilities + monthlyDues + onlineShopping);

  const rent = rentSummary(monthRent);
  const plannedRent = round2(
    memberContributions.reduce((sum, contribution) => sum + (Number(contribution) || 0), 0),
  );
  const rentExpected = round2(Math.max(plannedRent, rent.expected));
  const total = round2(grocery + billsTotal + rentExpected);
  const billsPaid = round2(
    utilities + monthlyDues + onlineShopping > 0
      ? paidByType(["meralco", "water", "internet", "monthly_due", "shopee", "tiktok"])
      : 0,
  );
  const paid = round2(grocery + billsPaid + rent.collected);
  const unpaid = round2(Math.max(total - paid, 0));

  return {
    total,
    paid,
    unpaid,
    grocery,
    utilities,
    rentExpected,
    rentCollected: rent.collected,
    onlineShopping,
    monthlyDues,
    electricity,
    water,
    internet,
    shopee,
    tiktok,
  };
}

export function toTransactions(
  bills: Bill[],
  shoppingLists: ShoppingList[],
  rentPayments: RentPayment[],
): TransactionRecord[] {
  const billTransactions: TransactionRecord[] = bills.map((bill) => ({
    id: bill.id,
    source: "bill",
    name: bill.title,
    category: bill.category ?? bill.type,
    group: bill.type,
    amount: Number(bill.amount) || 0,
    paidAmount: billPaidValue(bill),
    billingPeriod: bill.billingPeriod,
    dueDate: bill.dueDate,
    paidDate: bill.paidDate,
    status: resolveBillStatus(bill),
    hasReceipt: Boolean(bill.receiptUrl),
    createdAt: bill.createdAt,
  }));

  const rentTransactions: TransactionRecord[] = rentPayments.map((payment) => ({
    id: payment.id,
    source: "rent",
    name: `Rent — ${payment.memberName}`,
    category: "Rent",
    group: "rent",
    amount: Number(payment.amountPaid) || 0,
    paidAmount: Number(payment.amountPaid) || 0,
    billingPeriod: payment.billingPeriod,
    paidDate: payment.paymentDate,
    status: rentStatus(Number(payment.expectedAmount) || 0, Number(payment.amountPaid) || 0),
    hasReceipt: false,
    createdAt: payment.createdAt,
  }));

  const shoppingTransactions: TransactionRecord[] = shoppingLists.map((list) => ({
    id: list.id,
    source: "shopping",
    name: list.name,
    category: "Groceries",
    group: "grocery",
    amount: shoppingListTotal(list),
    paidAmount: list.status === "completed" ? shoppingListTotal(list) : 0,
    billingPeriod: (list.shoppingDate || "").slice(0, 7),
    dueDate: list.shoppingDate,
    paidDate: list.status === "completed" ? list.shoppingDate : undefined,
    status: list.status,
    hasReceipt: false,
    createdAt: list.createdAt,
  }));

  return [...billTransactions, ...rentTransactions, ...shoppingTransactions].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function sumTransactions(
  transactions: TransactionRecord[],
  predicate?: (transaction: TransactionRecord) => boolean,
): number {
  return round2(
    transactions
      .filter((transaction) => (predicate ? predicate(transaction) : true))
      .reduce((sum, transaction) => sum + transaction.amount, 0),
  );
}
