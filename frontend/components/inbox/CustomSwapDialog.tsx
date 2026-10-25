"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, FolderGit2, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { DisciplineMark } from "@/components/Meta";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import type { InboxItem, MyProjectsOut, ProfileLite, ProjectCard } from "@/lib/api-types";
import { typeLabel } from "@/lib/cover";
import { useSession } from "@/lib/session";
import { btn } from "@/lib/styles";
import { cn } from "@/lib/utils";

interface CustomSwapDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (item: InboxItem) => void;
  initialPartnerHandle?: string;
}

export function CustomSwapDialog({
  open,
  onClose,
  onCreated,
  initialPartnerHandle = "",
}: CustomSwapDialogProps) {
  const { me } = useSession();

  // Partner handle field
  const [partnerHandle, setPartnerHandle] = useState(initialPartnerHandle);
  const [selectedPartner, setSelectedPartner] = useState<ProfileLite | null>(null);
  const [partnerSuggestions, setPartnerSuggestions] = useState<ProfileLite[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [partnerDropdownOpen, setPartnerDropdownOpen] = useState(false);

  // My project field
  const [myProjectId, setMyProjectId] = useState("");
  const [selectedMyProject, setSelectedMyProject] = useState<ProjectCard | null>(null);
  const [myProjects, setMyProjects] = useState<ProjectCard[]>([]);
  const [loadingMyProjects, setLoadingMyProjects] = useState(false);
  const [myProjectDropdownOpen, setMyProjectDropdownOpen] = useState(false);

  // Their project field
  const [theirProjectId, setTheirProjectId] = useState("");
  const [selectedTheirProject, setSelectedTheirProject] = useState<ProjectCard | null>(null);
  const [theirProjects, setTheirProjects] = useState<ProjectCard[]>([]);
  const [loadingTheirProjects, setLoadingTheirProjects] = useState(false);
  const [theirProjectDropdownOpen, setTheirProjectDropdownOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Click outside refs
  const partnerContainerRef = useRef<HTMLDivElement>(null);
  const myProjectContainerRef = useRef<HTMLDivElement>(null);
  const theirProjectContainerRef = useRef<HTMLDivElement>(null);

  // Reset and load user's owned projects on open
  useEffect(() => {
    if (!open) {
      setPartnerDropdownOpen(false);
      setMyProjectDropdownOpen(false);
      setTheirProjectDropdownOpen(false);
      return;
    }

    if (initialPartnerHandle) {
      setPartnerHandle(initialPartnerHandle);
    }

    async function loadMyProjects() {
      setLoadingMyProjects(true);
      try {
        const res = await api<MyProjectsOut>("/me/projects");
        const owned = res.owned || [];
        setMyProjects(owned);
      } catch {
        // Fallback: leave empty
      } finally {
        setLoadingMyProjects(false);
      }
    }

    loadMyProjects();
  }, [open, initialPartnerHandle]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (partnerContainerRef.current && !partnerContainerRef.current.contains(target)) {
        setPartnerDropdownOpen(false);
      }
      if (myProjectContainerRef.current && !myProjectContainerRef.current.contains(target)) {
        setMyProjectDropdownOpen(false);
      }
      if (theirProjectContainerRef.current && !theirProjectContainerRef.current.contains(target)) {
        setTheirProjectDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch partner autocomplete suggestions when typing
  useEffect(() => {
    if (!open) return;
    const clean = partnerHandle.trim().replace(/^@/, "");

    const timer = setTimeout(async () => {
      setLoadingPartners(true);
      try {
        const query = clean ? `?q=${encodeURIComponent(clean)}&limit=10` : "?limit=8";
        const results = await api<ProfileLite[]>(`/profiles${query}`);
        setPartnerSuggestions(results || []);
      } catch {
        setPartnerSuggestions([]);
      } finally {
        setLoadingPartners(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [partnerHandle, open]);

  // Fetch their projects whenever selectedPartner or partnerHandle changes
  useEffect(() => {
    const handleToFetch = selectedPartner?.handle || partnerHandle.trim().replace(/^@/, "");
    if (!handleToFetch) {
      setTheirProjects([]);
      setSelectedTheirProject(null);
      return;
    }

    let active = true;
    async function loadTheirProjects() {
      setLoadingTheirProjects(true);
      try {
        const res = await api<{ profile: ProfileLite; projects: ProjectCard[] }>(`/profiles/${handleToFetch}`);
        if (!active) return;
        if (res.profile && !selectedPartner) {
          setSelectedPartner(res.profile);
        }
        setTheirProjects(res.projects || []);
      } catch {
        if (active) {
          setTheirProjects([]);
        }
      } finally {
        if (active) setLoadingTheirProjects(false);
      }
    }

    const timer = setTimeout(loadTheirProjects, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selectedPartner, partnerHandle]);

  function handleSelectPartner(p: ProfileLite) {
    setSelectedPartner(p);
    setPartnerHandle(`@${p.handle}`);
    setPartnerDropdownOpen(false);
    // Reset their project selection so user can pick from the new partner's projects
    setTheirProjectId("");
    setSelectedTheirProject(null);
  }

  function handleSelectMyProject(proj: ProjectCard) {
    setSelectedMyProject(proj);
    setMyProjectId(proj.title);
    setMyProjectDropdownOpen(false);
  }

  function handleSelectTheirProject(proj: ProjectCard) {
    setSelectedTheirProject(proj);
    setTheirProjectId(proj.title);
    setTheirProjectDropdownOpen(false);
  }

  // Filtered lists
  const myFilterText = myProjectId.trim().toLowerCase();
  const filteredMyProjects = myProjects.filter((p) => {
    if (!myFilterText) return true;
    return (
      p.title.toLowerCase().includes(myFilterText) ||
      (p.slug && p.slug.toLowerCase().includes(myFilterText)) ||
      p.id.toLowerCase().includes(myFilterText)
    );
  });

  const theirFilterText = theirProjectId.trim().toLowerCase();
  const filteredTheirProjects = theirProjects.filter((p) => {
    if (!theirFilterText) return true;
    return (
      p.title.toLowerCase().includes(theirFilterText) ||
      (p.slug && p.slug.toLowerCase().includes(theirFilterText)) ||
      p.id.toLowerCase().includes(theirFilterText)
    );
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanHandle = partnerHandle.trim().replace(/^@/, "");
    if (!cleanHandle || !myProjectId.trim() || !theirProjectId.trim()) {
      toast.error("Please fill in all swap fields.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Resolve partner ID
      let partnerId = selectedPartner?.id;
      if (!partnerId) {
        const partnerRes = await api<{ profile: ProfileLite }>(`/profiles/${cleanHandle}`);
        partnerId = partnerRes.profile.id;
      }

      if (me?.profile?.id && partnerId === me.profile.id) {
        toast.error("You cannot propose a swap with yourself.");
        setSubmitting(false);
        return;
      }

      // 2. The server picks the skills: the open need on each project that the other person offers best.

      // 3. Post custom swap proposal
      const item = await api<InboxItem>("/cycles/custom-swap", {
        method: "POST",
        body: {
          partner_id: partnerId,
          my_project_id: selectedMyProject?.id ?? myProjectId.trim(),
          their_project_id: selectedTheirProject?.id ?? theirProjectId.trim(),
        },
      });

      toast.success("Swap proposal sent! Partner notified in their inbox.");
      onCreated(item);
      onClose();

      // Reset fields
      setPartnerHandle("");
      setSelectedPartner(null);
      setMyProjectId("");
      setSelectedMyProject(null);
      setTheirProjectId("");
      setSelectedTheirProject(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-visible">
        <DialogTitle className="text-lg font-bold text-ink">Propose a skill swap</DialogTitle>
        <DialogDescription className="text-sm text-muted-ink">
          Agree to help each other&apos;s project with 0 Tolken exchanged. When both accept, you both join each other&apos;s team.
        </DialogDescription>

        <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
          {/* 1. Partner Handle Field with Autofill */}
          <div ref={partnerContainerRef} className="relative">
            <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center justify-between">
              <span>Person</span>
              {selectedPartner && (
                <span className="text-[11px] text-teal font-medium flex items-center gap-1">
                  <Check className="size-3" /> Selected {selectedPartner.display_name || `@${selectedPartner.handle}`}
                </span>
              )}
            </label>

            <div className="relative">
              <input
                type="text"
                value={partnerHandle}
                onChange={(e) => {
                  setPartnerHandle(e.target.value);
                  setPartnerDropdownOpen(true);
                  if (selectedPartner && !e.target.value.includes(selectedPartner.handle)) {
                    setSelectedPartner(null);
                  }
                }}
                onFocus={() => setPartnerDropdownOpen(true)}
                placeholder="Search people by name"
                className="h-10 w-full rounded-lg border border-line pl-9 pr-8 text-sm outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                required
                autoComplete="off"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-ink pointer-events-none" />

              {partnerHandle && (
                <button
                  type="button"
                  onClick={() => {
                    setPartnerHandle("");
                    setSelectedPartner(null);
                    setPartnerSuggestions([]);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-ink hover:text-ink p-1 rounded-md"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Partner Suggestions Dropdown */}
            {partnerDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-xl border border-line bg-white shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                {loadingPartners && partnerSuggestions.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted-ink flex items-center justify-center gap-2">
                    <Loader2 className="size-3.5 animate-spin" /> Searching creators...
                  </div>
                ) : partnerSuggestions.length > 0 ? (
                  <ul className="divide-y divide-line/60">
                    {partnerSuggestions.map((p) => {
                      const isSelected = selectedPartner?.id === p.id;
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectPartner(p)}
                            className={cn(
                              "w-full text-left px-3.5 py-2.5 flex items-center gap-3 transition-colors hover:bg-sunken text-sm",
                              isSelected && "bg-teal-tint/40 font-semibold"
                            )}
                          >
                            <Avatar person={p} size={28} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-ink">
                                {p.display_name || p.handle}
                              </p>
                              <p className="truncate text-xs text-muted-ink">@{p.handle}</p>
                            </div>
                            {isSelected && <Check className="size-4 text-teal shrink-0" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="p-3 text-center text-xs text-muted-ink">
                    {partnerHandle.trim()
                      ? `No creator found matching "${partnerHandle.trim()}"`
                      : "Type a name or handle to search"}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Your Project ID / Slug Field with Autofill */}
          <div ref={myProjectContainerRef} className="relative">
            <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center justify-between">
              <span>Your project</span>
              <span className="text-[11px] text-muted-ink font-normal">They help with this</span>
            </label>

            <div className="relative">
              <input
                type="text"
                value={myProjectId}
                onChange={(e) => {
                  setMyProjectId(e.target.value);
                  setMyProjectDropdownOpen(true);
                  if (selectedMyProject && (selectedMyProject.slug !== e.target.value && selectedMyProject.id !== e.target.value)) {
                    setSelectedMyProject(null);
                  }
                }}
                onFocus={() => setMyProjectDropdownOpen(true)}
                placeholder="Pick one of your projects"
                className="h-10 w-full rounded-lg border border-line pl-9 pr-8 text-sm outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                required
                autoComplete="off"
              />
              <FolderGit2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-ink pointer-events-none" />

              <button
                type="button"
                onClick={() => setMyProjectDropdownOpen((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-ink hover:text-ink p-1 rounded-md"
              >
                <ChevronDown className="size-3.5" />
              </button>
            </div>

            {/* My Projects Dropdown */}
            {myProjectDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-xl border border-line bg-white shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                {loadingMyProjects ? (
                  <div className="p-3 text-center text-xs text-muted-ink flex items-center justify-center gap-2">
                    <Loader2 className="size-3.5 animate-spin" /> Loading your projects...
                  </div>
                ) : filteredMyProjects.length > 0 ? (
                  <ul className="divide-y divide-line/60">
                    {filteredMyProjects.map((proj) => {
                      const isSelected = selectedMyProject?.id === proj.id || myProjectId === proj.slug || myProjectId === proj.id;
                      return (
                        <li key={proj.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectMyProject(proj)}
                            className={cn(
                              "w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2.5 transition-colors hover:bg-sunken text-sm",
                              isSelected && "bg-teal-tint/40 font-semibold"
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 truncate">
                                <DisciplineMark type={proj.type} />
                                <span className="font-medium text-ink truncate">{proj.title}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-ink">
                                <span className="font-mono text-[11px] truncate">
                                  {proj.slug || proj.id.slice(0, 8)}
                                </span>
                                <span>·</span>
                                <span>{typeLabel[proj.type]}</span>
                                {proj.stage === "idea" && <span className="text-cool">Idea</span>}
                              </div>
                            </div>
                            {isSelected && <Check className="size-4 text-teal shrink-0" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="p-3 text-center text-xs text-muted-ink">
                    {myProjects.length === 0
                      ? "You haven't created any projects yet."
                      : "No matching project found."}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Their Project ID / Slug Field with Autofill */}
          <div ref={theirProjectContainerRef} className="relative">
            <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center justify-between">
              <span>Their project</span>
              <span className="text-[11px] text-muted-ink font-normal">You help with this</span>
            </label>

            <div className="relative">
              <input
                type="text"
                value={theirProjectId}
                onChange={(e) => {
                  setTheirProjectId(e.target.value);
                  setTheirProjectDropdownOpen(true);
                  if (selectedTheirProject && (selectedTheirProject.slug !== e.target.value && selectedTheirProject.id !== e.target.value)) {
                    setSelectedTheirProject(null);
                  }
                }}
                onFocus={() => setTheirProjectDropdownOpen(true)}
                placeholder={
                  selectedPartner
                    ? `Pick from @${selectedPartner.handle}'s projects`
                    : "Pick a person first"
                }
                className="h-10 w-full rounded-lg border border-line pl-9 pr-8 text-sm outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                required
                autoComplete="off"
              />
              <FolderGit2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-ink pointer-events-none" />

              <button
                type="button"
                onClick={() => setTheirProjectDropdownOpen((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-ink hover:text-ink p-1 rounded-md"
              >
                <ChevronDown className="size-3.5" />
              </button>
            </div>

            {/* Their Projects Dropdown */}
            {theirProjectDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-xl border border-line bg-white shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                {loadingTheirProjects ? (
                  <div className="p-3 text-center text-xs text-muted-ink flex items-center justify-center gap-2">
                    <Loader2 className="size-3.5 animate-spin" /> Loading partner projects...
                  </div>
                ) : !partnerHandle.trim() ? (
                  <div className="p-3 text-center text-xs text-muted-ink">
                    Type or choose a partner handle first to view their projects.
                  </div>
                ) : filteredTheirProjects.length > 0 ? (
                  <ul className="divide-y divide-line/60">
                    {filteredTheirProjects.map((proj) => {
                      const isSelected =
                        selectedTheirProject?.id === proj.id ||
                        theirProjectId === proj.slug ||
                        theirProjectId === proj.id;
                      return (
                        <li key={proj.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectTheirProject(proj)}
                            className={cn(
                              "w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2.5 transition-colors hover:bg-sunken text-sm",
                              isSelected && "bg-teal-tint/40 font-semibold"
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 truncate">
                                <DisciplineMark type={proj.type} />
                                <span className="font-medium text-ink truncate">{proj.title}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-ink">
                                <span className="font-mono text-[11px] truncate">
                                  {proj.slug || proj.id.slice(0, 8)}
                                </span>
                                <span>·</span>
                                <span>{typeLabel[proj.type]}</span>
                                {proj.stage === "idea" && <span className="text-cool">Idea</span>}
                              </div>
                            </div>
                            {isSelected && <Check className="size-4 text-teal shrink-0" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="p-3 text-center text-xs text-muted-ink">
                    {theirProjects.length === 0
                      ? `No projects found for @${selectedPartner?.handle || partnerHandle.trim().replace(/^@/, "")}`
                      : "No matching project found."}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-line pt-4 mt-1">
            <button type="button" onClick={onClose} className={btn.secondary}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !partnerHandle.trim() || !myProjectId.trim() || !theirProjectId.trim()}
              className={btn.primary}
            >
              {submitting && <Loader2 className="size-4 animate-spin mr-1.5" />}
              Send swap proposal
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
