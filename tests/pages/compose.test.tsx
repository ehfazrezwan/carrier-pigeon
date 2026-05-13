import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const requireAuthMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireAuth: () => requireAuthMock(),
}));
vi.mock("@/app/admin/compose/ComposeForm", () => ({
  default: () => <div data-testid="compose-form">COMPOSE</div>,
}));

beforeEach(() => {
  requireAuthMock.mockReset();
});

describe("ComposePage server component", () => {
  it("calls requireAuth then renders ComposeForm", async () => {
    requireAuthMock.mockResolvedValue(undefined);
    const { default: ComposePage } = await import("@/app/admin/compose/page");
    const el = await ComposePage();
    expect(requireAuthMock).toHaveBeenCalled();
    render(el);
    expect(screen.getByTestId("compose-form")).toBeInTheDocument();
  });
});
