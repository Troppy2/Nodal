// Mirrors backend/app/models.py (the API contract). Keep the two in step.
// Tolken is the in-app currency; there is no money anywhere in Nodal.

export type ProjectType = "software" | "hardware" | "creative";
export type Stage = "idea" | "building" | "shipped";

export type CoverPattern = "rings" | "bars" | "blocks" | "stripes" | "dots";

export interface Cover {
  pattern: CoverPattern;
  tint: ProjectType;
}

export interface ProfileLite {
  id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Skill {
  id: number;
  name: string;
  slug: string;
  category: ProjectType;
}

export interface Offer {
  skill: Skill;
  level: 1 | 2 | 3;
}

export interface NeedOut {
  id: string;
  skill: Skill;
  note: string | null;
  bounty_tolken: number | null;
  status: "open" | "filled";
  fitters: ProfileLite[];
  viewer_fits: boolean;
  viewer_requested: boolean;
}

export interface ProjectCard {
  id: string;
  title: string;
  summary: string;
  type: ProjectType;
  stage: Stage;
  source_access: "none" | "open";
  cover: Cover;
  cover_url: string | null;
  owner: ProfileLite;
  tags: string[];
  needs: NeedOut[];
  star_count: number;
  comment_count: number;
  people_fit: number;
  badges: { market_verdict: string | null; cool_score: number | null };
  viewer_starred: boolean;
  created_at: string;
}

export interface Member {
  profile: ProfileLite;
  role: "owner" | "contributor";
  skill: Skill | null;
  share_bps: number | null;
  status: "invited" | "joined";
}

export interface ProjectDetail extends ProjectCard {
  readme_md: string | null;
  repo_url: string | null;
  demo_url: string | null;
  has_source: boolean;
  members: Member[];
  viewer_follows_owner: boolean;
}

export interface ProjectList {
  items: ProjectCard[];
  next_page: number | null;
}

export interface ProjectRef {
  id: string;
  title: string;
  type: ProjectType;
  owner: ProfileLite;
}

export interface CommentOut {
  id: string;
  author: ProfileLite;
  body: string;
  created_at: string;
}

export interface CollabOut {
  id: string;
  project: ProjectRef;
  from_profile: ProfileLite;
  skill: Skill;
  message: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

export interface ProfileOut {
  profile: ProfileLite;
  bio: string | null;
  interests: string[];
  offers: Offer[];
  stats: { projects: number; stars: number; collaborations: number; followers: number };
  projects: ProjectCard[];
  viewer_follows: boolean;
  is_me: boolean;
}

export interface MeOut {
  profile: ProfileLite;
  bio: string | null;
  interests: string[];
  offers: Offer[];
  tolken_balance: number;
  onboarded: boolean;
}

export interface ActivityDay {
  date: string;
  count: number;
}

export interface MatchOut {
  profile: ProfileLite;
  skill: Skill;
  score: number;
  reasons: string[];
  reciprocal: boolean;
}

export interface CycleLink {
  from: string;
  to: string;
  project_id: string;
  project_title: string;
  skill: Skill;
}

export interface Cycle {
  id: string;
  kind: "swap" | "ring";
  score: number;
  members: ProfileLite[];
  links: CycleLink[];
}

export interface GraphOut {
  root: string;
  nodes: { id: string; kind: "project" | "profile"; label: string; type: ProjectType | null; handle: string | null; depth: number }[];
  edges: { source: string; target: string; kind: "fills" | "owns"; skill: string | null; cycle_ids: string[] }[];
  cycles: { id: string; kind: "swap" | "ring"; member_ids: string[] }[];
}

export interface FeedResponse {
  items: ProjectCard[];
  next_cursor: string | null;
}

export interface Story {
  profile: ProfileLite;
  tag: "swap" | "ring" | null;
  trade: string | null;
}

export interface Recommendation {
  project: ProjectCard;
  score: number;
  reasons: string[];
}

export type Response = "pending" | "accepted" | "declined";

export interface InboxItem {
  id: string;
  kind: "collab" | "swap" | "ring";
  direction: "incoming" | "outgoing";
  created_at: string;
  people: ProfileLite[];
  project: ProjectRef | null;
  skill: Skill | null;
  message: string | null;
  links: CycleLink[];
  responses: Record<string, Response>;
  status: Response;
  actions: ("accept" | "decline")[];
}

export interface TeamOut {
  members: Member[];
  total_bps: number;
}

export type MessageKind = "text" | "invite" | "nudge";

export interface MessageOut {
  id: string;
  body: string;
  kind: MessageKind;
  mine: boolean;
  created_at: string;
  read_at: string | null;
}

export interface ConversationOut {
  profile: ProfileLite;
  project: ProjectRef | null;
  last_body: string;
  last_kind: MessageKind;
  last_at: string;
  mine: boolean;
  unread: number;
}

export interface ThreadOut {
  profile: ProfileLite;
  project: ProjectRef | null;
  messages: MessageOut[];
  can_nudge: boolean;
}

export interface LedgerEntry {
  id: string;
  project_id: string;
  project_title: string;
  need_id: string;
  skill: string;
  owner: ProfileLite;
  contributor: ProfileLite | null;
  amount_tolken: number;
  status: "pending_funding" | "funded" | "released" | "refunded" | "cancelled";
  created_at: string;
}

export interface TolkenOut {
  balance: number;
  ledger: LedgerEntry[];
}

export interface ResearchOut {
  id: string;
  project_id: string;
  status: "queued" | "running" | "done" | "partial" | "failed";
  checks: ("market" | "cool")[];
  steps: { at: string; label: string; kind?: "step" | "fact"; source?: string }[];
  report: Record<string, unknown> | null;
  sources: { id: string; url: string; title: string; fact_ids?: string[] }[] | null;
  cool: { overall: number; measures: { key: string; score: number; reason: string }[]; why: string } | null;
  model: string | null;
  mode: string;
  is_public: boolean;
  is_sample: boolean;
  error: string | null;
  created_at: string;
}

export interface SourceFile {
  path: string;
  size_bytes: number;
  is_text: boolean;
}

export interface SourceFileOut {
  path: string;
  size_bytes: number;
  content: string | null;
  binary: boolean;
}
