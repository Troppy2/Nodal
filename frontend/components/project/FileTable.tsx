"use client";

import { Download, File, Folder } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import type { FileRow } from "@/lib/catalog";
import { btn } from "@/lib/styles";
import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";

/** GitHub-style snapshot table. Every project with source is open to read and download. */
export function FileTable({ files, author }: { files: FileRow[]; author: Person }) {
  const rows = [...files.filter((f) => f.kind === "folder"), ...files.filter((f) => f.kind === "file")];
  const latest = files[0];
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className="flex items-center gap-3 border-b border-line bg-sunken px-3 py-2 lg:px-4">
        <span className="rounded-md border border-line bg-white px-2 py-0.5 font-mono text-[12px]">main</span>
        <Avatar person={author} size={20} className="hidden sm:flex" />
        <p className="min-w-0 flex-1 truncate text-sm">
          <span className="hidden font-semibold sm:inline">{author.handle} </span>
          <span className="text-muted-ink">{latest?.message}</span>
        </p>
        <span className="hidden shrink-0 font-mono text-[11px] text-muted-ink sm:inline">{latest?.age}</span>
        <button
          className={cn(btn.primary, "h-8 px-3")}
          onClick={() => toast("Demo: the zip download comes from the API")}
        >
          <Download className="size-3.5" />
          <span className="hidden sm:inline">Download zip</span>
        </button>
      </div>
      <ul>
        {rows.map((f) => (
          <li key={f.name} className="flex min-h-11 items-center gap-3 border-b border-line px-3 last:border-b-0 lg:px-4">
            {f.kind === "folder" ? (
              <Folder className="size-4 shrink-0 fill-muted-ink/30 text-muted-ink" aria-label="Folder" />
            ) : (
              <File className="size-4 shrink-0 text-muted-ink" aria-label="File" />
            )}
            <span className="shrink-0 font-mono text-[13px] sm:w-44">{f.name}</span>
            <span className="hidden min-w-0 flex-1 truncate text-sm text-muted-ink sm:block">{f.message}</span>
            <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-ink">{f.age}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
