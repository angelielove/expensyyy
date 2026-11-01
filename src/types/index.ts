export type CurrencyCode =
  | "PHP"
  | "USD"
  | "EUR"
  | "GBP"
  | "JPY"
  | "AUD"
  | "CAD"
  | "SGD"
  | "AED";

export type PaymentStatus = "unpaid" | "paid" | "overdue" | "partial";
export type BillType = "meralco" | "water" | "internet" | "monthly_due" | "shopee" | "tiktok";
export type OnlineShopType = "shopee" | "tiktok";
export type PurchaseType = "full" | "installment";
export type ThemePreference = "light" | "dark";
export type ShoppingListStatus = "draft" | "completed";

export interface BaseRecord {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberContribution {
  id: string;
  name: string;
  contribution: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  currency: CurrencyCode;
  dateFormat: string;
  theme: ThemePreference;
  householdName: string;
  members: MemberContribution[];
  waterMinimumCharge: number;
  waterMinimumConsumption: number;
  waterExcessRate: number;
  electricityRate: number;
  defaultMonthView: string;
  createdAt?: string;
  updatedAt?: string;
}

export const GROCERY_CATEGORIES = [
  "Rice and grains",
  "Meat",
  "Seafood",
  "Vegetables",
  "Fruits",
  "Dairy",
  "Drinks",
  "Snacks",
  "Household supplies",
  "Personal care",
  "Other",
] as const;

export const GROCERY_UNITS = [
  "pc",
  "kg",
  "g",
  "L",
  "mL",
  "pack",
  "sack",
  "bottle",
  "can",
  "dozen",
  "bundle",
] as const;

export interface Grocery extends BaseRecord {
  name: string;
  category?: string;
  brand?: string;
  unit: string;
  currentPrice: number;
  quantity: number;
  store?: string;
  dateAdded: string;
}

export interface GroceryPriceHistory extends BaseRecord {
  groceryId: string;
  itemName: string;
  previousPrice: number;
  newPrice: number;
  date: string;
  store?: string;
}

export interface ShoppingListItem {
  id: string;
  groceryId?: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  purchased: boolean;
}

export interface ShoppingList extends BaseRecord {
  name: string;
  shoppingDate: string;
  budget: number;
  status: ShoppingListStatus;
  items: ShoppingListItem[];
  notes?: string;
}

export interface Bill extends BaseRecord {
  type: BillType;
  title: string;
  category?: string;
  billingPeriod: string;
  billingDate?: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: PaymentStatus;
  paidDate?: string;
  receiptUrl?: string;
  receiptName?: string;
  notes?: string;
  provider?: string;
  orderDate?: string;
  orderAmount?: number;
  paymentMethod?: string;
  purchaseType?: PurchaseType;
  installmentMonths?: number;
  installmentAmount?: number;
  installmentsPaid?: number;
  previousReading?: number;
  currentReading?: number;
  consumption?: number;
  ratePerKwh?: number;
  minimumCharge?: number;
  minimumConsumption?: number;
  excessRate?: number;
}

export interface RentPayment extends BaseRecord {
  billingPeriod: string;
  memberId: string;
  memberName: string;
  expectedAmount: number;
  amountPaid: number;
  paymentDate?: string;
  status: PaymentStatus;
  notes?: string;
}

export interface DashboardTotals {
  total: number;
  paid: number;
  unpaid: number;
  grocery: number;
  utilities: number;
  rentExpected: number;
  rentCollected: number;
  onlineShopping: number;
  monthlyDues: number;
  electricity: number;
  water: number;
  internet: number;
  shopee: number;
  tiktok: number;
}

export interface TransactionRecord {
  id: string;
  source: "bill" | "rent" | "shopping";
  name: string;
  category: string;
  group: BillType | "rent" | "grocery";
  amount: number;
  paidAmount: number;
  billingPeriod: string;
  dueDate?: string;
  paidDate?: string;
  status: PaymentStatus | ShoppingListStatus;
  hasReceipt: boolean;
  createdAt: string;
}

export interface ReceiptUpload {
  url: string;
  name: string;
}
