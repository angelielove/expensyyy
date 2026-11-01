"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/common/button";
import { Field, Input, MoneyInput, Select } from "@/components/common/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { addGrocery, updateGrocery } from "@/services/groceryService";
import { todayDateInput } from "@/lib/dates";
import { toNumber } from "@/lib/format";
import { GROCERY_CATEGORIES, GROCERY_UNITS, type Grocery } from "@/types";

interface GroceryItemModalProps {
  open: boolean;
  onClose: () => void;
  item: Grocery | null;
  onSaved: () => Promise<void> | void;
}

export function GroceryItemModal({ open, onClose, item, onSaved }: GroceryItemModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("");
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState("pc");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [store, setStore] = useState("");
  const [dateAdded, setDateAdded] = useState(todayDateInput());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? "");
    setCategory(item?.category ?? "");
    setBrand(item?.brand ?? "");
    setUnit(item?.unit ?? "pc");
    setPrice(item ? String(item.currentPrice) : "");
    setQuantity(item ? String(item.quantity) : "1");
    setStore(item?.store ?? "");
    setDateAdded(item?.dateAdded ?? todayDateInput());
    setError(null);
  }, [open, item]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setError(null);
    if (!name.trim()) {
      setError("Please enter the item name.");
      return;
    }
    if (!price || toNumber(price) < 0) {
      setError("Please enter a valid current price.");
      return;
    }
    if (toNumber(quantity) <= 0) {
      setError("Quantity should be greater than zero.");
      return;
    }
    setBusy(true);
    try {
      const draft = {
        name: name.trim(),
        category,
        brand: brand.trim(),
        unit,
        currentPrice: toNumber(price),
        quantity: toNumber(quantity),
        store: store.trim(),
        dateAdded,
      };
      if (item) {
        await updateGrocery(user.uid, item, draft);
        toast("Grocery item updated.");
      } else {
        await addGrocery(user.uid, draft);
        toast("Grocery item added.");
      }
      await onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this item.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? "Edit grocery item" : "Add grocery item"}
      description="Keep your everyday prices up to date so your lists stay accurate."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="grocery-item-form" loading={busy}>
            {item ? "Save changes" : "Add item"}
          </Button>
        </>
      }
    >
      <form id="grocery-item-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Item name" requiredMark className="sm:col-span-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Jasmine rice"
              required
            />
          </Field>
          <Field label="Category" hint="Optional">
            <Select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">No category</option>
              {GROCERY_CATEGORIES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Brand" hint="Optional">
            <Input
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              placeholder="e.g. Golden Swan"
            />
          </Field>
          <Field label="Unit">
            <Select value={unit} onChange={(event) => setUnit(event.target.value)}>
              {GROCERY_UNITS.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Current price" requiredMark>
            <MoneyInput
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="0.00"
              required
            />
          </Field>
          <Field label="Quantity">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </Field>
          <Field label="Store" hint="Optional">
            <Input
              value={store}
              onChange={(event) => setStore(event.target.value)}
              placeholder="e.g. SM Market"
            />
          </Field>
          <Field label="Date added" className="sm:col-span-2">
            <Input
              type="date"
              value={dateAdded}
              onChange={(event) => setDateAdded(event.target.value)}
            />
          </Field>
        </div>

        {item ? (
          <div className="flex items-start gap-2 rounded-xl bg-primary-50 px-3 py-2.5 text-[11px] font-medium leading-5 text-primary-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Changing the price saves the old price to your price history automatically.
              Past records are never overwritten.
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
