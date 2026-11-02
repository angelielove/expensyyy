"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Plus, X } from "lucide-react";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/common/button";
import { Field, Input, Select, Textarea } from "@/components/common/input";
import { Badge } from "@/components/common/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { addGroceries } from "@/services/groceryService";
import { GROCERY_CATEGORIES, GROCERY_UNITS } from "@/types";
import { parseGroceryImport, type GroceryImportItem } from "@/lib/grocery-import";
import { formatCurrency } from "@/lib/format";

interface BulkAddGroceryModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  currency?: string;
}

interface EditableItem {
  name: string;
  category: string;
  brand: string;
  unit: string;
  currentPrice: string;
  quantity: string;
  store: string;
  dateAdded: string;
}

const PLACEHOLDER = [
  "Paste items like:",
  "Jasmine rice 5 kg ₱250",
  "Eggs 12 pc 150",
  "• 2 Milk 1L @95.00 — 190.00V",
  "",
  "Or CSV with headers:",
  "name,quantity,unit,price,category",
  "Cooking oil,1,L,180,Drinks",
].join("\n");

function toEditable(item: GroceryImportItem): EditableItem {
  return {
    name: item.name,
    category: item.category,
    brand: item.brand,
    unit: item.unit,
    currentPrice: String(item.currentPrice),
    quantity: String(item.quantity),
    store: item.store,
    dateAdded: item.dateAdded,
  };
}

function toNumber(value: string) {
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function BulkAddGroceryModal({
  open,
  onClose,
  onSaved,
  currency = "PHP",
}: BulkAddGroceryModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [category, setCategory] = useState("");
  const [store, setStore] = useState("");
  const [unit, setUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [items, setItems] = useState<EditableItem[]>([]);
  const [errors, setErrors] = useState<Array<{ line: number; raw: string; message: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setText("");
      setCategory("");
      setStore("");
      setUnit("");
      setQuantity("");
      setItems([]);
      setErrors([]);
      setError(null);
      setBusy(false);
      return;
    }
  }, [open]);

  const parsed = useMemo(
    () =>
      parseGroceryImport(text, {
        category: category || undefined,
        store: store.trim() || undefined,
        unit: unit || undefined,
        quantity: quantity ? toNumber(quantity) : undefined,
      }),
    [text, category, store, unit, quantity],
  );

  const previewItems = useMemo(() => parsed.items.slice(0, 25), [parsed.items]);

  const handleParse = () => {
    setError(null);
    if (parsed.items.length === 0) {
      setItems([]);
      setErrors(parsed.errors);
      setError(
        parsed.errors[0]
          ? parsed.errors[0].message
          : "No items found. Add prices (e.g. 'Rice 1kg 250') or CSV headers like name,price.",
      );
      return;
    }
    setItems(parsed.items.map(toEditable));
    setErrors(parsed.errors);
    setError(parsed.errors[0] ? `Review ${parsed.errors.length} line${parsed.errors.length === 1 ? "" : "s"} with issues.` : null);
  };

  const updateItem = (index: number, patch: Partial<EditableItem>) => {
    setItems((prev) => prev.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const total = useMemo(
    () => items.reduce((sum, item) => sum + toNumber(item.currentPrice) * toNumber(item.quantity), 0),
    [items],
  );

  const handleSubmit = async () => {
    if (!user) return;
    setError(null);
    if (items.length === 0) {
      setError("Add items to import first.");
      return;
    }
    for (const [index, item] of items.entries()) {
      if (!item.name.trim()) {
        setError(`Row ${index + 1}: item name is required.`);
        return;
      }
      if (toNumber(item.currentPrice) < 0) {
        setError(`Row ${index + 1}: price must be valid.`);
        return;
      }
      if (toNumber(item.quantity) <= 0) {
        setError(`Row ${index + 1}: quantity must be greater than zero.`);
        return;
      }
    }
    setBusy(true);
    try {
      const drafts = items.map((item) => ({
        name: item.name.trim(),
        category: item.category || undefined,
        brand: item.brand.trim() || undefined,
        unit: item.unit || "pc",
        currentPrice: toNumber(item.currentPrice),
        quantity: toNumber(item.quantity),
        store: item.store.trim() || undefined,
        dateAdded: item.dateAdded || undefined,
      }));
      await addGroceries(user.uid, drafts);
      toast(`Added ${drafts.length} grocery item${drafts.length === 1 ? "" : "s"}.`);
      await onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not import items.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bulk add grocery items"
      description="Paste text, lines, or CSV and we'll parse prices, quantities, and units."
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {items.length === 0 ? (
            <Button onClick={handleParse} disabled={!text.trim()}>
              <FileText className="h-4 w-4" /> Parse items
            </Button>
          ) : (
            <Button onClick={() => void handleSubmit()} loading={busy}>
              <Plus className="h-4 w-4" /> Add {items.length} item{items.length === 1 ? "" : "s"}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {items.length === 0 ? (
          <>
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={PLACEHOLDER}
              className="min-h-[180px] font-mono text-xs"
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Default category" hint="Applied if missing">
                <Select value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="">Auto-detect</option>
                  {GROCERY_CATEGORIES.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Default unit" hint="Applied if missing">
                <Select value={unit} onChange={(event) => setUnit(event.target.value)}>
                  <option value="">Auto-detect / pc</option>
                  {GROCERY_UNITS.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Default quantity" hint="Applied if missing">
                <Input
                  type="number"
                  min="0.01"
                  step="any"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="e.g. 1"
                />
              </Field>
              <Field label="Default store" hint="Applied if missing">
                <Input
                  value={store}
                  onChange={(event) => setStore(event.target.value)}
                  placeholder="e.g. SM Market"
                />
              </Field>
            </div>
            {text.trim() ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <Badge tone="neutral">{parsed.items.length} parsed</Badge>
                {parsed.errors.length > 0 ? <Badge tone="danger">{parsed.errors.length} issues</Badge> : null}
                {previewItems.length > 0 ? (
                  <span>
                    Preview: {previewItems.map((item) => item.name).join(", ")}
                    {parsed.items.length > previewItems.length ? "…" : ""}
                  </span>
                ) : null}
              </div>
            ) : null}
            {parsed.errors.length > 0 && text.trim() ? (
              <div className="max-h-40 overflow-auto rounded-xl border border-danger/30 bg-danger/5 p-3 text-xs">
                <p className="mb-2 font-semibold text-danger">Lines that need fixing</p>
                <ul className="space-y-1">
                  {parsed.errors.slice(0, 10).map((err) => (
                    <li key={`${err.line}-${err.raw}`}>
                      <span className="font-mono">Line {err.line}:</span> {err.message}
                    </li>
                  ))}
                  {parsed.errors.length > 10 ? <li>…and {parsed.errors.length - 10} more</li> : null}
                </ul>
              </div>
            ) : null}
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">
                {items.length} item{items.length === 1 ? "" : "s"} ready to add
              </p>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>Estimated total: {formatCurrency(total, currency)}</span>
                <Button size="sm" variant="ghost" onClick={() => setItems([])}>
                  Edit paste
                </Button>
              </div>
            </div>
            <div className="max-h-[50vh] overflow-auto rounded-xl border border-line">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-background text-[10px] uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2 font-bold">Name</th>
                    <th className="px-3 py-2 font-bold">Category</th>
                    <th className="px-3 py-2 font-bold">Unit</th>
                    <th className="px-3 py-2 text-right font-bold">Qty</th>
                    <th className="px-3 py-2 text-right font-bold">Price</th>
                    <th className="px-3 py-2 font-bold">Store</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2">
                        <Input
                          value={item.name}
                          onChange={(event) => updateItem(index, { name: event.target.value })}
                          className="h-8 px-2 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={item.category}
                          onChange={(event) => updateItem(index, { category: event.target.value })}
                          className="h-8 px-2 text-xs"
                        >
                          <option value="">No category</option>
                          {GROCERY_CATEGORIES.map((entry) => (
                            <option key={entry} value={entry}>
                              {entry}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={item.unit}
                          onChange={(event) => updateItem(index, { unit: event.target.value })}
                          className="h-8 px-2 text-xs"
                        >
                          {GROCERY_UNITS.map((entry) => (
                            <option key={entry} value={entry}>
                              {entry}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.quantity}
                          onChange={(event) => updateItem(index, { quantity: event.target.value })}
                          className="h-8 w-16 px-2 text-right text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={item.currentPrice}
                          onChange={(event) => updateItem(index, { currentPrice: event.target.value })}
                          className="h-8 w-24 px-2 text-right text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={item.store}
                          onChange={(event) => updateItem(index, { store: event.target.value })}
                          className="h-8 px-2 text-xs"
                          placeholder="—"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="rounded-lg p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger"
                          aria-label="Remove row"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {errors.length > 0 ? (
              <p className="text-xs text-muted">
                {errors.length} pasted line{errors.length === 1 ? "" : "s"} were skipped.
              </p>
            ) : null}
          </div>
        )}
        {error ? <p className="rounded-xl bg-danger/5 px-3 py-2 text-xs font-semibold text-danger">{error}</p> : null}
      </div>
    </Modal>
  );
}
