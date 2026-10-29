# Flush

### Studying is hard enough. Staying motivated shouldn't be.

[![Built with React](https://img.shields.io/badge/Built%20with-React-61DAFB.svg?style=flat-square&logo=react&logoColor=white)](https://reactjs.org/)
[![Uses TypeScript](https://img.shields.io/badge/Uses-TypeScript-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Powered by Vite](https://img.shields.io/badge/Powered%20by-Vite-646CFF.svg?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Styled with Tailwind](https://img.shields.io/badge/Styled%20with-Tailwind-38B2AC.svg?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Backend: Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E.svg?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

## Vision & Mission

Flush is a flashcard app that treats revision as something to look forward to: decks, streaks, gems, clubs and arcade games, all built around the cards you are actually trying to learn.

**Vision**: A world where consistent study is a habit people enjoy keeping, not a chore they abandon after a week.

**Mission**: To make active recall and spaced repetition genuinely fun, by wrapping the science of studying in a game that rewards showing up every day.

## About Flush

Flush turns a deck of flashcards into a small world you want to come back to:

- **Build** decks by hand or import them from CSV/JSON
- **Study** with a 20-20-20 style session flow, mastery levels and a session summary
- **Test** yourself with timed, direction-aware quizzes and score history
- **Play** your decks as arcade games, or build your own in the Studio
- **Share** decks through the Athenaeum, and take decks other people published
- **Compete** for trophies and leagues in the Arena
- **Progress** with daily quests, streaks, gems, badges, clubs and a store full of themes

Everything is stored in Supabase, so progress follows you between devices, while interface preferences stay local to the browser.

### How Flush is built

- **Client** — React 18 with TypeScript, bundled by Vite and routed with React Router
- **UI** — Tailwind CSS with shadcn/ui primitives on top of Radix, Lucide icons, and a theme layer (`src/contexts/themeVars.ts`) that injects CSS variables at runtime so every page can carry its own palette
- **Backend** — Supabase for authentication, Postgres tables, row-level security and edge functions (`supabase/migrations`)
- **State** — React context for auth, session, theme and gem animations; server calls live in `src/services/flush`
- **Games** — three native arcade games plus an in-browser Studio that compiles user TypeScript and runs it inside a sandboxed iframe

## Features

### The Base
- Daily quests wired to a live progress bar, streak and gem counters
- Quick resume and recommendations based on the decks you studied last
- Guest mode with starter decks, so you can try Flush before signing up

### Armoury
- Deck grid and list views with search, subject and difficulty filters
- A full deck editor: cards, notes, mastery, drag-to-reorder, import and export
- Share decks with another user by username, or contribute them to the Athenaeum

### Study & Test
- Front→Back or Back→Front sessions, card flipping and mastery tracking
- Session summaries with cards reviewed, mastered and still to review
- Timed tests (quarter, half, three quarters or the whole deck) with score history and retakes

### The Athenaeum
- Browse, filter and search community decks, with ratings and download counts
- Contribute a deck, then manage it: edit cards, invite moderators, publish new versions
- Preview, sync and rate decks you have copied; report decks or send suggestions

### Arena
- Practice or PvP flashcard battles
- Trophies, leagues and a leaderboard

### Trade
- Themes for the app, plus separate study and deck-editing themes
- Streak freeze and streak wager boosters, skills and charms

### Arcade
- **Whack-a-Card**, **Build a Skyscraper** and **Matching Magic**, played with any of your decks
- High scores, deck bests and arcade history

### Studio
- A desktop-only in-browser TypeScript editor with a live sandboxed preview
- Starter templates, saveable projects and a publishing flow for community arcades

### Profile
- Public profile with badges, statistics and personal bests
- Avatar, gradient and badge customisation, email linking, password and account management

## Getting started

```bash
npm install
cp .env.example .env      # then add your Supabase project URL and anon key
npm run dev
```

Environment variables:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Scripts:

```bash
npm run dev       # start the Vite dev server
npm run build     # type-check and build to dist/
npm run preview   # preview the production build
npm run lint      # Biome lint
```

## License

Flush is licensed under the MIT License - please see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- **React** and **Vite** for the foundation
- **Tailwind CSS**, **shadcn/ui** and **Radix UI** for the interface
- **Supabase** for authentication, database and edge functions
- **Lucide** for the icon set
- **dnd-kit** for drag-to-reorder cards, and **html2canvas** for shareable profile images

Flush wouldn't be here without them!

## Future Roadmap

- [ ] Publish community arcades from the Studio straight into the Athenaeum
- [ ] More arcade games and deck formats
- [ ] Accessibility options for study mode (font size, contrast, motion)
- [ ] Offline-first study with background sync
- [ ] Deeper Arena leagues, seasons and rewards
- [ ] Richer statistics, including mastery trends over time

And many more through experiments, exposure, feedback, and tiny "aha!" moments

## 🎉 Show Your Support

If you find Flush interesting, feel free to:
- ⭐ Star the repository
- 🍴 Fork it to explore
- 👀 Watch for updates
- 📢 Share it with others who have a deck they keep putting off

---

> **Built with ❤️ for calmer revision, one deck at a time.**
