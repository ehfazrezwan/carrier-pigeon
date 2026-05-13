const adjectives = [
  "gentle", "swift", "brave", "quiet", "golden", "silver", "warm", "bright",
  "misty", "dusty", "amber", "crimson", "velvet", "frosted", "humming", "drifting",
  "soaring", "twilight", "morning", "evening",
];
const nouns = [
  "wind", "feather", "wing", "sky", "cloud", "dawn", "star", "nest",
  "song", "leaf", "moon", "branch", "horizon", "willow", "ember", "echo",
  "lantern", "petal", "river", "meadow",
];

export function generateSlug(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}-${noun}-${num}`;
}

// Normalize user-typed input into a URL-safe slug.
// Lowercase, replace anything non-alphanumeric with hyphens, collapse hyphens, trim.
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/;
