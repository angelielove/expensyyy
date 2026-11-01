"use client";

import { useRef, useState } from "react";
import { FileText, ImageIcon, Loader2, Upload, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { uploadReceipt } from "@/services/receiptService";
import type { ReceiptUpload } from "@/types";
import { Button } from "@/components/common/button";

interface ReceiptFieldProps {
  value?: ReceiptUpload | null;
  onChange: (value: ReceiptUpload | null) => void;
}

export function ReceiptField({ value, onChange }: ReceiptFieldProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file || !user) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadReceipt(user.uid, file);
      onChange(uploaded);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const isImage = value?.url?.startsWith("data:image") || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(value?.url ?? "");

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-background p-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-50 text-primary-600">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value.url} alt={value.name} className="h-full w-full object-cover" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-ink">{value.name}</p>
            <a
              href={value.url}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-semibold text-primary-700 underline-offset-2 hover:underline"
            >
              View receipt
            </a>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-full p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger"
            aria-label="Remove receipt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary-300 bg-primary-50/40 px-4 py-4 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "Uploading…" : "Upload receipt (image or PDF, max 5 MB)"}
        </button>
      )}
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="px-2"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
          Replace receipt
        </Button>
      ) : null}
      {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
    </div>
  );
}
