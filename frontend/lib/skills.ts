// Skill and interest vocabulary. Stands in for GET /skills and GET /tags until the API is wired.
import { offers, projects } from "./catalog";

/** Every skill someone on Nodal offers, plus a few common asks. */
export const allSkills = [
  ...new Set([
    ...Object.values(offers).flatMap((list) => list.map((o) => o.skill)),
    "Embedded Rust",
    "Video editing",
    "Copywriting",
    "Data viz",
    "Machine learning",
    "Laser cutting",
  ]),
].sort();

/** Tags used for onboarding interests and for matching people to ideas. */
export const interestTags = [...new Set(projects.flatMap((p) => p.tags))].sort();
