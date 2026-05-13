import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const routerRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefresh }),
}));

beforeEach(() => {
  routerRefresh.mockReset();
  vi.unstubAllGlobals();
});

async function loadComponent() {
  const { default: PasswordGate } = await import("@/app/admin/PasswordGate");
  return PasswordGate;
}

describe("PasswordGate", () => {
  it("renders title, label, and submit button", async () => {
    const Gate = await loadComponent();
    render(<Gate />);
    expect(screen.getByText("CARRIER PIGEON")).toBeInTheDocument();
    expect(screen.getByText("SECRET WORD")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ENTER" })).toBeInTheDocument();
  });

  it("submits the password and refreshes router on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    const Gate = await loadComponent();
    render(<Gate />);

    const input = document.querySelector("input[type=password]") as HTMLInputElement as HTMLInputElement;
    await user.type(input, "open-sesame");
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/api/auth");
    expect(JSON.parse(call[1].body)).toEqual({ password: "open-sesame" });
    await waitFor(() => expect(routerRefresh).toHaveBeenCalled());
  });

  it("shows error message and clears input on auth failure with API-provided error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Custom error" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    const Gate = await loadComponent();
    render(<Gate />);
    await user.type(document.querySelector("input[type=password]") as HTMLInputElement, "wrong");
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => expect(screen.getByText("Custom error")).toBeInTheDocument());
    expect((document.querySelector("input[type=password]") as HTMLInputElement as HTMLInputElement).value).toBe("");
    expect(routerRefresh).not.toHaveBeenCalled();
  });

  it("falls back to default error when response JSON is invalid", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error("bad json");
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    const Gate = await loadComponent();
    render(<Gate />);
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() =>
      expect(screen.getByText("Wrong secret word.")).toBeInTheDocument()
    );
  });

  it("shows CHECKING... and disables button while in flight", async () => {
    let resolve!: (v: { ok: boolean }) => void;
    const fetchMock = vi.fn(
      () => new Promise<{ ok: boolean }>((r) => (resolve = r))
    );
    vi.stubGlobal("fetch", fetchMock);

    const Gate = await loadComponent();
    render(<Gate />);
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "CHECKING..." })).toBeDisabled()
    );
    resolve({ ok: true });
  });

  it("falls back to default error when API returns no error field", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const Gate = await loadComponent();
    render(<Gate />);
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() =>
      expect(screen.getByText("Wrong secret word.")).toBeInTheDocument()
    );
  });
});
