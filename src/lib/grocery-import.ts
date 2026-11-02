import { todayDateInput } from "@/lib/dates";
import { GROCERY_CATEGORIES } from "@/types";

export interface GroceryImportDefaults {
  category?: string;
  store?: string;
  unit?: string;
  quantity?: number;
  dateAdded?: string;
}

export interface GroceryImportItem {
  name: string;
  category: string;
  brand: string;
  unit: string;
  currentPrice: number;
  quantity: number;
  store: string;
  dateAdded: string;
}

export interface GroceryImportError {
  line: number;
  raw: string;
  message: string;
}

export interface GroceryImportResult {
  items: GroceryImportItem[];
  errors: GroceryImportError[];
}

interface RawItem {
  name: string;
  price: number | null;
  quantity: number | null;
  unit: string;
  category: string;
  brand: string;
  store: string;
  dateAdded: string;
}

const UNIT_ALIASES: Record<string, string> = {
  pc: "pc",
  pcs: "pc",
  piece: "pc",
  pieces: "pc",
  kg: "kg",
  kgs: "kg",
  kilo: "kg",
  kilos: "kg",
  kilogram: "kg",
  kilograms: "kg",
  g: "g",
  gr: "g",
  gram: "g",
  grams: "g",
  l: "L",
  lt: "L",
  ltr: "L",
  liter: "L",
  liters: "L",
  litre: "L",
  litres: "L",
  ml: "mL",
  mls: "mL",
  milliliter: "mL",
  milliliters: "mL",
  pack: "pack",
  packs: "pack",
  packet: "pack",
  packets: "pack",
  sack: "sack",
  sacks: "sack",
  bottle: "bottle",
  bottles: "bottle",
  can: "can",
  cans: "can",
  dozen: "dozen",
  dozens: "dozen",
  bundle: "bundle",
  bundles: "bundle",
};

const HEADER_ALIASES: Record<string, string> = {
  name: "name",
  item: "name",
  itemname: "name",
  product: "name",
  grocery: "name",
  groceries: "name",
  quantity: "quantity",
  qty: "quantity",
  count: "quantity",
  unit: "unit",
  uom: "unit",
  measure: "unit",
  price: "price",
  cost: "price",
  amount: "price",
  currentprice: "price",
  unitprice: "price",
  rate: "price",
  category: "category",
  type: "category",
  group: "category",
  brand: "brand",
  store: "store",
  shop: "store",
  market: "store",
  vendor: "store",
  supplier: "store",
  date: "date",
  dateadded: "date",
  added: "date",
  purchased: "date",
};

const CATEGORY_KEYWORDS: Array<[string, string[]]> = [
  [
    "Rice and grains",
    ["rice", "grain", "corn", "oats", "cereal", "pasta", "noodle", "flour", "bread"],
  ],
  ["Meat", ["pork", "beef", "chicken", "meat", "sausage", "hotdog", "ham", "bacon", "liver"]],
  ["Seafood", ["fish", "shrimp", "prawn", "squid", "crab", "tuna", "sardine", "mackerel", "shellfish"]],
  [
    "Vegetables",
    [
      "onion",
      "garlic",
      "tomato",
      "potato",
      "carrot",
      "cabbage",
      "eggplant",
      "squash",
      "pepper",
      "ginger",
      "kangkong",
      "lettuce",
      "broccoli",
      "bean",
      "vegetable",
      "kalabasa",
      "ampalaya",
      "okra",
    ],
  ],
  [
    "Fruits",
    [
      "apple",
      "banana",
      "mango",
      "orange",
      "grape",
      "lemon",
      "watermelon",
      "pineapple",
      "papaya",
      "fruit",
      "avocado",
      "melon",
    ],
  ],
  ["Dairy", ["milk", "cheese", "butter", "yogurt", "cream", "egg", "dairy"]],
  [
    "Drinks",
    ["water", "juice", "soda", "coffee", "tea", "beer", "wine", "cola", "softdrink", "drink", "beverage"],
  ],
  ["Snacks", ["chips", "biscuit", "cookie", "candy", "chocolate", "cracker", "snack", "nuts"]],
  [
    "Household supplies",
    [
      "detergent",
      "bleach",
      "cleanser",
      "dishwashing",
      "trash bag",
      "tissue",
      "fabric softener",
      "laundry",
      "mop",
      "broom",
    ],
  ],
  [
    "Personal care",
    [
      "shampoo",
      "toothpaste",
      "toothbrush",
      "deodorant",
      "lotion",
      "sanitary",
      "diaper",
      "razor",
      "conditioner",
      "soap",
    ],
  ],
];

function normalizeUnit(value: string): string {
  return UNIT_ALIASES[value.trim().toLowerCase().replace(/\.$/, "")] ?? "";
}

function normalizeCategory(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "";
  return GROCERY_CATEGORIES.find((entry) => entry.toLowerCase() === normalized) ?? "";
}

const CATEGORY_MATCHERS: Array<[string, RegExp[]]> = CATEGORY_KEYWORDS.map(
  ([category, keywords]) => [
    category,
    keywords.map(
      (keyword) =>
        new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?\\b`, "i"),
    ),
  ],
);

function guessCategory(name: string): string {
  for (const [category, matchers] of CATEGORY_MATCHERS) {
    if (matchers.some((matcher) => matcher.test(name))) return category;
  }
  return "";
}

export function parseImportAmount(value: string): number | null {
  const cleaned = value
    .replace(/[₱$€£¥]/g, "")
    .replace(/php/gi, "")
    .replace(/,/g, "")
    .trim();
  if (!/^\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseQuantityUnit(value: string): { quantity: number; unit: string } | null {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/);
  if (!match) return null;
  const unit = normalizeUnit(match[2]);
  if (!unit) return null;
  return { quantity: Number(match[1]), unit };
}

function normalizeDate(value: string, fallback: string): string {
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : fallback;
}

function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function splitLine(line: string): string[] | null {
  if (line.includes("\t")) return line.split("\t").map((entry) => entry.trim());
  const commaCount = (line.match(/,/g) ?? []).length;
  if (commaCount === 0) return null;
  if (commaCount >= 2) return splitCsvLine(line);
  const after = line.slice(line.indexOf(",") + 1);
  if (/^\s/.test(after) || !/^\d{3}(?:\D|$)/.test(after.trim())) {
    return splitCsvLine(line);
  }
  return null;
}

function headerField(value: string): string | null {
  const normalized = value.toLowerCase().replace(/[^a-z]/g, "");
  return HEADER_ALIASES[normalized] ?? null;
}

function finalize(raw: RawItem, defaults: GroceryImportDefaults): GroceryImportItem | string {
  const name = raw.name.trim();
  if (!name) return "Missing item name.";
  if (raw.price === null || !Number.isFinite(raw.price) || raw.price < 0) {
    return "Missing or invalid price.";
  }
  return {
    name,
    category: raw.category || defaults.category || guessCategory(name),
    brand: raw.brand.trim(),
    unit: raw.unit || defaults.unit || "pc",
    currentPrice: raw.price,
    quantity:
      raw.quantity && raw.quantity > 0 ? raw.quantity : defaults.quantity && defaults.quantity > 0
        ? defaults.quantity
        : 1,
    store: raw.store.trim() || defaults.store?.trim() || "",
    dateAdded: normalizeDate(raw.dateAdded, defaults.dateAdded || todayDateInput()),
  };
}

function parseFields(fields: string[]): RawItem | string {
  const name = fields[0] ?? "";
  if (!name.trim()) return "Missing item name.";
  const rest = fields.slice(1);
  let priceIndex = -1;
  let price: number | null = null;
  for (let index = rest.length - 1; index >= 0; index -= 1) {
    const value = parseImportAmount(rest[index]);
    if (value !== null) {
      price = value;
      priceIndex = index;
      break;
    }
  }
  if (price === null) return "Missing or invalid price.";

  let quantity: number | null = null;
  let unit = "";
  let category = "";
  rest.forEach((field, index) => {
    if (index === priceIndex || !field) return;
    const combo = parseQuantityUnit(field);
    if (combo && quantity === null && !unit) {
      quantity = combo.quantity;
      unit = combo.unit;
      return;
    }
    const amount = parseImportAmount(field);
    if (amount !== null) {
      if (quantity === null) quantity = amount;
      return;
    }
    const parsedUnit = normalizeUnit(field);
    if (parsedUnit && !unit) {
      unit = parsedUnit;
      return;
    }
    const parsedCategory = normalizeCategory(field);
    if (parsedCategory && !category) category = parsedCategory;
  });

  return {
    name,
    price,
    quantity,
    unit,
    category,
    brand: "",
    store: "",
    dateAdded: "",
  };
}

function parseReceiptLine(line: string): RawItem | string {
  const bulletIndex = line.indexOf("•");
  const cleaned = bulletIndex >= 0 ? line.slice(bulletIndex) : line;
  const match = cleaned
    .trim()
    .match(
      /^[\s•·*]*(\d+(?:\.\d+)?)\s+(.+?)\s+(?:@\s*([\d.,]+)\s+)?(?:[—–]|\s+-\s+)\s*([\d.,]+)\s*[A-Za-z]?\s*$/,
    );
  if (!match) return "Could not read this receipt line. Expected: qty ITEM @price — total.";
  const quantity = parseImportAmount(match[1]);
  const name = match[2].replace(/\s+/g, " ").trim();
  const unitPrice = match[3] ? parseImportAmount(match[3]) : null;
  const lineTotal = parseImportAmount(match[4]);
  if (!name) return "Missing item name.";
  if (lineTotal === null) return "Missing or invalid total.";
  if (quantity === null || quantity <= 0) return "Quantity should be greater than zero.";
  const price =
    unitPrice !== null ? unitPrice : Math.round((lineTotal / quantity + Number.EPSILON) * 100) / 100;
  return {
    name,
    price,
    quantity,
    unit: "",
    category: "",
    brand: "",
    store: "",
    dateAdded: "",
  };
}

function parseFreeform(line: string): RawItem | string {
  if (/[—–]|\s-\s/.test(line)) return parseReceiptLine(line);
  const tokens = line.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return "Add a price after the item name.";
  let index = tokens.length - 1;
  const price = parseImportAmount(tokens[index]);
  if (price === null) return "Add a price at the end, e.g. “Jasmine rice 5 kg 250”.";
  index -= 1;

  let quantity: number | null = null;
  let unit = "";
  if (index >= 0) {
    const combo = parseQuantityUnit(tokens[index]);
    if (combo) {
      quantity = combo.quantity;
      unit = combo.unit;
      index -= 1;
    }
  }
  if (!unit && index >= 0) {
    const parsedUnit = normalizeUnit(tokens[index]);
    if (parsedUnit) {
      unit = parsedUnit;
      index -= 1;
    }
  }
  if (quantity === null && index >= 0) {
    const amount = parseImportAmount(tokens[index]);
    if (amount !== null && /^\d/.test(tokens[index])) {
      quantity = amount;
      index -= 1;
    }
  }

  const name = tokens.slice(0, index + 1).join(" ").replace(/[,\s]+$/, "").trim();
  if (!name) return "Missing item name.";

  return {
    name,
    price,
    quantity,
    unit,
    category: "",
    brand: "",
    store: "",
    dateAdded: "",
  };
}

function parseHeaderLine(fields: string[], map: Record<string, number>): RawItem {
  const get = (key: string): string => {
    const index = map[key];
    return index === undefined ? "" : fields[index] ?? "";
  };
  const quantity = parseImportAmount(get("quantity"));
  return {
    name: get("name"),
    price: parseImportAmount(get("price")),
    quantity: quantity !== null && quantity > 0 ? quantity : null,
    unit: normalizeUnit(get("unit")),
    category: normalizeCategory(get("category")),
    brand: get("brand"),
    store: get("store"),
    dateAdded: get("date"),
  };
}

export function parseGroceryImport(
  text: string,
  defaults: GroceryImportDefaults = {},
): GroceryImportResult {
  const items: GroceryImportItem[] = [];
  const errors: GroceryImportError[] = [];
  const lines = text.split(/\r?\n/);
  let header: { lineIndex: number; map: Record<string, number> } | null = null;

  const firstIndex = lines.findIndex((line) => line.trim() !== "");
  if (firstIndex >= 0) {
    const cells = splitLine(lines[firstIndex]);
    if (cells && cells.length >= 2) {
      const map: Record<string, number> = {};
      cells.forEach((cell, index) => {
        const key = headerField(cell);
        if (key && map[key] === undefined) map[key] = index;
      });
      if (map.name !== undefined && map.price !== undefined) {
        header = { lineIndex: firstIndex, map };
      }
    }
  }

  lines.forEach((raw, index) => {
    if (!raw.trim()) return;
    if (header && index === header.lineIndex) return;
    const cells = splitLine(raw);
    const parsed = header
      ? parseHeaderLine(cells ?? splitCsvLine(raw), header.map)
      : cells
        ? parseFields(cells)
        : parseFreeform(raw);
    if (typeof parsed === "string") {
      errors.push({ line: index + 1, raw: raw.trim(), message: parsed });
      return;
    }
    const finalized = finalize(parsed, defaults);
    if (typeof finalized === "string") {
      errors.push({ line: index + 1, raw: raw.trim(), message: finalized });
      return;
    }
    items.push(finalized);
  });

  return { items, errors };
}
