"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Info, Plus, Search, Trash2, X } from "lucide-react";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/common/button";
import { Field, Input, MoneyInput, Select } from "@/components/common/input";
import { Badge } from "@/components/common/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { addShoppingList, updateShoppingList } from "@/services/shoppingService";
import {
  shoppingItemSubtotal,
  shoppingListPurchasedTotal,
  shoppingListTotal,
} from "@/lib/calculations";
import { formatCurrency, toNumber } from "@/lib/format";
import { todayDateInput } from "@/lib/dates";
import { newId } from "@/lib/store";
import { GROCERY_UNITS, type Grocery, type ShoppingList, type ShoppingListItem } from "@/types";

interface ShoppingListModalProps {
  open: boolean;
  onClose: () => void;
  list: ShoppingList | null;
  groceries: Grocery[];
  currency: string;
  onSaved: () => Promise<void> | void;
}

export function ShoppingListModal({
  open,
  onClose,
  list,
  groceries,
  currency,
  onSaved,
}: ShoppingListModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [shoppingDate, setShoppingDate] = useState(todayDateInput());
  const [budget, setBudget] = useState("");
  const [status, setStatus] = useState<"draft" | "completed">("draft");
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerSelected, setPickerSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(list?.name ?? "");
    setShoppingDate(list?.shoppingDate ?? todayDateInput());
    setBudget(list ? String(list.budget || "") : "");
    setStatus(list?.status ?? "draft");
    setItems(list ? list.items.map((item) => ({ ...item })) : []);
    setPickerOpen(false);
    setPickerSearch("");
    setPickerSelected([]);
    setError(null);
  }, [open, list]);

  const total = useMemo(() => shoppingListTotal({ items }), [items]);
  const purchased = useMemo(() => shoppingListPurchasedTotal({ items }), [items]);
  const budgetValue = toNumber(budget);
  const remaining = budgetValue - total;

  const savedItemQuantities = useMemo(() => {
    const quantities = new Map<string, number>();
    items.forEach((item) => {
      if (!item.groceryId) return;
      quantities.set(item.groceryId, (quantities.get(item.groceryId) ?? 0) + item.quantity);
    });
    return quantities;
  }, [items]);

  const pickerGroceries = useMemo(() => {
    const term = pickerSearch.trim().toLowerCase();
    if (!term) return groceries;
    return groceries.filter((grocery) =>
      [grocery.name, grocery.brand, grocery.category, grocery.store]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(term)),
    );
  }, [groceries, pickerSearch]);

  const updateItem = (id: string, patch: Partial<ShoppingListItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const togglePickerSelection = (groceryId: string) => {
    setPickerSelected((current) =>
      current.includes(groceryId)
        ? current.filter((id) => id !== groceryId)
        : [...current, groceryId],
    );
  };

  const addSelectedSavedItems = () => {
    const chosen = groceries.filter((grocery) => pickerSelected.includes(grocery.id));
    if (chosen.length === 0) return;
    setItems((current) => {
      const next = [...current];
      chosen.forEach((grocery) => {
        const existingIndex = next.findIndex((item) => item.groceryId === grocery.id);
        if (existingIndex >= 0) {
          const existing = next[existingIndex];
          next[existingIndex] = { ...existing, quantity: existing.quantity + 1 };
          return;
        }
        next.push({
          id: newId(),
          groceryId: grocery.id,
          name: grocery.name,
          quantity: 1,
          unit: grocery.unit,
          unitPrice: grocery.currentPrice,
          purchased: false,
        });
      });
      return next;
    });
    setPickerSelected([]);
    setPickerSearch("");
    setPickerOpen(false);
  };

  const addCustomItem = () => {
    setItems((current) => [
      ...current,
      {
        id: newId(),
        name: "",
        quantity: 1,
        unit: "pc",
        unitPrice: 0,
        purchased: false,
      },
    ]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setError(null);
    if (!name.trim()) {
      setError("Please give this shopping list a name.");
      return;
    }
    const usableItems = items.filter((item) => item.name.trim());
    if (usableItems.length === 0) {
      setError("Add at least one item to the list.");
      return;
    }
    if (usableItems.some((item) => item.quantity <= 0)) {
      setError("Every item needs a quantity greater than zero.");
      return;
    }
    setBusy(true);
    try {
      const draft = {
        name: name.trim(),
        shoppingDate,
        budget: budgetValue,
        status,
        items: usableItems.map((item) => ({
          ...item,
          name: item.name.trim(),
          unitPrice: toNumber(item.unitPrice),
          quantity: toNumber(item.quantity),
        })),
        notes: list?.notes ?? "",
      };
      if (list) {
        await updateShoppingList(user.uid, list.id, draft);
        toast("Shopping list updated.");
      } else {
        await addShoppingList(user.uid, draft);
        toast("Shopping list saved.");
      }
      await onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this shopping list.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={list ? "Edit shopping list" : "New shopping list"}
      description="Subtotals and the grand total update as you type."
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="shopping-list-form" loading={busy}>
            {list ? "Save changes" : "Save list"}
          </Button>
        </>
      }
    >
      <form id="shopping-list-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="List name" requiredMark className="sm:col-span-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Weekly market run"
              required
            />
          </Field>
          <Field label="Shopping date">
            <Input
              type="date"
              value={shoppingDate}
              onChange={(event) => setShoppingDate(event.target.value)}
            />
          </Field>
          <Field label="Budget" hint="Optional estimate">
            <MoneyInput
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              placeholder="0.00"
            />
          </Field>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted">
              Items ({items.length})
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={pickerOpen ? "secondary" : "outline"}
                onClick={() => {
                  setPickerOpen((value) => !value);
                  setPickerSearch("");
                  setPickerSelected([]);
                }}
                disabled={groceries.length === 0}
              >
                <Search className="h-3.5 w-3.5" /> Add saved items
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={addCustomItem}>
                <Plus className="h-3.5 w-3.5" /> Custom item
              </Button>
            </div>
          </div>

          {pickerOpen ? (
            <div className="rounded-xl border border-line bg-background/60 p-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                  <Input
                    value={pickerSearch}
                    onChange={(event) => setPickerSearch(event.target.value)}
                    placeholder="Search saved items by name, brand, category, or store…"
                    className="h-9 pl-9 text-xs"
                    aria-label="Search saved items"
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPickerOpen(false);
                    setPickerSearch("");
                    setPickerSelected([]);
                  }}
                  className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                  aria-label="Close saved items picker"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {pickerGroceries.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-muted">
                  No saved items match “{pickerSearch}”.
                </p>
              ) : (
                <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                  {pickerGroceries.map((grocery) => {
                    const onListQuantity = savedItemQuantities.get(grocery.id);
                    const checked = pickerSelected.includes(grocery.id);
                    return (
                      <label
                        key={grocery.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-primary-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePickerSelection(grocery.id)}
                          className="h-4 w-4 shrink-0 rounded border-line text-primary-600 focus:ring-primary-400"
                          aria-label={
                            onListQuantity === undefined
                              ? `Select ${grocery.name}`
                              : `Add one more ${grocery.name}`
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-ink">{grocery.name}</p>
                          <p className="truncate text-[10px] text-muted">
                            {grocery.category || "Uncategorized"}
                            {grocery.brand ? ` · ${grocery.brand}` : ""}
                            {grocery.store ? ` · ${grocery.store}` : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-bold text-ink">
                            {formatCurrency(grocery.currentPrice, currency)}
                            <span className="text-[10px] font-semibold text-muted">/{grocery.unit}</span>
                          </p>
                          {onListQuantity !== undefined ? (
                            <Badge tone="success">On list ×{onListQuantity}</Badge>
                          ) : null}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
                <p className="text-[11px] font-semibold text-muted">
                  {pickerSelected.length} selected
                  <span className="font-normal"> · items already on the list get +1 quantity</span>
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={addSelectedSavedItems}
                  disabled={pickerSelected.length === 0}
                >
                  <Plus className="h-3.5 w-3.5" /> Add selected
                  {pickerSelected.length > 0 ? ` (${pickerSelected.length})` : ""}
                </Button>
              </div>
            </div>
          ) : null}

          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-background/60 px-4 py-8 text-center text-xs font-medium text-muted">
              Add products from your saved grocery items, or create a custom row.
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border border-line bg-background/50 p-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateItem(item.id, { purchased: !item.purchased })}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                        item.purchased
                          ? "border-success bg-success text-white"
                          : "border-line bg-surface text-transparent hover:border-primary-400"
                      }`}
                      aria-label={item.purchased ? "Mark as not purchased" : "Mark as purchased"}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <Input
                      value={item.name}
                      onChange={(event) => updateItem(item.id, { name: event.target.value })}
                      placeholder="Item name"
                      className={`h-9 flex-1 ${item.purchased ? "text-muted line-through" : ""}`}
                      aria-label="Item name"
                    />
                    <button
                      type="button"
                      onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
                      className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-8 gap-2">
                    <div className="col-span-3 sm:col-span-2">
                      <p className="mb-0.5 text-[10px] font-bold uppercase text-muted">Qty</p>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(item.id, { quantity: toNumber(event.target.value) })
                        }
                        className="h-8 px-2 py-1 text-xs"
                        aria-label="Quantity"
                      />
                      {item.unit === "kg" ? (
                        <p className="mt-0.5 text-[9px] text-muted">
                          = {(item.quantity * 1000).toFixed(0)} g
                        </p>
                      ) : null}
                    </div>
                    {item.unit === "kg" ? (
                      <div className="col-span-3 sm:col-span-2">
                        <p className="mb-0.5 text-[10px] font-bold uppercase text-muted">Spend</p>
                        <MoneyInput
                          value={item.quantity * item.unitPrice || ""}
                          onChange={(event) => {
                            const spend = toNumber(event.target.value);
                            if (item.unitPrice > 0) {
                              updateItem(item.id, { quantity: spend / item.unitPrice });
                            }
                          }}
                          placeholder="0.00"
                          className="h-8 py-1 text-xs"
                          aria-label="Amount to spend"
                        />
                      </div>
                    ) : null}
                    <div className="col-span-3 sm:col-span-2">
                      <p className="mb-0.5 text-[10px] font-bold uppercase text-muted">Unit</p>
                      <Select
                        value={item.unit}
                        onChange={(event) => updateItem(item.id, { unit: event.target.value })}
                        className="h-8 px-2 py-1 text-xs"
                        aria-label="Unit"
                      >
                        {GROCERY_UNITS.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <p className="mb-0.5 text-[10px] font-bold uppercase text-muted">Unit price</p>
                      <MoneyInput
                        value={item.unitPrice}
                        onChange={(event) =>
                          updateItem(item.id, { unitPrice: toNumber(event.target.value) })
                        }
                        className="h-8 py-1 text-xs"
                        aria-label="Unit price"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <p className="mb-0.5 text-[10px] font-bold uppercase text-muted">Subtotal</p>
                      <div className="flex h-8 items-center rounded-lg bg-surface px-2 text-xs font-extrabold text-ink">
                        {formatCurrency(shoppingItemSubtotal(item), currency)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-3 rounded-2xl border border-line bg-background p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted">Estimated total</span>
              <span className="text-base font-extrabold text-ink">
                {formatCurrency(total, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted">Purchased</span>
              <span className="font-bold text-success">{formatCurrency(purchased, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted">Budget remaining</span>
              <span className={`font-bold ${remaining < 0 ? "text-danger" : "text-primary-700"}`}>
                {budgetValue > 0 ? formatCurrency(remaining, currency) : "No budget set"}
              </span>
            </div>
            {budgetValue > 0 ? (
              <div className="h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className={`h-full rounded-full ${remaining < 0 ? "bg-danger" : "bg-primary-500"}`}
                  style={{ width: `${Math.min((total / budgetValue) * 100, 100)}%` }}
                />
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <Field label="List status">
              <Select
                value={status}
                onChange={(event) => setStatus(event.target.value as "draft" | "completed")}
              >
                <option value="draft">Draft — still shopping</option>
                <option value="completed">Completed — shopping done</option>
              </Select>
            </Field>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setItems((current) => current.map((item) => ({ ...item, purchased: true })))
              }
              disabled={items.length === 0}
            >
              <Check className="h-3.5 w-3.5" /> Mark all purchased
            </Button>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-primary-50 px-3 py-2.5 text-[11px] font-medium leading-5 text-primary-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Changing a price here only affects this list. Your permanent grocery price and
            price history stay untouched.
          </span>
        </div>

        {error ? (
          <p className="rounded-xl bg-danger/5 px-3 py-2 text-xs font-semibold text-danger">{error}</p>
        ) : null}
      </form>
    </Modal>
  );
}
