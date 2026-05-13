import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const routerRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefresh }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  routerRefresh.mockReset();
  vi.unstubAllGlobals();
});

async function loadList() {
  const { default: LetterList } = await import("@/app/admin/LetterList");
  return LetterList;
}

describe("LetterList", () => {
  it("shows Loading initially then renders letters", async () => {
    const letters = [
      {
        id: "1",
        slug: "alpha",
        body: "Body of alpha".repeat(20),
        theme: "dusk",
        reply_count: 1,
        dialogue: "",
        sender_name: "",
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "2",
        slug: "beta",
        body: "short",
        theme: "night",
        reply_count: 0,
        dialogue: "",
        sender_name: "",
        created_at: "2026-01-02T00:00:00Z",
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ letters }),
      })
    );

    const LetterList = await loadList();
    render(<LetterList />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("alpha")).toBeInTheDocument());
    expect(screen.getByText("beta")).toBeInTheDocument();
    expect(screen.getByText("1 reply")).toBeInTheDocument();
    expect(screen.getByText("0 replies")).toBeInTheDocument();
    // ellipsis appears for long body
    expect(screen.getByText(/\.\.\.$/)).toBeInTheDocument();
  });

  it("shows empty state when letters array is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => ({ letters: [] }) })
    );
    const LetterList = await loadList();
    render(<LetterList />);
    await waitFor(() =>
      expect(screen.getByText("No letters yet. Send one!")).toBeInTheDocument()
    );
  });

  it("shows API error message when no letters key returned", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => ({ error: "Boom" }) })
    );
    const LetterList = await loadList();
    render(<LetterList />);
    await waitFor(() => expect(screen.getByText("Boom")).toBeInTheDocument());
  });

  it("falls back to default error when no error string is provided", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => ({}) })
    );
    const LetterList = await loadList();
    render(<LetterList />);
    await waitFor(() =>
      expect(screen.getByText("Could not load letters")).toBeInTheDocument()
    );
  });

  it("shows network error when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const LetterList = await loadList();
    render(<LetterList />);
    await waitFor(() =>
      expect(screen.getByText("Network error")).toBeInTheDocument()
    );
  });

  it("logout calls DELETE /api/auth and refreshes router", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ json: async () => ({ letters: [] }) })
      .mockResolvedValueOnce({ json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    const LetterList = await loadList();
    render(<LetterList />);
    await waitFor(() => screen.getByText("No letters yet. Send one!"));
    await user.click(screen.getByRole("button", { name: "LOG OUT" }));
    await waitFor(() => expect(routerRefresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenLastCalledWith("/api/auth", { method: "DELETE" });
  });
});
