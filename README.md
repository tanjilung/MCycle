# MCycle

Menstrual cycle tracking web app with:
- Account registration and login
- Biometric login via passkeys (WebAuthn) with password fallback
- Persistent PostgreSQL storage
- Monthly calendar view
- Editable cycle defaults
- Configurable menstruation, follicular, ovulation, and luteal phase windows
- Prediction highlights for next ovulation (orange) and next menstruation (red)

## Tech Stack

- Next.js (App Router) + TypeScript
- Prisma ORM + PostgreSQL
- WebAuthn using `@simplewebauthn/server` and `@simplewebauthn/browser`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
copy .env.example .env
```

3. Update `DATABASE_URL` in `.env` to your PostgreSQL instance.

4. Run Prisma migration and generate client:

```bash
npm run prisma:migrate
npm run prisma:generate
```

5. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

6. Run unit and API tests:

```bash
npm test
```

7. Install Playwright browser (first time only):

```bash
npx playwright install chromium
```

8. Run end-to-end smoke tests:

```bash
npm run test:e2e
```

## Environment Variables

- `DATABASE_URL`: Postgres connection string
- `WEBAUTHN_RP_ID`: relying party id, usually `localhost` for local dev
- `WEBAUTHN_ORIGIN`: app origin, usually `http://localhost:3000` for local dev

## Main App Routes

- `/register`: account creation + passkey enrollment
- `/login`: passkey login or password fallback
- `/app/dashboard`: authenticated dashboard
- `/app/calendar/[year]/[month]`: monthly calendar and predictions
- `/app/cycle-defaults`: edit cycle defaults
- `/app/cycles/[id]`: edit phase windows for a cycle
- `/app/settings`: export and delete account

## API Highlights

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/passkey/register/options`
- `POST /api/auth/passkey/register/verify`
- `POST /api/auth/passkey/login/options`
- `POST /api/auth/passkey/login/verify`
- `GET/PATCH /api/cycle-defaults`
- `GET/POST /api/cycles`
- `GET/PATCH/DELETE /api/cycles/:id`
- `PATCH /api/cycles/:id/phases/:phaseId`
- `POST /api/user/export`
- `POST /api/user/delete`

## Deployment on Railway

This repo is packaged for Railway with [railway.toml](railway.toml).

### 1. Create Railway services

1. Create a new Railway project.
2. Add a PostgreSQL service.
3. Add a web service from this GitHub repo.
4. Link the web service to the PostgreSQL service.

### 2. Configure variables in the web service

Set these environment variables:

- `DATABASE_URL`: use Railway Postgres connection string (injected automatically when linked, or paste manually)
- `WEBAUTHN_ORIGIN`: your public app URL, for example `https://your-app.up.railway.app`
- `WEBAUTHN_RP_ID`: hostname only from `WEBAUTHN_ORIGIN`, for example `your-app.up.railway.app`

### 3. Build and start behavior

Railway uses these commands from `railway.toml`:

- Build: `npm ci && npm run build:railway`
- Start: `npm run start:railway`

`start:railway` runs Prisma migrations before boot:

- `prisma migrate deploy`
- `next start -p ${PORT:-3000}`

### 4. Deploy

Push to your connected branch. Railway will build, run migrations, and start the app.

If you need to run migration deploy manually in a Railway shell:

```bash
npm run prisma:migrate:deploy
```

## Notes

- This app is for tracking support and prediction. It is not medical advice.
- WebAuthn support depends on browser/device capability.
