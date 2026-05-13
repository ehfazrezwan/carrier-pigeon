import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const requireAuthMock = vi.fn();
const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
const db = {
  getLetterBySlug: vi.fn(),
  getRepliesForLetter: vi.fn(),
};

vi.mock("@/lib/auth", () => ({
  requireAuth: () => requireAuthMock(),
}));
vi.mock("@/lib/db", () => ({
  getDB: async () => db,
}));
vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/app/admin/letters/[slug]/CopyLink", () => ({
  default: ({ slug }: { slug: string }) => <span data-testid="copy-link">{slug}</span>,
}));

beforeEach(() => {
  requireAuthMock.mockReset();
  notFoundMock.mockClear();
  db.getLetterBySlug.mockReset();
  db.getRepliesForLetter.mockReset();
});

describe("LetterDetailPage", () => {
  it("calls notFound when letter is missing", async () => {
    requireAuthMock.mockResolvedValue(undefined);
    db.getLetterBySlug.mockResolvedValue(null);
    const { default: LetterDetailPage } = await import(
      "@/app/admin/letters/[slug]/page"
    );
    await expect(
      LetterDetailPage({ params: Promise.resolve({ slug: "missing" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("renders letter and empty replies state", async () => {
    requireAuthMock.mockResolvedValue(undefined);
    db.getLetterBySlug.mockResolvedValue({
      id: "L",
      slug: "the-slug",
      dialogue: "GREET",
      body: "BODY",
      theme: "dusk",
      sender_name: "Bob",
      created_at: "2026-05-14T00:00:00Z",
    });
    db.getRepliesForLetter.mockResolvedValue([]);
    const { default: LetterDetailPage } = await import(
      "@/app/admin/letters/[slug]/page"
    );
    const el = await LetterDetailPage({ params: Promise.resolve({ slug: "the-slug" }) });
    render(el);
    // slug appears as <h1> title and in CopyLink mock
    expect(screen.getAllByText("the-slug").length).toBeGreaterThan(0);
    expect(screen.getByText("GREET")).toBeInTheDocument();
    expect(screen.getByText("BODY")).toBeInTheDocument();
    expect(screen.getByText(/No replies yet/)).toBeInTheDocument();
    expect(screen.getByTestId("copy-link")).toHaveTextContent("the-slug");
  });

  it("renders replies when they exist", async () => {
    requireAuthMock.mockResolvedValue(undefined);
    db.getLetterBySlug.mockResolvedValue({
      id: "L",
      slug: "the-slug",
      dialogue: "GREET",
      body: "BODY",
      theme: "night",
      sender_name: "Bob",
      created_at: "2026-05-14T00:00:00Z",
    });
    db.getRepliesForLetter.mockResolvedValue([
      { id: "r1", letter_id: "L", body: "Hi back", reader_name: "Reader", created_at: "2026-05-14T01:00:00Z" },
    ]);
    const { default: LetterDetailPage } = await import(
      "@/app/admin/letters/[slug]/page"
    );
    const el = await LetterDetailPage({ params: Promise.resolve({ slug: "the-slug" }) });
    render(el);
    expect(screen.getByText("REPLIES (1)")).toBeInTheDocument();
    expect(screen.getByText("Hi back")).toBeInTheDocument();
    expect(screen.getByText("Reader")).toBeInTheDocument();
  });
});
