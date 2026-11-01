# Expensyyy

A calm, pastel household expense tracker built with **Next.js 15**, **React 19**, **TypeScript**, **Tailwind CSS**, and **Firebase**. Track groceries and price history, shopping lists, utility bills, online orders and installments, HOA dues, rent contributions, reports, and transaction history in one place.

## Features

- **Dashboard** — monthly totals, category breakdown, upcoming bills, recent activity, and paid/unpaid progress.
- **Groceries** — track items, categories, quantities, favorite stores, price history, and price increases.
- **Shopping lists** — build lists, check items off, and total planned versus purchased amounts.
- **Bills** — Meralco and water with billing dates, internet, HOA monthly dues (₱200 expected), Shopee, and TikTok Shop with full-payment or installment tracking, calculators, receipts, and payment status.
- **Rent tracker** — per-member expected contributions, partial payments, and collection progress.
- **Calendar** — due dates and payment events in a monthly view.
- **Reports** — month-over-month comparisons and nine chart views.
- **History** — search, filter, sort, paginate, edit, delete, and export every transaction.
- **Settings** — profile, photo, currency, date format, theme, household contributions, utility defaults, backups, and demo reset.
- **Responsive + dark mode** with keyboard-friendly dialogs and reduced-motion support.

## Quick start (Demo Mode)

No Firebase account is required to try the app.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, choose **Try the demo**, and sign in with the pre-filled demo account (or register a new local account). Demo data is stored in `localStorage` and stays on that browser. Clearing site data removes it permanently.

## Connect Firebase

1. Create a project in the [Firebase console](https://console.firebase.google.com/).
2. Add a **Web app** and copy the config values.
3. Enable **Authentication → Email/Password** and **Google** (optional).
4. Create a **Firestore Database**.
5. Enable **Storage**.
6. Copy `.env.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

7. Deploy the security rules:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules,storage
```

8. Restart `npm run dev`. The login screen switches from Demo Mode to real Firebase authentication.

> Never commit `.env.local` or service-account credentials. Firebase web API keys are public identifiers, but access is controlled by the rules in `firestore.rules` and `storage.rules`.

## Data model

All user data lives under the signed-in user's document:

```
users/{uid}
  displayName, email, photoURL, currency, dateFormat, theme,
  householdName, members[], water defaults, electricity rate, defaultMonthView

users/{uid}/groceries/{groceryId}
users/{uid}/groceryPriceHistory/{historyId}
users/{uid}/shoppingLists/{listId}
users/{uid}/bills/{billId}
users/{uid}/rentPayments/{paymentId}
```

Receipts are stored at `receipts/{uid}/...` and avatars at `avatars/{uid}/...` in Firebase Storage. Rules ensure users can only read and write their own documents and files.

## Deploy to Netlify

1. Push the repository to GitHub/GitLab.
2. In Netlify, **Add new site → Import an existing project**.
3. Build command: `npm run build`; publish directory: `.next`.
4. Add the six `NEXT_PUBLIC_FIREBASE_*` environment variables.
5. Deploy. `netlify.toml` already configures the Next.js runtime and security headers.

Add your Netlify domain to **Firebase Authentication → Settings → Authorized domains**.

## Scripts

| Command             | Purpose                              |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start the development server         |
| `npm run build`     | Production build                     |
| `npm run start`     | Serve the production build           |
| `npm run lint`      | Lint with Next.js/ESLint             |
| `npm run typecheck` | Run the TypeScript compiler          |

## Notes

- Currency defaults to Philippine pesos (PHP) and can be changed per profile.
- Dates and payment times are displayed in **Asia/Manila**.
- Water bills default to a ₱345 minimum charge for the first 10 m³. No excess rate is assumed; set your provider's tariff in Settings.
- Amounts are stored as decimal peso values rounded to two places.
- The localStorage demo password is not secure and exists only for demonstration. Real authentication is handled by Firebase when configured.
- This project does not send analytics or third-party tracking. Your expense data stays in your browser (demo) or your own Firebase project.
