# Carrier Pigeon

<p align="center">
  <img src="./assets/pigeon-arrival.gif" alt="A pixel-art pigeon flies in from the upper left, curves down to a tree branch at dusk, and starts speaking through a typewriter speech bubble" width="640" />
</p>

A pixel-art letter delivery app. The admin composes a letter, gets a shareable URL, and a charming pigeon flies in to deliver it to the recipient — who can read it, write back, and watch the pigeon fly off into the sunset.

Built with Next.js, GSAP animations, Web Audio API for retro sound effects, and Supabase for storage.

## Features

- **Pixel-art pigeon animation** — sprite-based pigeon flies in, perches on a branch, and unfurls a parchment scroll
- **Typewriter text** with synthesized square-wave tick sounds
- **Four sky themes** — day, dusk, dawn, night (each with its own gradient + clouds + stars)
- **Password-gated admin** — compose new letters, view all sent letters and their replies
- **Custom URL slugs** — auto-generated like `gentle-wind-42`, but you can pick your own
- **2-way conversation** — readers can send replies that land in the admin inbox
- **Pigeon flies off** when the reader is done, then loops back to a fresh "click to begin" state

## Stack

- [Next.js 16](https://nextjs.org/) (App Router)
- [GSAP](https://gsap.com/) for animation
- [Supabase](https://supabase.com/) for storage
- Web Audio API for sounds — no audio files, all synthesized
- Press Start 2P + VT323 fonts via `next/font/google`
- Pure CSS, no Tailwind

## Local Setup

```bash
git clone https://github.com/YOUR-USER/carrier-pigeon.git
cd carrier-pigeon
npm install
cp .env.example .env.local
# edit .env.local with your Supabase + auth credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/admin` for the password gate.

### Supabase tables

```sql
create table letters (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  dialogue text not null,
  body text not null,
  theme text not null default 'dusk',
  sender_name text default 'The Carrier',
  created_at timestamptz default now()
);

create table replies (
  id uuid primary key default gen_random_uuid(),
  letter_id uuid not null references letters(id) on delete cascade,
  body text not null,
  reader_name text default 'Anonymous',
  created_at timestamptz default now()
);

create index idx_letters_slug on letters(slug);
create index idx_replies_letter_id on replies(letter_id);
```

### Environment variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your project's anon key |
| `ADMIN_PASSWORD` | The shared secret you'll type to access `/admin` |
| `SESSION_SECRET` | Random token used as the cookie value. Generate with `openssl rand -hex 32` |

## Routes

| Path | What it does |
|---|---|
| `/` | Redirects to `/admin` |
| `/admin` | Password gate; once authed, shows sent letters with reply counts |
| `/admin/compose` | Write a new letter, pick a theme + slug, send |
| `/admin/letters/[slug]` | View a letter and all its replies |
| `/letter/[slug]` | Public reader view — the pigeon flies in and delivers the letter |

## How it works

The pigeon is built from a 24×21 character grid (`PIGEON_BODY`, `WING_PERCH`, `WING_UP`, `WING_DOWN`) where each character maps to a color in a small palette. At runtime, `renderSprite()` walks the grid and creates `<rect>` SVG elements via `document.createElementNS` — the same approach as the original standalone HTML version.

Clouds are built the same way but with `<div>`s, which are then drifted with GSAP infinite tweens.

The fly-in animation is a 6-keyframe GSAP timeline that curves from the upper-left to the perched position on the branch. The fly-out reverses the trajectory toward the upper-right. After the pigeon disappears, a 3-second pause leads into a typewriter-animated "CLICK TO BEGIN" hint, and the scene resets for a new visitor.

Sounds are synthesized in real time:
- **Ticks** for typewriter clicks: square wave, ~760 Hz with random detune, 40 ms decay
- **Coos** when the pigeon lands: sine wave, pitch sweep from 380 → 310 → 360 Hz over 320 ms

## Deploying to Vercel

```bash
npx vercel
```

Set the same environment variables in the Vercel dashboard, and you're live.

## Credits

The original Carrier Pigeon design was generated via Claude Design as a single-file HTML prototype. This Next.js port preserves the original pixel art, animation timing, and sound design — and adds the database-backed letter system on top.
