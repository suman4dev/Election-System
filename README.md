# M.S. Kawar International School — Council Election System

A real-time, browser-based election system built with **React + Vite** and **Firebase** (Firestore + Auth). No dedicated backend server — all data lives in Firestore with real-time listeners.

---

## Table of Contents

1. [Features](#features)
2. [Project Structure](#project-structure)
3. [Prerequisites](#prerequisites)
4. [Firebase Setup](#firebase-setup)
5. [Run Locally](#run-locally)
6. [Deploy to Vercel](#deploy-to-vercel)
7. [Firestore Security Rules](#firestore-security-rules)
8. [Routes Reference](#routes-reference)
9. [Election Flow](#election-flow)

---

## Features

- **Voting Kiosk** (`/vote/:boothId`) — full-screen voter interface with 5-second auto-cooldown after each vote
- **Admin Panel** (`/admin`) — login-protected; manage posts, candidates, booths, and election state
- **Live Results** (`/results`) — public real-time animated results board
- Unlimited election posts — add any council position
- Up to 4 candidates per post (photo + name)
- 3+ voting booths (add more from the admin panel)
- Re-run any post or reset the entire election with vote counts cleared

---

## Project Structure

```
Election-System/
├── artifacts/
│   └── election-app/          ← The React app (this is what you deploy)
│       ├── src/
│       │   ├── pages/
│       │   │   ├── vote.tsx   ← Kiosk screen
│       │   │   ├── admin.tsx  ← Admin panel
│       │   │   └── results.tsx← Live results
│       │   ├── lib/
│       │   │   ├── firebase.ts ← Firebase init
│       │   │   └── types.ts   ← TypeScript interfaces
│       │   └── App.tsx        ← Router
│       ├── firestore.rules    ← Security rules (paste into Firebase Console)
│       ├── package.json
│       └── vite.config.ts
├── package.json               ← pnpm workspace root
└── pnpm-workspace.yaml
```

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18 or later | https://nodejs.org |
| pnpm | 9 or later | `npm install -g pnpm` |
| Git | any | https://git-scm.com |

---

## Firebase Setup

You need a Firebase project with **Firestore** and **Authentication** enabled.

### 1 — Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it (e.g. `election-app`) → Create
3. Open the project

### 2 — Enable Firestore

1. Left sidebar → **Build → Firestore Database**
2. Click **Create database** → choose **production mode** → pick a region → Enable

### 3 — Enable Authentication providers

1. Left sidebar → **Build → Authentication** → **Sign-in method**
2. Enable **Email/Password** (for the admin login)
3. Enable **Anonymous** (for kiosk sessions)

### 4 — Create an Admin user

1. **Authentication → Users** tab → **Add user**
2. Enter the email and password the teacher/admin will use to log in

### 5 — Get your Firebase config keys

1. Project Overview (home icon) → **Add app** → Web (`</>`)
2. Register the app → copy the `firebaseConfig` object
3. You will need these 7 values:

```
apiKey
authDomain
projectId
storageBucket
messagingSenderId
appId
```

### 6 — Deploy Firestore security rules

1. **Firestore → Rules** tab
2. Replace the contents with the rules in `artifacts/election-app/firestore.rules`
3. Click **Publish**

---

## Run Locally

### 1 — Clone the repository

```bash
git clone https://github.com/suman4dev/Election-System.git
cd Election-System
```

### 2 — Install dependencies

```bash
pnpm install
```

### 3 — Create the environment file

Create a file at `artifacts/election-app/.env`:

```env
# Required by Vite dev server
PORT=5173
BASE_PATH=/

# Firebase — paste your values from the Firebase Console
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

> **Never commit this file.** It is already listed in `.gitignore`.

### 4 — Start the dev server

```bash
pnpm --filter @workspace/election-app run dev
```

The app will be available at **http://localhost:5173**

| Page | URL |
|------|-----|
| Home | http://localhost:5173/ |
| Kiosk (Booth 1) | http://localhost:5173/vote/booth-1 |
| Admin Panel | http://localhost:5173/admin |
| Live Results | http://localhost:5173/results |

### 5 — First-time setup in the Admin Panel

1. Go to `/admin` and log in with the email/password you created in Firebase
2. Click the **Election** tab → **Load Defaults** to seed the 10 default council posts
3. Go to the **Candidates** tab → select a post → add candidates
4. Open the **Booths** tab → unlock the booths before voting begins

---

## Deploy to Vercel

Vercel hosts the built static files and handles all routing. No server is needed.

### 1 — Push your code to GitHub (already done)

Your repository: **https://github.com/suman4dev/Election-System**

### 2 — Import the project on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Click **Import** next to your `Election-System` repository

### 3 — Configure the build settings

In the Vercel project configuration screen, set:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `artifacts/election-app` |
| **Build Command** | `pnpm build` |
| **Output Directory** | `dist/public` |
| **Install Command** | `cd ../.. && pnpm install` |

> **Root Directory** tells Vercel to treat `artifacts/election-app` as the app root.

### 4 — Add environment variables

In the Vercel dashboard → **Settings → Environment Variables**, add:

| Name | Value |
|------|-------|
| `PORT` | `3000` |
| `BASE_PATH` | `/` |
| `VITE_FIREBASE_API_KEY` | your value |
| `VITE_FIREBASE_AUTH_DOMAIN` | your value |
| `VITE_FIREBASE_PROJECT_ID` | your value |
| `VITE_FIREBASE_STORAGE_BUCKET` | your value |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | your value |
| `VITE_FIREBASE_APP_ID` | your value |

> `PORT` is required by the Vite config at build time even though Vercel does not use it for serving.

### 5 — Add an SPA rewrite rule

The app uses client-side routing (Wouter). Without a rewrite rule, refreshing any page other than `/` returns a 404.

Create a file `artifacts/election-app/public/vercel.json` with:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Or add a `vercel.json` in the **root** of the repository:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 6 — Deploy

Click **Deploy**. Vercel will build and publish the app. On every future `git push` to `main`, Vercel redeploys automatically.

### 7 — Update Firebase Authorized Domains

After deployment, add your Vercel URL to Firebase Auth's allowed domains:

1. Firebase Console → **Authentication → Settings → Authorized domains**
2. Click **Add domain** → paste your Vercel URL (e.g. `election-system.vercel.app`)

---

## Firestore Security Rules

The full rules are in `artifacts/election-app/firestore.rules`. Key points:

- **Election state & posts** — public read, admin-only write (requires email auth)
- **Candidates** — public read; admin-only create/delete; any authenticated session (including anonymous kiosk) can increment `voteCount`
- **Booths** — public read; admin-only full write; any authenticated session can `update` (so the kiosk can auto-unlock after the 5-second cooldown)

---

## Routes Reference

| Route | Who uses it | Description |
|-------|------------|-------------|
| `/` | Anyone | Home / landing page |
| `/vote/:boothId` | Voters | Full-screen kiosk (e.g. `/vote/booth-1`) |
| `/admin` | Teacher/Admin | Election control panel |
| `/results` | Public screen | Live animated results |

---

## Election Flow

```
Admin opens election (Master Switch ON)
        │
        ▼
Admin clicks "Start Voting" on a post
        │
        ▼
Voters approach any unlocked booth → cast vote
        │
        ▼
5-second countdown → booth auto-unlocks → next voter
        │
        ▼
Admin clicks "End Voting" → post is closed → results recorded
        │
        ▼
Move to next post → repeat
        │
        ▼
All posts done → Master Switch OFF
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7 |
| Styling | Tailwind CSS v4, shadcn/ui |
| Routing | Wouter |
| Animations | Framer Motion |
| Database | Firebase Firestore (real-time) |
| Auth | Firebase Authentication |
| Icons | Lucide React |
| Package manager | pnpm (monorepo) |
