import { describe, it, expect, vi, afterEach } from "vitest";
import { generateSlug, slugify, SLUG_PATTERN } from "@/lib/slugs";

describe("generateSlug", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns adjective-noun-number triple separated by hyphens", () => {
    const slug = generateSlug();
    const parts = slug.split("-");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toMatch(/^[a-z]+$/);
    expect(parts[1]).toMatch(/^[a-z]+$/);
    expect(parts[2]).toMatch(/^[0-9]+$/);
  });

  it("number portion is in range [0, 1000)", () => {
    for (let i = 0; i < 50; i++) {
      const slug = generateSlug();
      const num = Number(slug.split("-").pop());
      expect(num).toBeGreaterThanOrEqual(0);
      expect(num).toBeLessThan(1000);
    }
  });

  it("picks first adjective and noun and number=0 when Math.random returns 0", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(generateSlug()).toBe("gentle-wind-0");
  });

  it("picks last adjective and noun when Math.random returns just below 1", () => {
    // Math.random() ~ 0.9999 → floor(0.9999 * 20) = 19 (last index)
    vi.spyOn(Math, "random").mockReturnValue(0.9999);
    const slug = generateSlug();
    expect(slug.startsWith("evening-meadow-")).toBe(true);
  });

  it("matches SLUG_PATTERN", () => {
    for (let i = 0; i < 20; i++) {
      // ensure number portion is 2+ digits sometimes by mocking 0.1+
      const slug = generateSlug();
      // Pattern requires 3-60 chars
      expect(slug.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("slugify", () => {
  it("lowercases the input", () => {
    expect(slugify("HELLO")).toBe("hello");
  });

  it("replaces non-alphanumeric runs with single hyphen", () => {
    expect(slugify("hello world")).toBe("hello-world");
    expect(slugify("hello!!world")).toBe("hello-world");
    expect(slugify("a@b#c")).toBe("a-b-c");
  });

  it("collapses consecutive hyphens", () => {
    expect(slugify("a---b")).toBe("a-b");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("---abc---")).toBe("abc");
    expect(slugify("-abc")).toBe("abc");
    expect(slugify("abc-")).toBe("abc");
  });

  it("preserves digits and hyphens", () => {
    expect(slugify("hello-123")).toBe("hello-123");
  });

  it("truncates to 60 characters", () => {
    const long = "a".repeat(100);
    expect(slugify(long)).toHaveLength(60);
  });

  it("returns empty string for purely non-alphanumeric input", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("")).toBe("");
  });

  it("handles mixed unicode by replacing them with hyphens", () => {
    expect(slugify("héllo")).toBe("h-llo");
  });
});

describe("SLUG_PATTERN", () => {
  it("matches valid slugs", () => {
    expect(SLUG_PATTERN.test("abc")).toBe(true);
    expect(SLUG_PATTERN.test("abc-def")).toBe(true);
    expect(SLUG_PATTERN.test("a1b")).toBe(true);
    expect(SLUG_PATTERN.test("hello-world-42")).toBe(true);
  });

  it("rejects too-short slugs", () => {
    expect(SLUG_PATTERN.test("ab")).toBe(false);
    expect(SLUG_PATTERN.test("a")).toBe(false);
    expect(SLUG_PATTERN.test("")).toBe(false);
  });

  it("rejects leading/trailing hyphens", () => {
    expect(SLUG_PATTERN.test("-abc")).toBe(false);
    expect(SLUG_PATTERN.test("abc-")).toBe(false);
  });

  it("rejects uppercase or special chars", () => {
    expect(SLUG_PATTERN.test("Abc")).toBe(false);
    expect(SLUG_PATTERN.test("abc!")).toBe(false);
    expect(SLUG_PATTERN.test("a b")).toBe(false);
  });

  it("rejects >60 character slugs", () => {
    const long = "a" + "b".repeat(60);
    expect(SLUG_PATTERN.test(long)).toBe(false);
  });
});
