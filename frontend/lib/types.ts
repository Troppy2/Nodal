export type ProjectType = "software" | "hardware" | "creative";
export type Stage = "idea" | "building" | "shipped";
export type CoverPattern = "rings" | "bars" | "blocks" | "stripes" | "dots";

export interface Person {
  handle: string;
  name: string;
  initials: string;
  /** Discipline the avatar is tinted with. */
  tint: ProjectType | "teal";
}

export interface Cover {
  pattern: CoverPattern;
  tint: ProjectType;
}
