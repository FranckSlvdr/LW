# Last War App

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Fill in `DATABASE_URL`, `APP_SECRET`, and `NEXT_PUBLIC_APP_URL`.
3. Start the app with `npm run dev`.

## Transactional email / SMTP

The app sends two transactional emails:

- user invitations
- password reset links

These flows use `nodemailer` with the following server-side environment variables:

```bash
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="Last War Tracker <noreply@example.com>"
```

Behavior by environment:

- Local development without SMTP: the app does not send emails and logs email metadata instead.
- Production / Vercel without valid SMTP: invite and forgot-password flows fail server-side.
- Admin force-reset without SMTP: the UI can still return a one-time reset URL to copy manually.

Notes:

- Port `587` is treated as STARTTLS.
- Port `465` is treated as implicit TLS.
- `EMAIL_FROM` is optional in code but should be set explicitly in production.

## Vercel configuration

Add these variables to the `lastwar-app` Vercel project for the environments you use:

```bash
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
EMAIL_FROM
```

You can inspect existing variables with:

```bash
vercel env ls production --scope franckslvdr-3595s-projects
```
