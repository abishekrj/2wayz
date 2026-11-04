# 2WAYZ – Tiruvannamalai local auto booking

Independent React + Vite + Tailwind starter. This project is separate from ROOMO.

## Run locally
```bash
npm install
cp .env.example .env.local
# Add your separate 2WAYZ Google Maps API key to .env.local
npm run dev -- --port 5174 --strictPort
```
Open http://127.0.0.1:5174

## Google Cloud setup
You may use the existing Google Cloud project used by ROOMO, but create a **new API key for 2WAYZ**. Do not reuse ROOMO's key in this app and do not copy ROOMO environment files.

Enable Maps JavaScript API, Places API (New), and Routes API. Restrict the new key by HTTP referrer to `http://127.0.0.1:5174/*` and your future 2WAYZ production domain. Restrict API access to those three APIs. Attach billing and set quotas/budget alerts. Never commit `.env.local`.

## Included
- Google Places autocomplete biased toward Tiruvannamalai
- Google Routes driving distance and duration
- Indicative fare breakdown
- Instant / scheduled ride selection
- SVG auto-rickshaw and temple illustrations
- Three-step how-it-works section
- Dedicated `/driver/register` page

## Important before launch
Starter fare settings are illustrative only: base ₹30, ₹18/km after the first 1 km, minimum ₹50, rounded up to ₹5. Confirm local rates with drivers and update `FARE` in `src/components/BookingPanel.jsx` before public use.

Driver registration is a front-end preview only; it does not send or store personal information. OTP, secure document upload, backend persistence, customer login, booking creation, and driver matching still need backend implementation.

## Super admin and homepage CMS (development)

The admin portal is available at `/admin/login`. The API is a separate Express application in `backend/`, using PostgreSQL and Prisma. It stores administrator accounts and editable homepage section content in the 2WAYZ database.

### 1. Create a separate 2WAYZ database

In PostgreSQL, create a database named `2wayz_dev`. Do not point this project at ROOMO's database.

### 2. Configure the backend

```bash
cd /Users/abishek/Documents/2WAYZ/backend
cp .env.example .env
```

Edit `backend/.env` and set your PostgreSQL username/password, a long random JWT secret, and a strong administrator password. Generate a JWT secret with:

```bash
openssl rand -base64 48
```

Keep `backend/.env` private; never commit it. Set `CLIENT_ORIGIN` to the exact local frontend origin you use (for example `http://127.0.0.1:5173`).

Install dependencies, create the schema, and create the first administrator plus initial homepage section records:

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

The API listens on port 5001 by default.

For secure booking fare calculation, add `GOOGLE_MAPS_SERVER_API_KEY` to `backend/.env`. This must be a separate server-side key (do not use the frontend `VITE_GOOGLE_MAPS_API_KEY`). Enable the Routes API and restrict this key to the Routes API; add an IP-address restriction for your backend server when its outbound IP is stable. Never put this key in frontend files or commit `backend/.env`. Booking creation now recalculates the shortest available driving route on the backend and ignores browser-submitted distance and duration.

### 3. Configure and start the frontend

In the project root, make sure `.env.local` contains the separate 2WAYZ Google Maps key and:

```env
VITE_API_BASE_URL=http://127.0.0.1:5001/api
```

Then in a second terminal:

```bash
cd /Users/abishek/Documents/2WAYZ
npm install
npm run dev -- --port 5173 --strictPort
```

Open `http://127.0.0.1:5173/admin/login`. Sign in with the administrator email and password configured in `backend/.env`.

### Current CMS scope

- Secure admin login using a password hash and an HTTP-only session cookie.
- Protected dashboard and expandable Home Page sidebar.
- Editable content records for Hero Banner, Benefits, How It Works, Darshan Promo, Places to Visit, Upcoming Events, About, and Driver Section.
- Draft/published status and public API endpoint for published homepage content.

The editor currently saves structured JSON content to PostgreSQL. The next integration step is to connect each public homepage component to these saved records and add user-friendly field controls and image upload management. Driver, passenger, and booking backend workflows are not part of this CMS foundation yet.
