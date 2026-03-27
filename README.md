# devOS

> A portfolio disguised as an operating system. Because a PDF résumé felt like a downgrade.

[Live →](https://devanshuchicholikar.com) · Built by Devanshu Chicholikar · devOS v2.1

---

## What is this?

Most portfolios are a hero section, a skill bar at 87%, and a contact form that quietly `console.log`s your message into the void.

This is a desktop OS simulator. You boot it up, open windows, play games, browse my repos, and (hopefully) conclude that hiring me is a good idea.

## The Apps

| App | What it does |
|-----|-------------|
| **About Me** | The person behind the pixels |
| **Projects** | Things I shipped |
| **Skill Tree** | XP earned over the years |
| **Analytics** | What you did here. Transparent, I promise. |
| **Ping Me** | Let's talk |
| **Terminal** | For the CLI-curious. Try `hire devanshu`. |
| **Arcade** | Procrastination station |
| **Preferences** | Make it yours |
| **Finder** | Browse my repos |
| **Resume** | The formal version of me |
| **Changelog** | What changed and when |

## Tech Stack

**Frontend:** Next.js 15 · TypeScript · Tailwind CSS · Framer Motion · Zustand
**Backend:** Node.js · Express · Prisma · SQLite
**Deployed on:** Vercel (obviously)

No duct tape. Minimal regrets.

## Running locally

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend (optional — analytics only)
cd backend && npm install && npm run dev
```

Opens at `http://localhost:3000`. Boots faster than my actual machine.

## Structure

```
web-v2/
├── frontend/     # Next.js — the OS you see
├── backend/      # Express — the API you don't
├── shared/       # TypeScript types both sides agree on
└── README.md     # The one you're reading
```

## Why?

Because I had a free weekend, strong opinions about portfolio design, and a deep conviction that a PDF is no way to show off software skills.

devOS is searchable, playable, and themeable. If that doesn't get me a callback, nothing will.

---

MIT. Use it, fork it, don't plagiarize the copy — I worked hard on those one-liners.
