# AGENTS.md

## Stack
- Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS, Firebase 11.
- Path alias `@/*` -> `./src/*` (tsconfig). Use it for internal imports.
- No test suite configured; verification is `npm run lint` then `npm run typecheck`.

## Commands
- `npm run dev` — dev server (http://localhost:3000)
- `npm run build` / `npm run start` — production build / serve
- `npm run lint` — Next.js/ESLint (`next/core-web-vitals`, `next/typescript`)
- `npm run typecheck` — `tsc --noEmit`
- Run lint before typecheck; both must pass before committing.

## Architecture
- Routes under `src/app/(app)` (authed) and `src/app/(auth)` (login/register).
- State via contexts in `src/contexts`: `AuthContext`, `DataContext`, `ToastContext`.
- Data access in `src/services/*Service.ts`; pure logic in `src/lib` (calculations, dates, store, csv, validation).
- Firebase config in `src/lib/firebase.ts`; client SDK only (no server SDK).

## Firebase / demo mode
- If `NEXT_PUBLIC_FIREBASE_*` env vars are absent, app runs in Demo Mode (localStorage). See `.env.example`.
- Env vars go in `.env.local` (gitignored); never commit `.env.local` or service accounts.
- Deploy rules: `firebase deploy --only firestore:rules,storage`. Storage paths: `receipts/{uid}/...`, `avatars/{uid}/...`.

## Conventions / gotchas
- Currency PHP by default; amounts stored as decimal pesos rounded to 2 places.
- Dates/times displayed in Asia/Manila.
- Water bill minimum charge ₱345 for first 10 m³; no excess rate assumed.
- Next.js image remotePatterns allow `firebasestorage.googleapis.com` and `lh3.googleusercontent.com`.
- `reactStrictMode: true`. No analytics/tracking.
- Netlify: build `npm run build`, publish `.next`, Node 20.18.0.
