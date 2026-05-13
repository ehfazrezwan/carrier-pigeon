import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
const db = {
  getLetterBySlug: vi.fn(),
};

vi.mock("@/lib/db", () => ({
  getDB: async () => db,
}));
vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
}));
vi.mock("@/app/CarrierPigeon", () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="pigeon" data-props={JSON.stringify(props)} />
  ),
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

beforeEach(() => {
  notFoundMock.mockClear();
  db.getLetterBySlug.mockReset();
});

describe("Public LetterPage", () => {
  it("calls notFound when letter is missing", async () => {
    db.getLetterBySlug.mockResolvedValue(null);
    const { default: LetterPage } = await import("@/app/letter/[slug]/page");
    await expect(
      LetterPage({ params: Promise.resolve({ slug: "missing" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders CarrierPigeon with letter props when found", async () => {
    db.getLetterBySlug.mockResolvedValue({
      id: "L",
      slug: "s",
      dialogue: "D",
      body: "B",
      theme: "night",
      sender_name: "Bob",
      created_at: "",
    });
    const { default: LetterPage } = await import("@/app/letter/[slug]/page");
    const el = await LetterPage({ params: Promise.resolve({ slug: "s" }) });
    render(el);
    const node = screen.getByTestId("pigeon");
    const props = JSON.parse(node.getAttribute("data-props")!);
    expect(props).toEqual({
      dialogue: "D",
      letter: "B",
      theme: "night",
      senderName: "Bob",
      slug: "s",
    });
  });
});

describe("Letter NotFound page", () => {
  it("renders the lost-in-sky message", async () => {
    const { default: NotFound } = await import("@/app/letter/[slug]/not-found");
    render(<NotFound />);
    expect(screen.getByText("LOST IN THE SKY")).toBeInTheDocument();
    expect(screen.getByText(/never made it home/)).toBeInTheDocument();
    expect(screen.getByText("GO HOME")).toBeInTheDocument();
  });
});
