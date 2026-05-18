# Chef's Assistant

A personal kitchen management app with pantry tracking, recipe management, AI chat (Groq), cooking history, and Google Drive persistence.

## Features

- **Pantry** — Track ingredients with quantities, categories, expiry dates, and low-stock alerts
- **Recipes** — 6 starter recipes, pantry cross-check, URL import via Groq
- **Shopping List** — Auto-fill from recipes, check off items, move to pantry, Walmart shortcut
- **Cooking History** — Log meals with emoji ratings and notes, monthly grouping
- **Chef AI** — Groq-powered chat with pantry and recipe context

## Tech Stack

- React + Vite + Tailwind CSS v4
- Express API (Groq proxy, recipe URL parsing)
- Google Drive API (`chefs-assistant-data.json`)
- [Groq](https://groq.com) (`llama-3.1-8b-instant` by default) via OpenAI-compatible SDK

## Setup

### 1. Install dependencies

```bash
npm install
npm install --prefix server
npm install --prefix client
```

### 2. Environment variables

**Server** — copy `server/.env.example` to `server/.env`:

```
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.1-8b-instant
PORT=3001
```

Get an API key from [console.groq.com](https://console.groq.com).

**Client** — copy `client/.env.example` to **`client/.env`** (important: Vite does **not** read `.env.example`):

```
VITE_GOOGLE_CLIENT_ID=....apps.googleusercontent.com
```

Restart `npm run dev` after creating or editing `client/.env`.

### 3. Google Cloud setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable **Google Drive API**
3. Create an **OAuth 2.0 Client ID** (Web application)
4. Add **Authorized JavaScript origins** (exact match, no trailing slash):
   - `http://localhost:5173` (dev — use this URL, not `127.0.0.1`)
   - `http://127.0.0.1:5173` (add this too if your browser uses it)
   - `http://localhost:3001` (only if you run `npm start` instead of `npm run dev`)
   - Your production URL when deployed
5. Copy the Client ID into `client/.env`

The app uses the `drive.file` scope — it can only access `chefs-assistant-data.json` created/opened by the app.

### 4. Run locally

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001 (proxied via Vite in dev)

Click **Connect Google Drive** to sync data. Without Google credentials, the app runs in local-only mode.

### 5. Production build

```bash
npm run build
npm start
```

Serves the built React app and API from port 3001.

## Deploy to Netlify

The repo includes `netlify.toml` and serverless functions for `/api/chat` and `/api/parse-recipe`.

### 1. Push to GitHub

```bash
git add .
git commit -m "Add Netlify deployment"
git push origin main
```

### 2. Import on Netlify

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Connect GitHub and select this repository
3. Netlify should auto-detect settings from `netlify.toml` (no changes needed)
4. Click **Deploy site**

### 3. Environment variables (Netlify dashboard)

**Site configuration → Environment variables** — add:

| Variable | Value |
|----------|--------|
| `GROQ_API_KEY` | Your Groq key (`gsk_...`) |
| `GROQ_MODEL` | `llama-3.1-8b-instant` (optional) |
| `VITE_GOOGLE_CLIENT_ID` | Your Google OAuth Client ID |

Then **Trigger deploy** → **Deploy site** (rebuild so Vite picks up `VITE_GOOGLE_CLIENT_ID`).

### 4. Google OAuth for production

After the first deploy, copy your site URL (e.g. `https://chefs-kiss.netlify.app`).

In Google Cloud → **Clients** → your Web client → **Authorized JavaScript origins**, add:

```
https://your-site-name.netlify.app
```

(No trailing slash. Use `https`.)

Under **Audience**, keep yourself as a **Test user** while the app is in Testing mode.

### 5. Phone home screen

Open your Netlify URL on your phone → **Connect Google Drive** → Safari **Share** → **Add to Home Screen**. Data syncs via Drive, not the icon itself.

## Data shape

Saved to Google Drive as `chefs-assistant-data.json`:

```json
{
  "pantry": [],
  "recipes": [],
  "shoppingList": [],
  "cookHistory": []
}
```

Starter recipes are bundled in the app and merged on load; only user-added/imported recipes are persisted.
