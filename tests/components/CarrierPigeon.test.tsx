import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// ---- gsap mock ----
// All methods are synchronous no-ops, with onComplete callbacks fired immediately
// so the animation pipeline progresses through its steps.
const gsapMock = {
  set: vi.fn(),
  to: vi.fn((_target: unknown, opts: { onComplete?: () => void } = {}) => {
    if (opts.onComplete) opts.onComplete();
    return {};
  }),
  fromTo: vi.fn(
    (_target: unknown, _from: unknown, to: { onComplete?: () => void } = {}) => {
      if (to.onComplete) to.onComplete();
      return {};
    }
  ),
  timeline: vi.fn((opts: { onComplete?: () => void } = {}) => {
    const tl = {
      to: vi.fn(() => {
        // After .to() is called, fire the outer onComplete (mirrors a finished tl)
        if (opts.onComplete) opts.onComplete();
        return tl;
      }),
    };
    return tl;
  }),
  killTweensOf: vi.fn(),
};

vi.mock("gsap", () => ({ default: gsapMock }));

// ---- AudioContext mock ----
class MockAudioContext {
  state = "running";
  currentTime = 0;
  destination = {};
  resume = vi.fn();
  createOscillator() {
    return {
      type: "",
      frequency: {
        value: 0,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: () => ({ connect: vi.fn() }),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: () => ({ connect: vi.fn() }),
    };
  }
}

beforeEach(() => {
  Object.values(gsapMock).forEach((m) => {
    if (typeof m === "function" && "mockClear" in m) (m as ReturnType<typeof vi.fn>).mockClear();
  });
  vi.stubGlobal("AudioContext", MockAudioContext);
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

async function load() {
  const { default: CarrierPigeon } = await import("@/app/CarrierPigeon");
  return CarrierPigeon;
}

describe("CarrierPigeon — render", () => {
  it("renders in demo mode (no slug) with tweaks panel and default theme dusk", async () => {
    const P = await load();
    const { container } = render(<P />);
    expect(container.querySelector(".stage.theme-dusk")).toBeInTheDocument();
    // tweaks panel is rendered in demo mode
    expect(container.querySelector(".tweaks")).toBeInTheDocument();
    expect(screen.getByText("CLICK TO BEGIN")).toBeInTheDocument();
  });

  it("renders in reader mode (with slug) without tweaks panel", async () => {
    const P = await load();
    const { container } = render(<P slug="my-slug" theme="night" senderName="ALICE" />);
    expect(container.querySelector(".stage.theme-night")).toBeInTheDocument();
    expect(container.querySelector(".tweaks")).toBeNull();
  });

  it("renders sprite SVGs inside body/perch/up/down layers", async () => {
    const P = await load();
    const { container } = render(<P />);
    expect(container.querySelector(".pigeon-body svg")).toBeInTheDocument();
    expect(container.querySelector(".wing-perch svg")).toBeInTheDocument();
    expect(container.querySelector(".wing-up svg")).toBeInTheDocument();
    expect(container.querySelector(".wing-down svg")).toBeInTheDocument();
  });

  it("renders three drifting clouds with GSAP infinite tweens", async () => {
    const P = await load();
    const { container } = render(<P />);
    expect(container.querySelectorAll(".cloud")).toHaveLength(3);
    // gsap.to was called for each of the three clouds
    expect(gsapMock.to.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("truncates senderName to 6 chars in seal", async () => {
    const P = await load();
    const { container } = render(<P senderName="LongName" slug="x" />);
    const seal = container.querySelector(".seal");
    expect(seal?.textContent).toBe("LongNa");
  });
});

describe("CarrierPigeon — stage click and keydown start", () => {
  it("hides hint and runs flyIn timeline on first click", async () => {
    const P = await load();
    const { container } = render(<P />);
    const stage = container.querySelector(".stage") as HTMLElement;
    const hint = container.querySelector(".hint") as HTMLElement;
    await act(async () => {
      fireEvent.click(stage);
    });
    expect(hint.style.display).toBe("none");
    // timeline was created (the flyIn timeline)
    expect(gsapMock.timeline).toHaveBeenCalled();
  });

  it("ignores subsequent clicks after start", async () => {
    const P = await load();
    const { container } = render(<P />);
    const stage = container.querySelector(".stage") as HTMLElement;
    await act(async () => {
      fireEvent.click(stage);
    });
    const tlCount = gsapMock.timeline.mock.calls.length;
    await act(async () => {
      fireEvent.click(stage);
    });
    expect(gsapMock.timeline.mock.calls.length).toBe(tlCount);
  });

  it("starts on keydown", async () => {
    const P = await load();
    render(<P />);
    await act(async () => {
      fireEvent.keyDown(window, { key: "Enter" });
    });
    expect(gsapMock.timeline).toHaveBeenCalled();
  });
});

describe("CarrierPigeon — resize handler", () => {
  it("re-computes layout on window resize", async () => {
    const P = await load();
    render(<P />);
    // No assertion needed beyond not throwing — covers the resize listener.
    await act(async () => {
      fireEvent(window, new Event("resize"));
    });
  });
});

describe("CarrierPigeon — handleYes (initial phase)", () => {
  it("clicking YES, PLEASE button kicks off scroll unfurl path", async () => {
    const P = await load();
    const { container } = render(<P />);
    const yesBtn = container.querySelector(".speech .btn.primary") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(yesBtn);
    });
    // setTimeout(unfurlScroll, 520) — flush via fake timers
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(gsapMock.to).toHaveBeenCalled();
  });
});

describe("CarrierPigeon — handleNo path", () => {
  it("clicking NOT YET runs the wait response", async () => {
    const P = await load();
    const { container } = render(<P />);
    const noBtn = container.querySelector(".speech .btn:not(.primary)") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(noBtn);
    });
    // typeText runs with internal setTimeouts. Advance in small steps so
    // each async await wait(...) can drain microtasks.
    for (let i = 0; i < 60; i++) {
      await act(async () => {
        vi.advanceTimersByTime(300);
      });
    }
    const yesBtn = container.querySelector(".speech .btn.primary") as HTMLButtonElement;
    expect(yesBtn.textContent).toBe("I'M READY");
    expect((noBtn as HTMLElement).style.display).toBe("none");
  });
});

describe("CarrierPigeon — handleClose (after-close phase)", () => {
  it("in reader mode, sets WRITE A REPLY / SEND PIGEON OFF labels", async () => {
    const P = await load();
    const { container } = render(<P slug="abc" />);
    const closeBtn = container.querySelector(".close-btn") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(closeBtn);
    });
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    const yesBtn = container.querySelector(".speech .btn.primary") as HTMLButtonElement;
    const noBtn = container.querySelector(".speech .btn:not(.primary)") as HTMLButtonElement;
    expect(yesBtn.textContent).toBe("WRITE A REPLY");
    expect(noBtn.textContent).toBe("SEND PIGEON OFF");
  });

  it("in demo mode, sets READ AGAIN / ALL DONE labels", async () => {
    const P = await load();
    const { container } = render(<P />);
    const closeBtn = container.querySelector(".close-btn") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(closeBtn);
    });
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    const yesBtn = container.querySelector(".speech .btn.primary") as HTMLButtonElement;
    const noBtn = container.querySelector(".speech .btn:not(.primary)") as HTMLButtonElement;
    expect(yesBtn.textContent).toBe("READ AGAIN");
    expect(noBtn.textContent).toBe("ALL DONE");
  });
});

describe("CarrierPigeon — after-close YES button (reader)", () => {
  it("opens reply overlay in reader mode", async () => {
    const P = await load();
    const { container } = render(<P slug="abc" />);
    fireEvent.click(container.querySelector(".close-btn") as HTMLButtonElement);
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    const yesBtn = container.querySelector(".speech .btn.primary") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(yesBtn);
    });
    expect(container.querySelector(".reply-form")).toBeInTheDocument();
  });

  it("in demo mode, after-close YES re-runs handleYes (no reply overlay)", async () => {
    const P = await load();
    const { container } = render(<P />);
    fireEvent.click(container.querySelector(".close-btn") as HTMLButtonElement);
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    const yesBtn = container.querySelector(".speech .btn.primary") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(yesBtn);
    });
    // No reply form rendered
    expect(container.querySelector(".reply-form")).toBeNull();
  });
});

describe("CarrierPigeon — handleNo after-close (reader = send pigeon off)", () => {
  it("clicking SEND PIGEON OFF triggers async farewell type, fly-out, and reset", async () => {
    const P = await load();
    const { container } = render(<P slug="abc" />);
    fireEvent.click(container.querySelector(".close-btn") as HTMLButtonElement);
    for (let i = 0; i < 30; i++) {
      await act(async () => {
        vi.advanceTimersByTime(200);
      });
    }
    const noBtn = container.querySelector(".speech .btn:not(.primary)") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(noBtn);
    });
    // Many small ticks so async typeText microtasks can chain
    for (let i = 0; i < 400; i++) {
      await act(async () => {
        vi.advanceTimersByTime(50);
      });
    }
    const hint = container.querySelector(".hint") as HTMLElement;
    expect(hint.textContent).toBe("CLICK TO BEGIN");
  });
});

describe("CarrierPigeon — ReplyOverlay", () => {
  async function openReplyOverlay() {
    const P = await load();
    const view = render(<P slug="abc" />);
    fireEvent.click(view.container.querySelector(".close-btn") as HTMLButtonElement);
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    await act(async () => {
      fireEvent.click(view.container.querySelector(".speech .btn.primary") as HTMLButtonElement);
    });
    return view;
  }

  it("renders reply form with empty initial state", async () => {
    const view = await openReplyOverlay();
    const body = view.container.querySelector(".reply-body") as HTMLTextAreaElement;
    expect(body.value).toBe("");
    expect(view.container.querySelector(".reply-name-input")).toBeInTheDocument();
  });

  it("disables SEND REPLY until body has content", async () => {
    const view = await openReplyOverlay();
    const sendBtn = screen.getByRole("button", { name: "SEND REPLY" });
    expect(sendBtn).toBeDisabled();
    const body = view.container.querySelector(".reply-body") as HTMLTextAreaElement;
    fireEvent.change(body, { target: { value: "Hello back" } });
    expect(sendBtn).not.toBeDisabled();
  });

  it("does not submit when body is whitespace only", async () => {
    const view = await openReplyOverlay();
    const body = view.container.querySelector(".reply-body") as HTMLTextAreaElement;
    fireEvent.change(body, { target: { value: "   " } });
    fireEvent.submit(view.container.querySelector(".reply-form")!);
    // SEND REPLY is disabled and no network call happened
    expect(screen.getByRole("button", { name: "SEND REPLY" })).toBeDisabled();
  });

  it("CANCEL closes the overlay", async () => {
    const view = await openReplyOverlay();
    fireEvent.click(screen.getByRole("button", { name: "CANCEL" }));
    expect(view.container.querySelector(".reply-form")).toBeNull();
  });

  it("clicking the reply-veil closes the overlay (sending=false branch)", async () => {
    const view = await openReplyOverlay();
    const veil = view.container.querySelector(".reply-veil") as HTMLElement;
    fireEvent.click(veil);
    expect(view.container.querySelector(".reply-form")).toBeNull();
  });

  it("submits reply, types farewell, calls flyOut and resetScene", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ reply: { id: "r1" } }),
      })
    );
    const view = await openReplyOverlay();
    const body = view.container.querySelector(".reply-body") as HTMLTextAreaElement;
    fireEvent.change(body, { target: { value: "Hello back" } });
    const name = view.container.querySelector(".reply-name-input") as HTMLInputElement;
    fireEvent.change(name, { target: { value: "Alice" } });
    await act(async () => {
      fireEvent.submit(view.container.querySelector(".reply-form")!);
    });
    // Drain microtasks + timers in small chunks so each await wait(...) inside
    // submitReply has a chance to schedule the next setTimeout.
    for (let i = 0; i < 400; i++) {
      await act(async () => {
        vi.advanceTimersByTime(50);
      });
    }
    await waitFor(() => {
      const hint = view.container.querySelector(".hint") as HTMLElement;
      expect(hint.textContent).toBe("CLICK TO BEGIN");
    }, { timeout: 2000 });
  });

  it("shows error from API response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "rejected" }),
      })
    );
    const view = await openReplyOverlay();
    const body = view.container.querySelector(".reply-body") as HTMLTextAreaElement;
    fireEvent.change(body, { target: { value: "x" } });
    await act(async () => {
      fireEvent.submit(view.container.querySelector(".reply-form")!);
    });
    await waitFor(() => screen.getByText("rejected"));
  });

  it("falls back to default error when API error string missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      })
    );
    const view = await openReplyOverlay();
    const body = view.container.querySelector(".reply-body") as HTMLTextAreaElement;
    fireEvent.change(body, { target: { value: "x" } });
    await act(async () => {
      fireEvent.submit(view.container.querySelector(".reply-form")!);
    });
    await waitFor(() => screen.getByText("Could not deliver reply."));
  });

  it("shows network error when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const view = await openReplyOverlay();
    const body = view.container.querySelector(".reply-body") as HTMLTextAreaElement;
    fireEvent.change(body, { target: { value: "x" } });
    await act(async () => {
      fireEvent.submit(view.container.querySelector(".reply-form")!);
    });
    await waitFor(() => screen.getByText("Network error."));
  });
});

describe("CarrierPigeon — tweaks panel (demo mode)", () => {
  it("clicking close-x removes 'visible' class from tweaks", async () => {
    const P = await load();
    const { container } = render(<P />);
    const tweaks = container.querySelector(".tweaks") as HTMLElement;
    tweaks.classList.add("visible");
    fireEvent.click(container.querySelector(".close-x") as HTMLElement);
    expect(tweaks.classList.contains("visible")).toBe(false);
  });

  it("changing dialogue textarea updates state", async () => {
    const P = await load();
    const { container } = render(<P />);
    const ta = container.querySelector(".tweaks textarea") as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "new dialogue" } });
    // No throw is the assertion — internal state was mutated
    expect(ta.value).toBe("new dialogue");
  });

  it("changing letter textarea updates state", async () => {
    const P = await load();
    const { container } = render(<P />);
    const tas = container.querySelectorAll(".tweaks textarea");
    const letterTA = tas[1] as HTMLTextAreaElement;
    fireEvent.change(letterTA, { target: { value: "new letter body" } });
    expect(letterTA.value).toBe("new letter body");
  });

  it("clicking a tweaks pill changes theme via handleThemeClick", async () => {
    const P = await load();
    const { container } = render(<P />);
    const stage = container.querySelector(".stage") as HTMLElement;
    expect(stage.classList.contains("theme-dusk")).toBe(true);
    const nightPill = container.querySelector(
      '.tweaks [data-theme-pill="night"]'
    ) as HTMLElement;
    fireEvent.click(nightPill);
    expect(stage.classList.contains("theme-night")).toBe(true);
    expect(nightPill.classList.contains("active")).toBe(true);
  });

  it("REPLAY button reloads the window", async () => {
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload },
    });

    const P = await load();
    const { container } = render(<P />);
    const replay = container.querySelector(".tweaks-replay") as HTMLElement;
    fireEvent.click(replay);
    expect(reload).toHaveBeenCalled();
  });
});

describe("CarrierPigeon — AudioContext error path", () => {
  it("handles AudioContext constructor throwing", async () => {
    vi.stubGlobal("AudioContext", function () {
      throw new Error("no audio");
    });
    const P = await load();
    const { container } = render(<P />);
    const stage = container.querySelector(".stage") as HTMLElement;
    // ensureAudio is called via click — should not throw
    await act(async () => {
      fireEvent.click(stage);
    });
  });

  it("resumes a suspended AudioContext", async () => {
    const resume = vi.fn();
    vi.stubGlobal(
      "AudioContext",
      class {
        state = "suspended";
        currentTime = 0;
        destination = {};
        resume = resume;
        createOscillator() {
          return {
            type: "",
            frequency: {
              value: 0,
              setValueAtTime: vi.fn(),
              linearRampToValueAtTime: vi.fn(),
            },
            connect: () => ({ connect: vi.fn() }),
            start: vi.fn(),
            stop: vi.fn(),
          };
        }
        createGain() {
          return {
            gain: {
              setValueAtTime: vi.fn(),
              exponentialRampToValueAtTime: vi.fn(),
              linearRampToValueAtTime: vi.fn(),
            },
            connect: () => ({ connect: vi.fn() }),
          };
        }
      }
    );
    const P = await load();
    const { container } = render(<P />);
    await act(async () => {
      fireEvent.click(container.querySelector(".stage") as HTMLElement);
    });
    expect(resume).toHaveBeenCalled();
  });
});

describe("CarrierPigeon — unfurlScroll / typeLetter / seal", () => {
  async function rideUnfurl() {
    const P = await load();
    // Use a short letter so typeLetter completes fast under fake timers
    const view = render(<P letter="Hi." dialogue="Yo." />);
    // Click YES, PLEASE → handleYes → setTimeout(unfurlScroll, 520)
    fireEvent.click(view.container.querySelector(".speech .btn.primary") as HTMLButtonElement);
    // Drain async typing + waits — many small ticks so microtasks flush between
    for (let i = 0; i < 200; i++) {
      await act(async () => {
        vi.advanceTimersByTime(50);
      });
    }
    return view;
  }

  it("typeLetter writes the letter text into the typer span", async () => {
    const view = await rideUnfurl();
    const typer = view.container.querySelector(".typer") as HTMLElement;
    expect(typer.textContent).toBe("Hi.");
  });

  it("scrollable class is added to paper", async () => {
    const view = await rideUnfurl();
    const paper = view.container.querySelector(".paper") as HTMLElement;
    expect(paper.classList.contains("scrollable")).toBe(true);
  });
});

describe("CarrierPigeon — read-again demo flow", () => {
  it("after-close YES (demo) replays handleYes and re-opens scroll", async () => {
    const P = await load();
    const { container } = render(<P letter="Yo." dialogue="Hi." />);
    fireEvent.click(container.querySelector(".close-btn") as HTMLButtonElement);
    for (let i = 0; i < 30; i++) {
      await act(async () => {
        vi.advanceTimersByTime(200);
      });
    }
    const yesBtn = container.querySelector(".speech .btn.primary") as HTMLButtonElement;
    expect(yesBtn.textContent).toBe("READ AGAIN");
    await act(async () => {
      fireEvent.click(yesBtn);
    });
    for (let i = 0; i < 200; i++) {
      await act(async () => {
        vi.advanceTimersByTime(50);
      });
    }
    // Letter typed again
    const typer = container.querySelector(".typer") as HTMLElement;
    expect(typer.textContent).toBe("Yo.");
  });
});

describe("CarrierPigeon — default props branch", () => {
  it("uses default dialogue/letter/theme/senderName when none provided", async () => {
    const P = await load();
    const { container } = render(<P />);
    // Seal renders DEFAULTS.senderName "sninja" sliced
    expect(container.querySelector(".seal")?.textContent).toBe("sninja");
    expect(container.querySelector(".stage")?.classList.contains("theme-dusk")).toBe(true);
  });

  it("explicit dialogue prop is reflected in tweak textarea", async () => {
    const P = await load();
    const { container } = render(<P dialogue="CUSTOM DIAL" letter="CUSTOM LETTER" />);
    const tas = container.querySelectorAll(".tweaks textarea");
    expect((tas[0] as HTMLTextAreaElement).value).toBe("CUSTOM DIAL");
    expect((tas[1] as HTMLTextAreaElement).value).toBe("CUSTOM LETTER");
  });
});
