"use client";

import { useEffect, useRef, useState } from "react";
import { Link as LinkIcon, Loader2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { btn } from "@/lib/styles";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  label?: string;
  shape?: "square" | "banner";
  className?: string;
}

export function ImageUploader({
  value,
  onChange,
  label = "Image",
  shape = "banner",
  className,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState(value ?? "");

  useEffect(() => {
    setUrlInput(value ?? "");
  }, [value]);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPEG, WebP, GIF, SVG)");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 8 MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api<{ url: string }>("/upload/image", {
        method: "POST",
        body: formData,
      });
      onChange(res.url);
      setUrlInput(res.url);
      toast.success("Image uploaded successfully!");
    } catch (err) {
      toast.error((err as Error).message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-ink">{label}</label>
        <button
          type="button"
          onClick={() => setMode(mode === "upload" ? "url" : "upload")}
          className="flex items-center gap-1 text-[11px] font-semibold text-teal hover:underline"
        >
          {mode === "upload" ? (
            <>
              <LinkIcon className="size-3" /> Paste URL instead
            </>
          ) : (
            <>
              <UploadCloud className="size-3" /> Upload file
            </>
          )}
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className="hidden"
      />

      {value ? (
        <div
          className={cn(
            "relative overflow-hidden border border-line bg-sunken group",
            shape === "square" ? "size-24 rounded-full" : "h-36 w-full rounded-xl",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={cn(btn.secondary, "h-7 px-2 text-[11px] text-white bg-black/60 border-white/30 hover:bg-black")}
            >
              Change
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setUrlInput("");
              }}
              className="flex size-7 items-center justify-center rounded-lg bg-black/60 text-white hover:bg-cool/80 border border-white/30"
              title="Remove image"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      ) : mode === "upload" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-line bg-sunken/40 transition-colors hover:border-ink/40 hover:bg-sunken",
            uploading && "pointer-events-none opacity-60",
            shape === "square" ? "size-24 rounded-full p-2" : "h-32 w-full rounded-xl p-4",
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-1.5 text-xs text-muted-ink">
              <Loader2 className="size-5 animate-spin text-teal" />
              <span>Uploading...</span>
            </div>
          ) : shape === "square" ? (
            <div className="flex flex-col items-center justify-center text-center">
              <UploadCloud className="size-5 text-muted-ink" />
              <span className="text-[11px] font-semibold text-ink mt-1">Upload</span>
            </div>
          ) : (
            <>
              <div className="flex size-9 items-center justify-center rounded-full bg-white border border-line shadow-xs">
                <UploadCloud className="size-4 text-muted-ink" />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-ink">
                  Click to upload <span className="font-normal text-muted-ink">or drag & drop</span>
                </p>
                <p className="text-[10px] text-muted-ink mt-0.5">PNG, JPG, WebP, GIF up to 8MB</p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
              onChange(e.target.value.trim() || null);
            }}
            placeholder="https://example.com/image.jpg"
            className="h-10 flex-1 rounded-lg border border-line px-3 text-sm outline-none focus:border-ink"
          />
          {urlInput && (
            <button
              type="button"
              onClick={() => {
                setUrlInput("");
                onChange(null);
              }}
              className="flex size-10 items-center justify-center rounded-lg border border-line text-muted-ink hover:bg-sunken hover:text-ink"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
