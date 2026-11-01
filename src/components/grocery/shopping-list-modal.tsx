"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Info, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/common/button";
import { Field, Input, MoneyInput, Select } from "@/components/common/input";
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
  const [selectedGrocery, setSelectedGrocery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(list?.name ?? "");
    setShoppingDate(list?.shoppingDate ?? todayDateInput());
    setBudget(list ? String(list.budget || "") : "");
    setStatus(list?.status ?? "draft");
    setItems(list ? list.items.map((item) => ({ ...item })) : []);
    setSelectedGrocery("");
    setError(null);
  }, [open, list]);

  const total = useMemo(() => shoppingListTotal({ items }), [items]);
  const purchased = useMemo(() => shoppingListPurchasedTotal({ items }), [items]);
  const budgetValue = toNumber(budget);
  const remaining = budgetValue - total;

  const updateItem = (id: string, patch: Partial<ShoppingListItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const addSavedItem = (groceryId: string) => {
    const grocery = groceries.find((entry) => entry.id === groceryId);
    if (!grocery) return;
    setItems((current) => [
      ...current,
      {
        id: newId(),
        groceryId: grocery.id,
        name: grocery.name,
        quantity: 1,
        unit: grocery.unit,
        unitPrice: grocery.currentPrice,
        purchased: false,
      },
    ]);
    setSelectedGrocery("");
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
              <Select
                value={selectedGrocery}
                onChange={(event) => addSavedItem(event.target.value)}
                className="h-9 w-[220px] py-1.5 text-xs"
                aria-label="Add a saved grocery item"
              >
                <option value="">Add from saved items…</option>
                {groceries.map((grocery) => (
                  <option key={grocery.id} value={grocery.id}>
                    {grocery.name} — {formatCurrency(grocery.currentPrice, currency)}/{grocery.unit}
                  </option>
                ))}
              </Select>
              <Button type="button" size="sm" variant="outline" onClick={addCustomItem}>
                <Plus className="h-3.5 w-3.5" /> Custom item
              </Button>
            </div>
          </div>

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
                        step="0.01"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(item.id, { quantity: toNumber(event.target.value) })
                        }
                        className="h-8 px-2 py-1 text-xs"
                        aria-label="Quantity"
                      />
                    </div>
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
