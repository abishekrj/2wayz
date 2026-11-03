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