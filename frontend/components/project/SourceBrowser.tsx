"use client";

import { useState } from "react";
import { ChevronLeft, Download, File, Folder, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { SourceFile, SourceFileOut } from "@/lib/api-types";
import { btn } from "@/lib/styles";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorState } from "./states";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Entries directly inside `dir`: subfolders first, then files. */
function listDir(files: SourceFile[], dir: string) {
  const prefix = dir ? `${dir}/` : "";
  const folders = new Set<string>();
  const here: SourceFile[] = [];
  for (const f of files) {
    if (!f.path.startsWith(prefix)) continue;
    const rest = f.path.slice(prefix.length);
    const slash = rest.indexOf("/");
    if (slash === -1) here.push(f);
    else folders.add(rest.slice(0, slash));
  }
  return { folders: [...folders].sort(), files: here.sort((a, b) => a.path.localeCompare(b.path)) };
}

/** The uploaded snapshot: browse folders, read text files, download the zip. Source is always open. */
export function SourceBrowser({ projectId }: { projectId: string }) {
  const tree = useApi<{ files: SourceFile[] }>(`/projects/${projectId}/source/tree`);
  const [dir, setDir] = useState("");
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  async function download() {
    setDownloading(true);
    try {
      const { url } = await api<{ url: string }>(`/projects/${projectId}/source/download`);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  if (tree.error) return <ErrorState message={tree.error.message} onRetry={tree.reload} />;
  if (!tree.data)
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-line p-4" aria-busy="true">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );
  if (tree.data.files.length === 0) return <EmptyState>No source uploaded yet.</EmptyState>;

  const { folders, files } = listDir(tree.data.files, dir);
  const crumbs = dir ? dir.split("/") : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="focus-inset overflow-hidden rounded-xl border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-sunken px-3 py-2 lg:px-4">
          {dir && (
            <button
              aria-label="Up one folder"
              onClick={() => {
                setDir(crumbs.slice(0, -1).join("/"));
                setOpenPath(null);
              }}
              className="flex size-8 items-center justify-center rounded-md hover:bg-white"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
          <p className="min-w-0 flex-1 truncate font-mono text-[13px]">{dir ? `/${dir}` : `${tree.data.files.length} files`}</p>
          <button className={cn(btn.primary, "h-8 px-3")} onClick={download} disabled={downloading}>
            {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            <span className="hidden sm:inline">Download zip</span>
          </button>
        </div>
        <ul>
          {folders.map((name) => (
            <li key={`d:${name}`}>
              <button
                onClick={() => {
                  setDir(dir ? `${dir}/${name}` : name);
                  setOpenPath(null);
                }}
                className="flex min-h-11 w-full items-center gap-3 border-b border-line px-3 text-left transition-colors hover:bg-sunken/60 lg:px-4"
              >
                <Folder className="size-4 shrink-0 fill-muted-ink/30 text-muted-ink" aria-hidden />
                <span className="font-mono text-[13px]">{name}</span>
              </button>
            </li>
          ))}
          {files.map((f) => {
            const name = f.path.split("/").pop()!;
            const active = openPath === f.path;
            return (
              <li key={f.path}>
                <button
                  aria-pressed={active}
                  onClick={() => setOpenPath(active ? null : f.path)}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 border-b border-line px-3 text-left transition-colors hover:bg-sunken/60 lg:px-4",
                    active && "bg-sunken",
                  )}
                >
                  <File className="size-4 shrink-0 text-muted-ink" aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{name}</span>
                  <span className="shrink-0 font-mono text-[11px] text-muted-ink">{formatSize(f.size_bytes)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {openPath && <FileViewer projectId={projectId} path={openPath} />}
    </div>
  );
}

function FileViewer({ projectId, path }: { projectId: string; path: string }) {
  const file = useApi<SourceFileOut>(`/projects/${projectId}/source/file?path=${encodeURIComponent(path)}`);
  return (
    <section className="focus-inset overflow-hidden rounded-xl border border-line" aria-label={path}>
      <h3 className="border-b border-line bg-sunken px-4 py-2 font-mono text-[12px]">{path}</h3>
      {file.error ? (
        <ErrorState message={file.error.message} onRetry={file.reload} className="m-4" />
      ) : !file.data ? (
        <div className="space-y-2 p-4" aria-busy="true">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : file.data.binary || file.data.content === null ? (
        <p className="px-4 py-6 text-sm text-muted-ink">Binary file. Download the zip to open it.</p>
      ) : (
        // Plain escaped text only; uploaded code is never rendered or executed.
        <pre className="max-h-[480px] overflow-auto p-4 font-mono text-[12.5px] leading-relaxed">
          {file.data.content.split("\n").map((line, i) => (
            <div key={i} className="flex">
              <span className="w-10 shrink-0 select-none pr-3 text-right text-muted-ink/70">{i + 1}</span>
              <span className="whitespace-pre">{line}</span>
            </div>
          ))}
        </pre>
      )}
    </section>
  );
}
