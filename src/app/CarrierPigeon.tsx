"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import gsap from "gsap";
import type { Theme } from "@/lib/types";

const PAL: Record<string, string> = {
  W: "#f5efe5", L: "#cdd1d5", G: "#9aa1a8", D: "#5b6168", B: "#353a40",
  E: "#1a1a1a", O: "#f59a3a", R: "#c87420", P: "#e2b4ad", F: "#9a5a26",
};

const PIGEON_BODY = [
  "........................",
  "........................",
  "............WWWW........",
  "...........WWWWWW.......",
  "..........WWLLLLWO......",
  "..........WLLWWEWO......",
  "..........WWLLWWWOO.....",
  "..........WWWLWWWO......",
  "..........WWWWWWW.......",
  "..........LLLLWWWW......",
  "........LLLLGGGGGGG.....",
  ".......LLGGGGGGGGGGG....",
  "......LLGGGGGGGGGGGGG...",
  "......LLGGGGGGGGGGGGG...",
  "......LLLGGGGGGGGGGG....",
  "......LLLLGGGGGGGGG.....",
  ".......LLLGGGGGGGG......",
  "........LLGGGGGGG.......",
  ".........LLGGGG.........",
  "........FF...FF.........",
  "........FF...FF.........",
];

const WING_PERCH = [
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........DDD.............",
  "........DDDDD...........",
  "......DDDDDDDDDD........",
  "......DDDDBBDDDDD.......",
  ".......DDDDDDDDDD.......",
  "........DDDDDDDD........",
  "..........DDDDD.........",
  "...........DD...........",
  "........................",
  "........................",
  "........................",
];

const WING_UP = [
  "....DD..................",
  "...DDDD.................",
  "..DDDDDD................",
  "..DDDDDDDDD.............",
  "...DDDDDDDD.............",
  "....DDDDDD..............",
  "......DDDD..............",
  "........DD..............",
  "........DD..............",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
];

const WING_DOWN = [
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........DDDD............",
  "......DDDDDDDD..........",
  ".....DDDDBBDDDDD........",
  "....DDDDDDDDDDDDD.......",
  "....DDDDDDDDDDDD........",
  ".....DDDDDDDDD..........",
  "......DDDDDDD...........",
  ".......DDDDD............",
  "........................",
  "........................",
];

const cloudA = [[2,1,6,2],[1,2,9,3],[0,3,11,2],[3,5,7,1],[0,4,2,1,"s"],[2,5,8,1,"s"]];
const cloudB = [[1,0,4,2],[0,1,6,2],[3,2,7,2],[2,3,6,1],[3,3,5,1,"s"]];
const cloudC = [[3,0,5,2],[1,1,9,3],[0,2,11,3],[2,5,9,1],[0,4,3,1,"s"],[9,3,2,2,"s"],[3,5,8,1,"s"]];

const DEFAULTS = {
  dialogue: "*PHEW!*  That was a long flight...\nI've come a long way to find YOU.\nI'm carrying a letter — sealed, just for you. Shall I deliver it?",
  letter: "Dear reader,\n\nIf you are seeing this, then I have flown true.\n\nWe pigeons carry the words — we do not write them — but I have read this one, and I think it is gentle. So I will leave it with you.\n\nYou are doing better than you think.\nThe quiet effort counts. So does the showing-up. So does the rest.\n\nDrink some water. Stretch your shoulders. The sky will still be here when you look up.\n\nWith wings,\nThe Carrier",
  theme: "dusk" as Theme,
  senderName: "sninja",
};

function renderSprite(rows: string[], palette: Record<string, string>): SVGSVGElement {
  const w = rows[0].length, h = rows.length;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = rows[y][x];
      if (c === "." || !palette[c]) continue;
      const r = document.createElementNS(ns, "rect");
      r.setAttribute("x", String(x));
      r.setAttribute("y", String(y));
      r.setAttribute("width", "1");
      r.setAttribute("height", "1");
      r.setAttribute("fill", palette[c]);
      svg.appendChild(r);
    }
  }
  return svg;
}

function buildCloud(parent: HTMLElement, cells: (number | string)[][]) {
  const el = document.createElement("div");
  el.className = "cloud";
  let maxX = 0, maxY = 0;
  cells.forEach(c => { maxX = Math.max(maxX, (c[0] as number) + (c[2] as number)); maxY = Math.max(maxY, (c[1] as number) + (c[3] as number)); });
  el.style.width = maxX * 6 + "px";
  el.style.height = maxY * 6 + "px";
  cells.forEach(c => {
    const d = document.createElement("div");
    d.className = c[4] === "s" ? "sh" : "px";
    d.style.left = (c[0] as number) * 6 + "px";
    d.style.top = (c[1] as number) * 6 + "px";
    d.style.width = (c[2] as number) * 6 + "px";
    d.style.height = (c[3] as number) * 6 + "px";
    el.appendChild(d);
  });
  parent.appendChild(el);
  return el;
}

interface CarrierPigeonProps {
  dialogue?: string;
  letter?: string;
  theme?: Theme;
  senderName?: string;
  slug?: string;
}

type ReplyState = "idle" | "form" | "sending" | "sent" | "error";

export default function CarrierPigeon({
  dialogue,
  letter,
  theme,
  senderName,
  slug,
}: CarrierPigeonProps = {}) {
  const isReader = !!slug;

  const stageRef = useRef<HTMLDivElement>(null);
  const cloudsRef = useRef<HTMLDivElement>(null);
  const pigeonRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const speechRef = useRef<HTMLDivElement>(null);
  const speechTextRef = useRef<HTMLSpanElement>(null);
  const speechCaretRef = useRef<HTMLSpanElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const scrollStageRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const scrollElRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const paperInnerRef = useRef<HTMLDivElement>(null);
  const typerRef = useRef<HTMLSpanElement>(null);
  const paperCaretRef = useRef<HTMLSpanElement>(null);
  const sealRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const btnYesRef = useRef<HTMLButtonElement>(null);
  const btnNoRef = useRef<HTMLButtonElement>(null);
  const tweaksRef = useRef<HTMLDivElement>(null);
  const tweakDialogRef = useRef<HTMLTextAreaElement>(null);
  const tweakLetterRef = useRef<HTMLTextAreaElement>(null);
  const layerBodyRef = useRef<HTMLDivElement>(null);
  const layerPerchRef = useRef<HTMLDivElement>(null);
  const layerUpRef = useRef<HTMLDivElement>(null);
  const layerDownRef = useRef<HTMLDivElement>(null);

  const startedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stateRef = useRef({
    dialogue: dialogue || DEFAULTS.dialogue,
    letter: letter || DEFAULTS.letter,
    theme: (theme || DEFAULTS.theme) as Theme,
    senderName: senderName || DEFAULTS.senderName,
  });
  // current "mode" of the after-close buttons: which letter-reading round
  const phaseRef = useRef<"initial" | "after-close">("initial");

  const [replyState, setReplyState] = useState<ReplyState>("idle");
  const [replyError, setReplyError] = useState("");

  const ensureAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new AudioContext(); } catch { audioCtxRef.current = null; }
    }
    if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
  }, []);

  const tick = useCallback((freq = 760, dur = 0.04, vol = 0.04) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq + (Math.random() * 60 - 30);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + dur);
  }, []);

  const coo = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(380, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(310, ctx.currentTime + 0.18);
    osc.frequency.linearRampToValueAtTime(360, ctx.currentTime + 0.32);
    gain.gain.setValueAtTime(0.0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.04);
    gain.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.45);
  }, []);

  const computeLayout = useCallback(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const branchTopY = vh * 0.62 - 200 + 72;
    const pigeonLandX = vw * 0.38 - 96;
    const pigeonLandY = branchTopY - 168 + 12;
    return { vw, vh, pigeonLandX, pigeonLandY, branchTopY };
  }, []);

  useEffect(() => {
    [
      [layerBodyRef, PIGEON_BODY],
      [layerPerchRef, WING_PERCH],
      [layerUpRef, WING_UP],
      [layerDownRef, WING_DOWN],
    ].forEach(([ref, data]) => {
      const el = (ref as React.RefObject<HTMLDivElement | null>).current;
      if (el) { el.innerHTML = ""; el.appendChild(renderSprite(data as string[], PAL)); }
    });

    const cp = cloudsRef.current;
    if (!cp) return;
    cp.innerHTML = "";
    const c1 = buildCloud(cp, cloudA);
    const c2 = buildCloud(cp, cloudB);
    const c3 = buildCloud(cp, cloudC);
    Object.assign(c1.style, { left: "6%", top: "10%", opacity: "0.95" });
    Object.assign(c2.style, { left: "42%", top: "5%", opacity: "0.85", transform: "scale(0.75)" });
    Object.assign(c3.style, { left: "62%", top: "16%", opacity: "0.9" });
    gsap.to(c1, { x: "+=80", duration: 24, repeat: -1, yoyo: true, ease: "sine.inOut" });
    gsap.to(c2, { x: "+=60", duration: 18, repeat: -1, yoyo: true, ease: "sine.inOut" });
    gsap.to(c3, { x: "+=100", duration: 28, repeat: -1, yoyo: true, ease: "sine.inOut" });

    const _pigeon = pigeonRef.current;
    if (!_pigeon) return;
    const { vh } = computeLayout();
    gsap.set(_pigeon, { x: -260, y: vh * 0.08, scale: 0.18, rotation: -6 });

    setTheme(stateRef.current.theme);

    if (!isReader && tweakDialogRef.current) tweakDialogRef.current.value = stateRef.current.dialogue;
    if (!isReader && tweakLetterRef.current) tweakLetterRef.current.value = stateRef.current.letter;
  }, [computeLayout, isReader]);

  useEffect(() => {
    const onResize = () => computeLayout();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [computeLayout]);

  function setTheme(t: string) {
    const s = stageRef.current;
    if (!s) return;
    s.classList.remove("theme-day", "theme-dusk", "theme-dawn", "theme-night");
    s.classList.add("theme-" + t);
    stateRef.current.theme = t as Theme;
  }

  function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }

  async function typeText(el: HTMLElement, text: string, speed = 36, onChar?: (ch: string) => void) {
    el.textContent = "";
    for (let i = 0; i < text.length; i++) {
      el.textContent += text[i];
      if (onChar) onChar(text[i]);
      let pause = speed;
      if (",.!?".includes(text[i])) pause = speed * 6;
      await wait(pause);
    }
  }

  const startSequence = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    ensureAudio();
    if (hintRef.current) hintRef.current.style.display = "none";
    flyIn();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensureAudio]);

  useEffect(() => {
    const stage = stageRef.current;
    const handleClick = () => { if (!startedRef.current) startSequence(); };
    const handleKey = () => { if (!startedRef.current) startSequence(); };
    stage?.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => { stage?.removeEventListener("click", handleClick); window.removeEventListener("keydown", handleKey); };
  }, [startSequence]);

  function flyIn() {
    const _p = pigeonRef.current;
    if (!_p) return;
    const layout = computeLayout();
    const { vw, vh, pigeonLandX, pigeonLandY } = layout;
    _p.classList.add("flying"); _p.classList.remove("perched");
    const tl = gsap.timeline({ onComplete: () => onLanded(layout) });
    tl.to(_p, { keyframes: [
      { x: vw * 0.08 + 40, y: vh * 0.12, scale: 0.25, rotation: -4, duration: 1.2, ease: "sine.inOut" },
      { x: vw * 0.2, y: vh * 0.2, scale: 0.4, rotation: -2, duration: 1.0, ease: "sine.inOut" },
      { x: vw * 0.3, y: vh * 0.32, scale: 0.58, rotation: 2, duration: 0.9, ease: "sine.inOut" },
      { x: vw * 0.36, y: vh * 0.46, scale: 0.78, rotation: 6, duration: 0.8, ease: "sine.in" },
      { x: pigeonLandX - 10, y: pigeonLandY - 24, scale: 0.92, rotation: 4, duration: 0.55, ease: "sine.out" },
      { x: pigeonLandX, y: pigeonLandY, scale: 1.0, rotation: 0, duration: 0.4, ease: "power2.out" },
    ]});
  }

  // Reverse of flyIn — pigeon takes off from perched position and flies away to upper-right.
  function flyOut(onDone?: () => void) {
    const _p = pigeonRef.current, _s = shadowRef.current;
    if (!_p) return;
    // stop the idle bob
    gsap.killTweensOf(_p);
    _p.classList.add("flying"); _p.classList.remove("perched");
    if (_s) gsap.to(_s, { opacity: 0, duration: 0.3 });

    const { vw, vh } = computeLayout();
    const tl = gsap.timeline({ onComplete: () => onDone?.() });
    tl.to(_p, { keyframes: [
      // little crouch + lift off
      { y: "-=24", scale: 1.02, rotation: -3, duration: 0.35, ease: "sine.out" },
      // climb up and to the right, growing smaller
      { x: vw * 0.55, y: vh * 0.40, scale: 0.85, rotation: -8, duration: 0.7, ease: "sine.in" },
      { x: vw * 0.70, y: vh * 0.30, scale: 0.62, rotation: -10, duration: 0.8, ease: "sine.inOut" },
      { x: vw * 0.85, y: vh * 0.18, scale: 0.42, rotation: -8, duration: 0.9, ease: "sine.inOut" },
      // off-screen upper right, tiny
      { x: vw + 240, y: vh * 0.06, scale: 0.18, rotation: -6, duration: 1.1, ease: "sine.in" },
    ]});
  }

  // After the pigeon has flown off, wait, then type the hint back in and reset for replay.
  async function resetScene() {
    // 3 second pause for the empty sky
    await wait(3000);

    // Reset internal state
    startedRef.current = false;
    phaseRef.current = "initial";
    setReplyState("idle");
    setReplyError("");

    // Reset pigeon: hide off-screen left, stop class state
    const _p = pigeonRef.current;
    if (_p) {
      _p.classList.remove("flying", "perched");
      const { vh } = computeLayout();
      gsap.set(_p, { x: -260, y: vh * 0.08, scale: 0.18, rotation: -6 });
      _p.classList.add("flying");
    }

    // Reset speech state
    if (speechTextRef.current) speechTextRef.current.textContent = "";
    if (speechCaretRef.current) speechCaretRef.current.style.display = "none";
    gsap.set(speechRef.current, { opacity: 0, scale: 0.2 });
    gsap.set(actionsRef.current, { opacity: 0, y: 6 });

    // Reset button labels for next round
    if (btnYesRef.current) btnYesRef.current.textContent = "YES, PLEASE";
    if (btnNoRef.current) {
      btnNoRef.current.style.display = "";
      btnNoRef.current.textContent = "NOT YET";
    }

    // Type the hint back in
    const h = hintRef.current;
    if (!h) return;
    h.textContent = "";
    h.style.display = "";
    await typeText(h, "CLICK TO BEGIN", 80, ch => {
      if (ch !== " " && Math.random() < 0.5) tick(640 + Math.random() * 120, 0.025, 0.018);
    });
  }

  function onLanded(layout: ReturnType<typeof computeLayout>) {
    const _p = pigeonRef.current, _s = shadowRef.current;
    if (!_p) return;
    _p.classList.remove("flying"); _p.classList.add("perched");
    gsap.fromTo(_p, { y: layout.pigeonLandY }, {
      y: layout.pigeonLandY - 8, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.out",
      onComplete: () => {
        if (_s) {
          gsap.to(_s, { opacity: 1, duration: 0.4 });
          gsap.set(_s, { left: layout.pigeonLandX + 96 + "px", top: layout.pigeonLandY + 158 + "px" });
        }
        gsap.to(_p, { y: "+=4", duration: 1.1, yoyo: true, repeat: -1, ease: "sine.inOut" });
        coo();
        setTimeout(() => showSpeech(layout), 280);
      },
    });
  }

  function showSpeech(layout: ReturnType<typeof computeLayout>) {
    const sp = speechRef.current;
    if (!sp) return;
    gsap.set(sp, { left: layout.pigeonLandX + 170 + "px", top: layout.pigeonLandY - 70 + "px" });
    gsap.to(sp, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2.2)" });
    setTimeout(() => runDialogue(), 350);
  }

  async function runDialogue() {
    const st = speechTextRef.current, sc = speechCaretRef.current, ac = actionsRef.current;
    if (!st || !sc || !ac) return;
    const lines = stateRef.current.dialogue.split("\n").map(s => s.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      sc.style.display = "inline-block";
      await typeText(st, lines[i], 32, ch => { if (ch !== " " && Math.random() < 0.7) tick(820 + Math.random() * 120, 0.03, 0.025); });
      if (i < lines.length - 1) await wait(950);
    }
    sc.style.display = "none";
    gsap.to(ac, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
  }

  async function unfurlScroll() {
    ensureAudio();
    const ss = scrollStageRef.current, v = veilRef.current, se = scrollElRef.current, p = paperRef.current, pi = paperInnerRef.current;
    if (!ss || !v || !se || !p || !pi) return;
    ss.style.opacity = "1";
    gsap.to(v, { opacity: 1, duration: 0.5 });
    gsap.set(se, { y: -40, scale: 0.45, opacity: 0 });
    gsap.to(se, { y: 0, scale: 1, opacity: 1, duration: 0.55, ease: "back.out(1.7)" });
    await wait(620);
    const targetH = Math.min(560, window.innerHeight - 240);
    const ut = setInterval(() => tick(220 + Math.random() * 120, 0.04, 0.03), 80);
    await new Promise<void>(resolve => {
      gsap.to(p, { height: targetH, duration: 1.2, ease: "power2.out", onComplete: () => { clearInterval(ut); resolve(); } });
    });
    p.classList.add("scrollable");
    gsap.to(pi, { opacity: 1, duration: 0.25 });
    await wait(300);
    await typeLetter();
    tick(120, 0.16, 0.08);
    gsap.to(sealRef.current, { opacity: 1, scale: 1, duration: 0.32, ease: "back.out(2.4)" });
    await wait(380);
    p.scrollTo({ top: 0, behavior: "smooth" });
    await wait(420);
    gsap.to(closeBtnRef.current, { opacity: 1, duration: 0.3 });
  }

  async function typeLetter() {
    const ty = typerRef.current, pc = paperCaretRef.current, p = paperRef.current;
    if (!ty || !pc || !p) return;
    ty.textContent = ""; pc.style.display = "inline-block";
    const text = stateRef.current.letter;
    for (let i = 0; i < text.length; i++) {
      ty.textContent += text[i];
      if (text[i] !== " " && text[i] !== "\n" && Math.random() < 0.65) tick(880 + Math.random() * 140, 0.025, 0.018);
      p.scrollTop = p.scrollHeight;
      let pause = 22;
      if (".!?".includes(text[i])) pause = 280;
      else if (text[i] === ",") pause = 160;
      else if (text[i] === "\n") pause = 200;
      await wait(pause);
    }
    pc.style.display = "none";
  }

  function handleYes() {
    ensureAudio(); tick(1100, 0.08, 0.06);
    const _p = pigeonRef.current;
    gsap.to(speechRef.current, { opacity: 0, scale: 0.4, duration: 0.3, ease: "back.in(2)" });
    if (_p) {
      _p.classList.add("flying");
      gsap.to(_p, { y: "-=10", duration: 0.18, yoyo: true, repeat: 1, ease: "sine.inOut" });
      setTimeout(() => _p.classList.remove("flying"), 380);
    }
    setTimeout(unfurlScroll, 520);
  }

  async function handleNo() {
    // In reader mode after close, "NO" means "send pigeon off" - trigger fly-out
    if (isReader && phaseRef.current === "after-close") {
      handleSendOff();
      return;
    }
    ensureAudio(); tick(420, 0.08, 0.05);
    const ac = actionsRef.current, st = speechTextRef.current, sc = speechCaretRef.current;
    if (!ac || !st || !sc) return;
    gsap.to(ac, { opacity: 0, y: 6, duration: 0.2 });
    await wait(220);
    st.textContent = ""; sc.style.display = "inline-block";
    await typeText(st, "Okay... I'll wait right here.", 34, ch => { if (ch !== " " && Math.random() < 0.7) tick(700, 0.03, 0.02); });
    await wait(600);
    if (btnYesRef.current) btnYesRef.current.textContent = "I'M READY";
    if (btnNoRef.current) btnNoRef.current.style.display = "none";
    gsap.to(ac, { opacity: 1, y: 0, duration: 0.3 });
    sc.style.display = "none";
  }

  function handleClose() {
    ensureAudio(); tick(540, 0.06, 0.04);
    gsap.to(scrollElRef.current, { y: -40, scale: 0.45, opacity: 0, duration: 0.4, ease: "back.in(1.4)" });
    gsap.to(veilRef.current, { opacity: 0, duration: 0.5, onComplete: () => {
      if (scrollStageRef.current) scrollStageRef.current.style.opacity = "0";
      const p = paperRef.current;
      if (p) { p.classList.remove("scrollable"); gsap.set(p, { height: 0 }); }
      if (paperInnerRef.current) gsap.set(paperInnerRef.current, { opacity: 0 });
      if (sealRef.current) gsap.set(sealRef.current, { opacity: 0, scale: 0 });
      if (closeBtnRef.current) gsap.set(closeBtnRef.current, { opacity: 0 });
      if (typerRef.current) typerRef.current.textContent = "";
    }});

    phaseRef.current = "after-close";

    setTimeout(() => {
      if (btnYesRef.current) {
        btnYesRef.current.textContent = isReader ? "WRITE A REPLY" : "READ AGAIN";
      }
      if (btnNoRef.current) {
        btnNoRef.current.style.display = "";
        btnNoRef.current.textContent = isReader ? "SEND PIGEON OFF" : "ALL DONE";
      }
      if (actionsRef.current) gsap.set(actionsRef.current, { opacity: 0, y: 6 });
      if (speechTextRef.current) speechTextRef.current.textContent = "";
      gsap.to(speechRef.current, { opacity: 1, scale: 1, duration: 0.3 });
      if (speechCaretRef.current) speechCaretRef.current.style.display = "inline-block";
      const prompt = isReader
        ? "Would you like to write back?"
        : "Read it again? Or send me off?";
      if (speechTextRef.current) {
        typeText(speechTextRef.current, prompt, 32, ch => {
          if (ch !== " " && Math.random() < 0.7) tick(800, 0.03, 0.02);
        }).then(() => {
          if (speechCaretRef.current) speechCaretRef.current.style.display = "none";
          if (actionsRef.current) gsap.to(actionsRef.current, { opacity: 1, y: 0, duration: 0.3 });
        });
      }
    }, 480);
  }

  // Reader clicks YES button in after-close phase
  function handleYesAfterClose() {
    if (isReader && phaseRef.current === "after-close") {
      // "WRITE A REPLY" - open reply form
      openReplyForm();
    } else {
      // demo mode: re-read the letter
      handleYes();
    }
  }

  function openReplyForm() {
    ensureAudio();
    tick(900, 0.08, 0.05);
    // hide speech bubble
    gsap.to(speechRef.current, { opacity: 0, scale: 0.4, duration: 0.3, ease: "back.in(2)" });
    setReplyState("form");
  }

  function closeReplyForm() {
    tick(420, 0.06, 0.04);
    setReplyState("idle");
    // bring speech bubble back so reader can pick again
    gsap.to(speechRef.current, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" });
  }

  async function submitReply(formData: { body: string; reader_name: string }) {
    if (!slug) return;
    setReplyState("sending");
    setReplyError("");
    try {
      const res = await fetch("/api/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          body: formData.body,
          reader_name: formData.reader_name || "Anonymous",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReplyState("error");
        setReplyError(data.error || "Could not deliver reply.");
        return;
      }
      setReplyState("sent");
      // pigeon says farewell, then flies off
      await wait(400);
      const sp = speechRef.current;
      if (sp) gsap.to(sp, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)" });
      if (speechTextRef.current) {
        speechTextRef.current.textContent = "";
        await typeText(
          speechTextRef.current,
          "I'll carry your words back. Goodbye!",
          32,
          ch => { if (ch !== " " && Math.random() < 0.7) tick(800, 0.03, 0.02); }
        );
      }
      await wait(900);
      gsap.to(sp, { opacity: 0, scale: 0.4, duration: 0.3, ease: "back.in(2)" });
      coo();
      await wait(200);
      flyOut(resetScene);
    } catch {
      setReplyState("error");
      setReplyError("Network error.");
    }
  }

  // Reader clicks "SEND PIGEON OFF" (no reply)
  function handleSendOff() {
    ensureAudio();
    tick(600, 0.08, 0.04);
    const sp = speechRef.current;
    gsap.to(actionsRef.current, { opacity: 0, y: 6, duration: 0.2 });
    if (speechTextRef.current) {
      (async () => {
        speechTextRef.current!.textContent = "";
        if (speechCaretRef.current) speechCaretRef.current.style.display = "inline-block";
        await typeText(speechTextRef.current!, "Off I go, then. Take care!", 32, ch => {
          if (ch !== " " && Math.random() < 0.7) tick(800, 0.03, 0.02);
        });
        if (speechCaretRef.current) speechCaretRef.current.style.display = "none";
        await wait(700);
        gsap.to(sp, { opacity: 0, scale: 0.4, duration: 0.3, ease: "back.in(2)" });
        coo();
        await wait(200);
        flyOut(resetScene);
      })();
    }
  }

  function handleThemeClick(t: string) {
    setTheme(t);
    document.querySelectorAll("[data-theme-pill]").forEach(p => {
      p.classList.toggle("active", (p as HTMLElement).dataset.themePill === t);
    });
  }

  return (
    <div className={`stage theme-${stateRef.current.theme}`} ref={stageRef}>
      <div ref={cloudsRef} />
      <div className="sun" />
      <div className="horizon-haze" />
      <div className="ground" />
      <div className="hills">
        <svg viewBox="0 0 800 200" preserveAspectRatio="none" shapeRendering="crispEdges">
          <path d="M0,140 L60,100 L100,120 L160,80 L220,110 L280,90 L340,120 L400,80 L460,110 L520,90 L580,120 L640,90 L700,110 L760,100 L800,120 L800,200 L0,200 Z" fill="#3d4f6e"/>
          <path d="M0,180 L80,150 L140,170 L200,140 L260,165 L320,145 L380,170 L440,150 L500,170 L560,150 L620,170 L700,150 L760,165 L800,150 L800,200 L0,200 Z" fill="#2a3650"/>
        </svg>
      </div>
      <div className="branch-wrap">
        <svg viewBox="0 0 1600 200" preserveAspectRatio="xMidYMid meet" shapeRendering="crispEdges">
          <rect x="0" y="86" width="1600" height="14" fill="#2d1808"/>
          <rect x="0" y="72" width="1600" height="14" fill="#4a2d18"/>
          <rect x="0" y="66" width="1600" height="6" fill="#6b4226"/>
          <rect x="220" y="62" width="22" height="10" fill="#6b4226"/><rect x="220" y="72" width="22" height="6" fill="#2d1808"/>
          <rect x="820" y="62" width="18" height="10" fill="#6b4226"/><rect x="820" y="72" width="18" height="6" fill="#2d1808"/>
          <rect x="1280" y="62" width="22" height="10" fill="#6b4226"/><rect x="1280" y="72" width="22" height="6" fill="#2d1808"/>
          <g fill="#4a2d18">
            <rect x="120" y="44" width="6" height="28"/><rect x="114" y="40" width="18" height="4"/>
            <rect x="380" y="34" width="6" height="38"/><rect x="374" y="28" width="18" height="6"/>
            <rect x="640" y="42" width="6" height="30"/>
            <rect x="930" y="36" width="6" height="36"/><rect x="924" y="32" width="18" height="4"/>
            <rect x="1180" y="40" width="6" height="32"/>
            <rect x="1440" y="36" width="6" height="36"/><rect x="1434" y="30" width="18" height="6"/>
          </g>
          <g>
            <g transform="translate(80,16)">
              <rect x="0" y="6" width="14" height="14" fill="#3e6238"/><rect x="10" y="0" width="16" height="18" fill="#6a9f5b"/>
              <rect x="22" y="4" width="14" height="14" fill="#3e6238"/><rect x="14" y="14" width="16" height="14" fill="#243f25"/>
              <rect x="-2" y="14" width="14" height="14" fill="#243f25"/>
            </g>
            <g transform="translate(360,6)">
              <rect x="0" y="6" width="18" height="16" fill="#6a9f5b"/><rect x="14" y="0" width="20" height="22" fill="#3e6238"/>
              <rect x="30" y="6" width="16" height="16" fill="#6a9f5b"/><rect x="20" y="20" width="20" height="14" fill="#243f25"/>
              <rect x="0" y="22" width="20" height="14" fill="#243f25"/>
            </g>
            <g transform="translate(920,4)">
              <rect x="0" y="4" width="16" height="16" fill="#3e6238"/><rect x="12" y="0" width="18" height="20" fill="#6a9f5b"/>
              <rect x="26" y="6" width="14" height="14" fill="#3e6238"/><rect x="12" y="18" width="20" height="12" fill="#243f25"/>
            </g>
            <g transform="translate(1410,8)">
              <rect x="0" y="6" width="18" height="16" fill="#3e6238"/><rect x="14" y="0" width="20" height="22" fill="#6a9f5b"/>
              <rect x="30" y="6" width="16" height="16" fill="#3e6238"/><rect x="10" y="20" width="22" height="14" fill="#243f25"/>
            </g>
          </g>
        </svg>
      </div>
      <div className="pigeon-shadow" ref={shadowRef} />
      <div className="pigeon flying" ref={pigeonRef}>
        <div className="layer pigeon-body" ref={layerBodyRef} />
        <div className="layer wing-perch" ref={layerPerchRef} />
        <div className="layer wing-up" ref={layerUpRef} />
        <div className="layer wing-down" ref={layerDownRef} />
      </div>
      <div className="speech" ref={speechRef}>
        <div className="bubble">
          <span ref={speechTextRef} /><span className="caret" ref={speechCaretRef} />
          <div className="actions" ref={actionsRef}>
            <button
              className="btn primary"
              ref={btnYesRef}
              onClick={() => {
                if (phaseRef.current === "after-close") handleYesAfterClose();
                else handleYes();
              }}
            >
              YES, PLEASE
            </button>
            <button className="btn" ref={btnNoRef} onClick={handleNo}>NOT YET</button>
          </div>
        </div>
        <div className="tail">
          <svg viewBox="0 0 10 9" preserveAspectRatio="none" shapeRendering="crispEdges">
            <rect x="0" y="0" width="10" height="1" fill="#ffffff"/><rect x="1" y="1" width="8" height="1" fill="#ffffff"/>
            <rect x="2" y="2" width="6" height="1" fill="#ffffff"/><rect x="3" y="3" width="4" height="1" fill="#ffffff"/>
            <rect x="4" y="4" width="2" height="1" fill="#ffffff"/>
            <rect x="0" y="1" width="1" height="1" fill="#1a1413"/><rect x="1" y="2" width="1" height="1" fill="#1a1413"/>
            <rect x="2" y="3" width="1" height="1" fill="#1a1413"/><rect x="3" y="4" width="1" height="1" fill="#1a1413"/>
            <rect x="4" y="5" width="2" height="1" fill="#1a1413"/><rect x="6" y="4" width="1" height="1" fill="#1a1413"/>
            <rect x="7" y="3" width="1" height="1" fill="#1a1413"/><rect x="8" y="2" width="1" height="1" fill="#1a1413"/>
            <rect x="9" y="1" width="1" height="1" fill="#1a1413"/>
          </svg>
        </div>
      </div>
      <div className="scroll-stage" ref={scrollStageRef}>
        <div className="veil" ref={veilRef} />
        <div className="scroll" ref={scrollElRef}>
          <button className="close-btn" ref={closeBtnRef} onClick={handleClose}>X</button>
          <div className="rod top"><div className="core" /><div className="cap l" /><div className="cap r" /></div>
          <div className="paper" ref={paperRef}>
            <div className="paper-inner" ref={paperInnerRef}>
              <span className="typer" ref={typerRef} /><span className="caret" ref={paperCaretRef} />
              <div className="seal" ref={sealRef}>{stateRef.current.senderName.slice(0, 6)}</div>
            </div>
          </div>
          <div className="rod bottom"><div className="core" /><div className="cap l" /><div className="cap r" /></div>
        </div>
      </div>
      <div className="hint" ref={hintRef}>CLICK TO BEGIN</div>

      {/* Reply overlay - reader mode only */}
      {isReader && (replyState === "form" || replyState === "sending" || replyState === "error") && (
        <ReplyOverlay
          onClose={closeReplyForm}
          onSubmit={submitReply}
          sending={replyState === "sending"}
          error={replyState === "error" ? replyError : ""}
        />
      )}

      {/* Tweaks panel - demo mode only */}
      {!isReader && (
        <div className="tweaks" ref={tweaksRef}>
          <button className="close-x" onClick={() => tweaksRef.current?.classList.remove("visible")}>&times;</button>
          <h3>TWEAKS</h3>
          <div className="row">
            <label>Sky</label>
            <div className="pill-row">
              {["day", "dusk", "dawn", "night"].map(t => (
                <button key={t} className={`pill${t === stateRef.current.theme ? " active" : ""}`} data-theme-pill={t} onClick={() => handleThemeClick(t)}>{t.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div className="row">
            <label>Pigeon greeting (one line per message)</label>
            <textarea ref={tweakDialogRef} onChange={e => { stateRef.current.dialogue = e.target.value; }} />
          </div>
          <div className="row">
            <label>Letter contents</label>
            <textarea ref={tweakLetterRef} style={{ minHeight: 140 }} onChange={e => { stateRef.current.letter = e.target.value; }} />
          </div>
          <button className="tweaks-replay" onClick={() => window.location.reload()}>&#9654; REPLAY</button>
        </div>
      )}
    </div>
  );
}

function ReplyOverlay({
  onClose,
  onSubmit,
  sending,
  error,
}: {
  onClose: () => void;
  onSubmit: (data: { body: string; reader_name: string }) => void;
  sending: boolean;
  error: string;
}) {
  const [body, setBody] = useState("");
  const [name, setName] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || sending) return;
    onSubmit({ body: body.trim(), reader_name: name.trim() });
  }

  return (
    <div className="reply-stage">
      <div className="reply-veil" onClick={sending ? undefined : onClose} />
      <form className="reply-form" onSubmit={submit}>
        <div className="rod top"><div className="core" /><div className="cap l" /><div className="cap r" /></div>
        <div className="reply-paper">
          <div className="reply-inner">
            <label className="reply-label">WRITE A REPLY</label>
            <textarea
              className="reply-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Dear sender..."
              autoFocus
              rows={8}
              disabled={sending}
              maxLength={5000}
            />
            <label className="reply-label">YOUR NAME (optional)</label>
            <input
              className="reply-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Anonymous"
              disabled={sending}
              maxLength={60}
            />
            {error && <div className="reply-error">{error}</div>}
            <div className="reply-actions">
              <button type="button" className="btn" onClick={onClose} disabled={sending}>
                CANCEL
              </button>
              <button type="submit" className="btn primary" disabled={sending || !body.trim()}>
                {sending ? "SENDING..." : "SEND REPLY"}
              </button>
            </div>
          </div>
        </div>
        <div className="rod bottom"><div className="core" /><div className="cap l" /><div className="cap r" /></div>
      </form>
    </div>
  );
}
