"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  History,
  ListChecks,
  Minus,
  Pencil,
  Plus,
  Search,
  ShoppingBasket,
  Store,
  Tags,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/contexts/ToastContext";
import { PageHeader } from "@/components/common/page-header";
import { Tabs } from "@/components/common/tabs";
import { Card, CardHeader } from "@/components/common/card";
import { Button } from "@/components/common/button";
import { Input, Select } from "@/components/common/input";
import { Badge, StatusBadge } from "@/components/common/badge";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/modal";
import { StatCard } from "@/components/common/stat-card";
import { GroceryItemModal } from "@/components/grocery/grocery-item-modal";
import { ShoppingListModal } from "@/components/grocery/shopping-list-modal";
import { BulkAddGroceryModal } from "@/components/grocery/bulk-add-grocery-modal";
import { deleteGrocery, deleteGroceries } from "@/services/groceryService";
import { deleteShoppingList } from "@/services/shoppingService";
import { priceChange, shoppingListTotal } from "@/lib/calculations";
import { formatCurrency, formatNumber } from "@/lib/format";
import { formatDate, monthLabel } from "@/lib/dates";
import { GROCERY_CATEGORIES, type Grocery, type ShoppingList } from "@/types";

type TabId = "items" | "history" | "lists";
type DeleteTarget = { kind: "item" | "list"; id: string; label: string };

export default function GroceryPage() {
  const { profile, groceries, priceHistory, shoppingLists, reload } = useData();
  const { toast } = useToast();
  const currency = profile?.currency ?? "PHP";

  const [tab, setTab] = useState<TabId>("items");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("name");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Grocery | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryTab = params.get("tab");
    if (queryTab === "history" || queryTab === "lists" || queryTab === "items") {
      setTab(queryTab);
    }
    if (params.get("new") === "1") {
      setEditingItem(null);
      setItemModalOpen(true);
    }
    if (params.get("tab") || params.get("new")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const pendingListId = sessionStorage.getItem("expensyyy:editShoppingList");
    if (!pendingListId) return;
    const list = shoppingLists.find((entry) => entry.id === pendingListId);
    sessionStorage.removeItem("expensyyy:editShoppingList");
    if (list) {
      setTab("lists");
      setEditingList(list);
      setListModalOpen(true);
    }
  }, [shoppingLists]);

  const filteredGroceries = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = groceries.filter((item) => {
      const matchesTerm =
        !term ||
        item.name.toLowerCase().includes(term) ||
        (item.brand ?? "").toLowerCase().includes(term) ||
        (item.store ?? "").toLowerCase().includes(term);
      const matchesCategory =
        category === "all" ||
        (category === "uncategorized" ? !item.category : item.category === category);
      return matchesTerm && matchesCategory;
    });
    return [...filtered].sort((a, b) => {
      if (sort === "price-desc") return b.currentPrice - a.currentPrice;
      if (sort === "price-asc") return a.currentPrice - b.currentPrice;
      if (sort === "newest") return b.dateAdded.localeCompare(a.dateAdded);
      return a.name.localeCompare(b.name);
    });
  }, [groceries, search, category, sort]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allVisibleSelected =
    filteredGroceries.length > 0 &&
    filteredGroceries.every((item) => selectedSet.has(item.id));

  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((id) => groceries.some((item) => item.id === id)),
    );
  }, [groceries]);

  const filteredHistory = useMemo(
    () =>
      priceHistory.filter(
        (entry) => historyFilter === "all" || entry.groceryId === historyFilter,
      ),
    [priceHistory, historyFilter],
  );

  const inventoryValue = useMemo(
    () => groceries.reduce((sum, item) => sum + item.currentPrice * item.quantity, 0),
    [groceries],
  );

  const historyStats = useMemo(() => {
    let up = 0;
    let down = 0;
    priceHistory.forEach((entry) => {
      if (entry.newPrice > entry.previousPrice) up += 1;
      if (entry.newPrice < entry.previousPrice) down += 1;
    });
    return { up, down };
  }, [priceHistory]);

  const monthGrocerySpend = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return shoppingLists
      .filter((list) => list.shoppingDate.slice(0, 7) === currentMonth)
      .reduce((sum, list) => sum + shoppingListTotal(list), 0);
  }, [shoppingLists]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === "item") {
        await deleteGrocery(profile?.uid ?? "", deleteTarget.id);
        toast("Grocery item deleted. Price history is preserved.");
      } else {
        await deleteShoppingList(profile?.uid ?? "", deleteTarget.id);
        toast("Shopping list deleted.");
      }
      await reload();
      if (deleteTarget.kind === "item") {
        setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id));
      }
      setDeleteTarget(null);
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not delete. Try again.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id],
    );
  };

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(filteredGroceries.map((item) => item.id));
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.has(id)));
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredGroceries.forEach((item) => next.add(item.id));
      return [...next];
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    try {
      await deleteGroceries(profile?.uid ?? "", selectedIds);
      toast(
        `Deleted ${selectedIds.length} grocery item${selectedIds.length === 1 ? "" : "s"}. Price history is preserved.`,
      );
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      await reload();
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : "Could not delete. Try again.", "error");
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Grocery"
        subtitle="Watch prices, stock your kitchen, and shop with a plan."
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingList(null);
                setListModalOpen(true);
              }}
            >
              <ClipboardList className="h-4 w-4" /> New list
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkModalOpen(true)}>
              <FileText className="h-4 w-4" /> Bulk add
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingItem(null);
                setItemModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add item
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Saved items"
          value={String(groceries.length)}
          hint={`${new Set(groceries.map((item) => item.category).filter(Boolean)).size} categories`}
          icon={<ShoppingBasket className="h-4 w-4" />}
          tone="green"
        />
        <StatCard
          label="Pantry value"
          value={formatCurrency(inventoryValue, currency)}
          hint="Price × quantity"
          icon={<Tags className="h-4 w-4" />}
          tone="amber"
        />
        <StatCard
          label="Shopping lists"
          value={String(shoppingLists.length)}
          hint={`${formatCurrency(monthGrocerySpend, currency)} this month`}
          icon={<ListChecks className="h-4 w-4" />}
          tone="blue"
        />
        <StatCard
          label="Price changes"
          value={String(priceHistory.length)}
          hint={`${historyStats.up} up · ${historyStats.down} down`}
          icon={<History className="h-4 w-4" />}
          tone="violet"
        />
      </div>

      <Tabs
        items={[
          { id: "items", label: "Items", count: groceries.length },
          { id: "history", label: "Price history", count: priceHistory.length },
          { id: "lists", label: "Shopping lists", count: shoppingLists.length },
        ]}
        value={tab}
        onChange={(value) => setTab(value as TabId)}
      />

      {tab === "items" ? (
        <Card className="p-0">
          <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search item, brand, or store…"
                  className="pl-10"
                  aria-label="Search grocery items"
                />
              </div>
              <Select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="sm:w-48"
                aria-label="Filter by category"
              >
                <option value="all">All categories</option>
                <option value="uncategorized">Uncategorized</option>
                {GROCERY_CATEGORIES.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </Select>
              <Select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="sm:w-44"
                aria-label="Sort grocery items"
              >
                <option value="name">Sort: Name</option>
                <option value="price-asc">Price: Low to high</option>
                <option value="price-desc">Price: High to low</option>
                <option value="newest">Newest added</option>
              </Select>
            </div>
            <p className="text-[11px] font-semibold text-muted">
              {filteredGroceries.length} of {groceries.length} items
            </p>
          </div>

          {selectedIds.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-danger/5 px-4 py-2.5">
              <p className="text-xs font-semibold text-ink">
                {selectedIds.length} item{selectedIds.length === 1 ? "" : "s"} selected
              </p>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                  Clear
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" /> Delete selected
                </Button>
              </div>
            </div>
          ) : null}

          {groceries.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<ShoppingBasket className="h-5 w-5" />}
                title="Your grocery shelf is empty"
                description="Add the items you buy often. We'll remember the latest price and keep a history whenever it changes."
                action={
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingItem(null);
                      setItemModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" /> Add your first item
                  </Button>
                }
              />
            </div>
          ) : filteredGroceries.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<Search className="h-5 w-5" />}
                title="No matching items"
                description="Try a different search term or clear the category filter."
              />
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line bg-background/60 text-[10px] uppercase tracking-wide text-muted">
                    <tr>
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label="Select all visible items"
                          checked={allVisibleSelected}
                          onChange={toggleAllVisible}
                          className="h-4 w-4 rounded border-line text-primary-600 focus:ring-primary-400"
                        />
                      </th>
                      <th className="px-4 py-3 font-bold">Item</th>
                      <th className="px-4 py-3 font-bold">Category</th>
                      <th className="px-4 py-3 font-bold">Store</th>
                      <th className="px-4 py-3 text-right font-bold">Price</th>
                      <th className="px-4 py-3 text-right font-bold">Qty</th>
                      <th className="px-4 py-3 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredGroceries.map((item) => {
                      const selected = selectedSet.has(item.id);
                      return (
                        <tr
                          key={item.id}
                          className={`transition hover:bg-primary-50/30 ${selected ? "bg-primary-50/40" : ""}`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              aria-label={`Select ${item.name}`}
                              checked={selected}
                              onChange={() => toggleSelection(item.id)}
                              className="h-4 w-4 rounded border-line text-primary-600 focus:ring-primary-400"
                            />
                          </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-ink">{item.name}</p>
                          <p className="text-[11px] text-muted">
                            {item.brand ? `${item.brand} · ` : ""}Added {formatDate(item.dateAdded)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {item.category ? (
                            <Badge tone="primary">{item.category}</Badge>
                          ) : (
                            <span className="text-[11px] text-muted">Uncategorized</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted">{item.store || "—"}</td>
                        <td className="px-4 py-3 text-right font-bold text-ink">
                          {formatCurrency(item.currentPrice, currency)}
                          <span className="text-[10px] font-semibold text-muted">/{item.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted">
                          {formatNumber(item.quantity, 2)} {item.unit}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem(item);
                                setItemModalOpen(true);
                              }}
                              className="rounded-lg p-2 text-muted transition hover:bg-primary-50 hover:text-primary-700"
                              aria-label={`Edit ${item.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({ kind: "item", id: item.id, label: item.name })
                              }
                              className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                              aria-label={`Delete ${item.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-line md:hidden">
                {filteredGroceries.map((item) => {
                  const selected = selectedSet.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 p-4 ${selected ? "bg-primary-50/40" : ""}`}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Select ${item.name}`}
                        checked={selected}
                        onChange={() => toggleSelection(item.id)}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-line text-primary-600 focus:ring-primary-400"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-ink">{item.name}</p>
                            <p className="text-[11px] text-muted">
                              {item.category || "Uncategorized"}
                              {item.brand ? ` · ${item.brand}` : ""}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem(item);
                                setItemModalOpen(true);
                              }}
                              className="rounded-lg p-1.5 text-muted hover:bg-primary-50 hover:text-primary-700"
                              aria-label={`Edit ${item.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({ kind: "item", id: item.id, label: item.name })
                              }
                              className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                              aria-label={`Delete ${item.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="text-muted">
                            {formatNumber(item.quantity, 2)} {item.unit}
                            {item.store ? ` · ${item.store}` : ""}
                          </span>
                          <span className="font-extrabold text-ink">
                            {formatCurrency(item.currentPrice, currency)}
                            <span className="text-[10px] font-semibold text-muted">/{item.unit}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      ) : null}

      {tab === "history" ? (
        <div className="space-y-4">
          <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-ink">Every price is remembered</p>
              <p className="mt-0.5 text-xs text-muted">
                Updating a grocery item&apos;s price never erases an older record.
              </p>
            </div>
            <Select
              value={historyFilter}
              onChange={(event) => setHistoryFilter(event.target.value)}
              className="sm:w-60"
              aria-label="Filter price history by item"
            >
              <option value="all">All items</option>
              {groceries.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </Card>

          {priceHistory.length === 0 ? (
            <EmptyState
              icon={<History className="h-5 w-5" />}
              title="No price changes yet"
              description="When you edit a saved grocery item and change its price, the previous price appears here automatically."
              action={
                groceries.length > 0 ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingItem(groceries[0]);
                      setItemModalOpen(true);
                    }}
                  >
                    Update a price
                  </Button>
                ) : undefined
              }
            />
          ) : filteredHistory.length === 0 ? (
            <EmptyState
              icon={<History className="h-5 w-5" />}
              title="No records for this item"
              description="Choose another item or update this item's price to start its timeline."
            />
          ) : (
            <Card>
              <CardHeader
                title="Price timeline"
                description={`${filteredHistory.length} recorded change${filteredHistory.length === 1 ? "" : "s"}`}
                icon={<History className="h-4 w-4" />}
              />
              <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-line">
                {filteredHistory.map((entry) => {
                  const change = priceChange(entry);
                  const increased = change.difference > 0;
                  const decreased = change.difference < 0;
                  return (
                    <li key={entry.id} className="relative pl-7">
                      <span
                        className={`absolute left-0 top-2 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-surface ${
                          increased ? "bg-danger" : decreased ? "bg-success" : "bg-muted"
                        }`}
                      />
                      <div className="rounded-xl border border-line bg-background/50 px-3.5 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-ink">{entry.itemName}</p>
                            <p className="text-[11px] text-muted">
                              {formatDate(entry.date, "MMM d, yyyy • h:mm a")}
                              {entry.store ? ` · ${entry.store}` : ""}
                            </p>
                          </div>
                          <Badge tone={increased ? "danger" : decreased ? "success" : "neutral"}>
                            {increased ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : decreased ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : (
                              <Minus className="h-3 w-3" />
                            )}
                            {change.percent === null
                              ? "New"
                              : `${change.percent > 0 ? "+" : ""}${change.percent.toFixed(1)}%`}
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-muted line-through">
                            {formatCurrency(entry.previousPrice, currency)}
                          </span>
                          <span className="text-muted">→</span>
                          <span className="font-extrabold text-ink">
                            {formatCurrency(entry.newPrice, currency)}
                          </span>
                          <span
                            className={`text-[11px] font-bold ${
                              increased ? "text-danger" : decreased ? "text-success" : "text-muted"
                            }`}
                          >
                            {change.difference > 0 ? "+" : ""}
                            {formatCurrency(change.difference, currency)}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>
          )}
        </div>
      ) : null}

      {tab === "lists" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-ink">Shopping lists</h2>
              <p className="text-xs text-muted">Plan quantities, prices, and a budget in one place.</p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingList(null);
                setListModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> New list
            </Button>
          </div>

          {shoppingLists.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-5 w-5" />}
              title="No shopping lists yet"
              description="Create a list for your next market or grocery run. Item subtotals and the grand total are calculated for you."
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingList(null);
                    setListModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" /> Create a list
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {shoppingLists.map((list) => {
                const total = shoppingListTotal(list);
                const purchased = list.items.filter((item) => item.purchased).length;
                const remaining = list.budget > 0 ? list.budget - total : null;
                return (
                  <Card key={list.id} className="flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-ink">{list.name}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                          <CalendarDays className="h-3 w-3" /> {formatDate(list.shoppingDate)}
                          <span>·</span>
                          {monthLabel(list.shoppingDate.slice(0, 7), "MMM yyyy")}
                        </p>
                      </div>
                      <StatusBadge status={list.status} />
                    </div>

                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                          Grand total
                        </p>
                        <p className="text-lg font-extrabold text-ink">
                          {formatCurrency(total, currency)}
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-muted">
                        <p>
                          {purchased}/{list.items.length} purchased
                        </p>
                        {list.budget > 0 ? (
                          <p
                            className={`font-bold ${
                              (remaining ?? 0) < 0 ? "text-danger" : "text-primary-700"
                            }`}
                          >
                            {(remaining ?? 0) < 0 ? "Over budget by " : "Budget left "}
                            {formatCurrency(Math.abs(remaining ?? 0), currency)}
                          </p>
                        ) : (
                          <p>No budget set</p>
                        )}
                      </div>
                    </div>

                    {list.budget > 0 ? (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
                        <div
                          className={`h-full rounded-full ${
                            (remaining ?? 0) < 0 ? "bg-danger" : "bg-primary-500"
                          }`}
                          style={{ width: `${Math.min((total / list.budget) * 100, 100)}%` }}
                        />
                      </div>
                    ) : null}

                    <ul className="mt-3 space-y-1 border-t border-line pt-3">
                      {list.items.slice(0, 4).map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-2 text-[11px] text-muted"
                        >
                          <span className="truncate">
                            {item.purchased ? "✓ " : ""}
                            {item.name}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {item.quantity}×
                          </span>
                        </li>
                      ))}
                      {list.items.length > 4 ? (
                        <li className="text-[11px] font-bold text-muted">
                          +{list.items.length - 4} more
                        </li>
                      ) : null}
                    </ul>

                    <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                      <p className="flex items-center gap-1 text-[11px] text-muted">
                        <ListChecks className="h-3.5 w-3.5" /> {list.items.length} item
                        {list.items.length === 1 ? "" : "s"}
                      </p>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingList(list);
                            setListModalOpen(true);
                          }}
                          className="rounded-lg p-2 text-muted transition hover:bg-primary-50 hover:text-primary-700"
                          aria-label={`Edit ${list.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({ kind: "list", id: list.id, label: list.name })
                          }
                          className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                          aria-label={`Delete ${list.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {groceries.length === 0 ? (
            <Card className="flex items-start gap-3 bg-primary-50/50">
              <Store className="mt-0.5 h-4 w-4 shrink-0 text-primary-700" />
              <p className="text-xs leading-5 text-primary-800">
                Save a few grocery items first and you can add them to any list with their
                latest prices in one click.
              </p>
            </Card>
          ) : null}
        </div>
      ) : null}

      <BulkAddGroceryModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onSaved={reload}
        currency={currency}
      />

      <GroceryItemModal
        open={itemModalOpen}
        onClose={() => {
          setItemModalOpen(false);
          setEditingItem(null);
        }}
        item={editingItem}
        onSaved={reload}
      />

      <ShoppingListModal
        open={listModalOpen}
        onClose={() => {
          setListModalOpen(false);
          setEditingList(null);
        }}
        list={editingList}
        groceries={groceries}
        currency={currency}
        onSaved={reload}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget?.kind === "item" ? "Delete grocery item?" : "Delete shopping list?"}
        message={
          deleteTarget?.kind === "item"
            ? `"${deleteTarget.label}" will be removed from your grocery items. Its price history stays intact.`
            : `"${deleteTarget?.label ?? ""}" and its items will be deleted permanently.`
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        busy={deleting}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Delete selected grocery items?"
        message={`${selectedIds.length} grocery item${selectedIds.length === 1 ? "" : "s"} will be removed. Their price history stays intact.`}
        confirmLabel={`Delete ${selectedIds.length}`}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={() => void handleBulkDelete()}
        busy={bulkDeleting}
      />
    </div>
  );
}
