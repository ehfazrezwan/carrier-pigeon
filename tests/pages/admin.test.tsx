import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const isAuthedMock = vi.fn();
const requireAuthMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  isAuthed: () => isAuthedMock(),
  requireAuth: () => requireAuthMock(),
}));
vi.mock("@/app/admin/PasswordGate", () => ({
  default: () => <div data-testid="gate">GATE</div>,
}));
vi.mock("@/app/admin/LetterList", () => ({
  default: () => <div data-testid="list">LIST</div>,
}));
vi.mock("@/app/admin/admin.css", () => ({}));

beforeEach(() => {
  isAuthedMock.mockReset();
  requireAuthMock.mockReset();
});

describe("AdminPage server component", () => {
  it("renders PasswordGate when not authed", async () => {
    isAuthedMock.mockResolvedValue(false);
    const { default: AdminPage } = await import("@/app/admin/page");
    const el = await AdminPage();
    render(el);
    expect(screen.getByTestId("gate")).toBeInTheDocument();
  });

  it("renders LetterList when authed", async () => {
    isAuthedMock.mockResolvedValue(true);
    const { default: AdminPage } = await import("@/app/admin/page");
    const el = await AdminPage();
    render(el);
    expect(screen.getByTestId("list")).toBeInTheDocument();
  });
});

describe("AdminLayout", () => {
  it("renders children passthrough", async () => {
    const { default: AdminLayout } = await import("@/app/admin/layout");
    render(<AdminLayout><p>kid</p></AdminLayout>);
    expect(screen.getByText("kid")).toBeInTheDocument();
  });
});
