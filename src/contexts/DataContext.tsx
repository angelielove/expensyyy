"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getOrCreateProfile, saveProfile } from "@/services/profileService";
import { listRecords } from "@/lib/store";
import type {
  Bill,
  Grocery,
  GroceryPriceHistory,
  RentPayment,
  ShoppingList,
  UserProfile,
} from "@/types";

interface DataContextValue {
  profile: UserProfile | null;
  groceries: Grocery[];
  priceHistory: GroceryPriceHistory[];
  shoppingLists: ShoppingList[];
  bills: Bill[];
  rentPayments: RentPayment[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

function byCreatedDesc<T extends { createdAt: string }>(a: T, b: T): number {
  return b.createdAt.localeCompare(a.createdAt);
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [groceries, setGroceries] = useState<Grocery[]>([]);
  const [priceHistory, setPriceHistory] = useState<GroceryPriceHistory[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedUid = useRef<string | null>(null);

  const load = useCallback(
    async (showSpinner = false) => {
      if (!user) return;
      if (showSpinner) setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const nextProfile = await getOrCreateProfile(user);
        const [nextGroceries, nextHistory, nextLists, nextBills, nextRent] = await Promise.all([
          listRecords<Grocery>(user.uid, "groceries"),
          listRecords<GroceryPriceHistory>(user.uid, "groceryPriceHistory"),
          listRecords<ShoppingList>(user.uid, "shoppingLists"),
          listRecords<Bill>(user.uid, "bills"),
          listRecords<RentPayment>(user.uid, "rentPayments"),
        ]);
        setProfile(nextProfile);
        setGroceries([...nextGroceries].sort((a, b) => a.name.localeCompare(b.name)));
        setPriceHistory([...nextHistory].sort((a, b) => b.date.localeCompare(a.date)));
        setShoppingLists([...nextLists].sort((a, b) => b.shoppingDate.localeCompare(a.shoppingDate)));
        setBills([...nextBills].sort(byCreatedDesc));
        setRentPayments(
          [...nextRent].sort((a, b) =>
            `${b.billingPeriod}-${b.memberName}`.localeCompare(`${a.billingPeriod}-${a.memberName}`),
          ),
        );
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not load your data. Please refresh the page.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setGroceries([]);
      setPriceHistory([]);
      setShoppingLists([]);
      setBills([]);
      setRentPayments([]);
      setLoading(false);
      loadedUid.current = null;
      return;
    }
    if (loadedUid.current !== user.uid) {
      loadedUid.current = user.uid;
      void load(true);
    }
  }, [user, load]);

  useEffect(() => {
    if (!profile) return;
    const root = document.documentElement;
    root.classList.toggle("dark", profile.theme === "dark");
    root.style.colorScheme = profile.theme;
  }, [profile]);

  const reload = useCallback(async () => {
    await load(false);
  }, [load]);

  const updateProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      if (!profile) return;
      const next = { ...profile, ...patch };
      setProfile(next);
      await saveProfile(next);
    },
    [profile],
  );

  const value = useMemo<DataContextValue>(
    () => ({
      profile,
      groceries,
      priceHistory,
      shoppingLists,
      bills,
      rentPayments,
      loading,
      refreshing,
      error,
      reload,
      updateProfile,
    }),
    [
      profile,
      groceries,
      priceHistory,
      shoppingLists,
      bills,
      rentPayments,
      loading,
      refreshing,
      error,
      reload,
      updateProfile,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used inside DataProvider");
  return context;
}
