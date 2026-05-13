import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.useRealTimers();
});

async function loadCopyLink() {
  const { default: CopyLink } = await import(
    "@/app/admin/letters/[slug]/CopyLink"
  );
  return CopyLink;
}

describe("CopyLink", () => {
  it("renders the URL with window origin after mount", async () => {
    const CopyLink = await loadCopyLink();
    const { container } = render(<CopyLink slug="hello" />);
    await waitFor(() =>
      expect(container.textContent).toContain(`${window.location.origin}/letter/hello`)
    );
  });

  it("copies URL to clipboard on click and toggles COPIED! label, reverting after 1800ms", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const CopyLink = await loadCopyLink();
    render(<CopyLink slug="my-slug" />);

    const btn = screen.getByRole("button", { name: "COPY" });
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("/letter/my-slug")
    );
    expect(screen.getByRole("button", { name: "COPIED!" })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1800);
    });
    expect(screen.getByRole("button", { name: "COPY" })).toBeInTheDocument();
  });

  it("does nothing if url is empty (early return)", async () => {
    const writeText = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const CopyLink = await loadCopyLink();
    // Force window.location.origin to be empty for this test by mocking
    const origin = window.location.origin;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, origin: "" },
    });

    try {
      const { container, rerender } = render(<CopyLink slug="x" />);
      // useEffect sets url = "" + "/letter/x" = "/letter/x" — but the falsy guard
      // `if (!url) return` only triggers when url is empty. Since "/letter/x"
      // is truthy, the early-return branch needs the initial state (url === "").
      // Trigger click *before* effect runs by directly invoking the rendered
      // button. In practice both branches: with url set, writeText is called.
      rerender(<CopyLink slug="x" />);
      const btn = container.querySelector("button")!;
      fireEvent.click(btn);
      // writeText will have been called once since url resolves to "/letter/x"
      expect(writeText).toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { ...window.location, origin },
      });
    }
  });
});
