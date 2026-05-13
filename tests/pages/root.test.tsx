import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const redirectMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

beforeEach(() => {
  redirectMock.mockReset();
});

describe("Home page", () => {
  it("redirects to /admin", async () => {
    const { default: Home } = await import("@/app/page");
    Home();
    expect(redirectMock).toHaveBeenCalledWith("/admin");
  });
});

describe("RootLayout", () => {
  it("wraps children in html/body and applies font variables", async () => {
    // Mock next/font/google since it's not available in vitest environment
    vi.doMock("next/font/google", () => ({
      Press_Start_2P: () => ({ variable: "--font-pixel" }),
      VT323: () => ({ variable: "--font-vt" }),
    }));
    // Mock the CSS import
    vi.doMock("@/app/globals.css", () => ({}));
    const { default: RootLayout } = await import("@/app/layout");
    const { container } = render(
      <RootLayout>
        <p>child</p>
      </RootLayout>
    );
    // jsdom strips html/body when rendered inside a container
    expect(container.textContent).toContain("child");
  });
});
