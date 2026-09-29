# CIG Email Templates

Versioned email templates used by CIG. These are intended to be the source of truth for content that may be configured in third‑party dashboards (e.g., Supabase Auth email templates).

This package does not ship runtime code; it stores HTML and copy that you can paste into your provider.

## Templates

- Sign in (passwordless: OTP + magic link): `src/templates/sign-in.html`
  - Uses both `{{ .Token }}` and `{{ .ConfirmationURL }}` so the same email supports a 6‑digit code and a click‑through link.
- Confirm email (email + password sign-up): `src/templates/confirm-email.html`
  - Uses `{{ .ConfirmationURL }}` to confirm a new account created with email + password.

## Supabase setup

1) Go to Supabase Dashboard → Authentication → Email Templates → “Sign in”.
2) Subject: `Your CIG sign-in link or code`
3) Paste the contents of `src/templates/sign-in.html` into the body.
4) Save changes.

For email/password sign-up confirmations:
1) Open the “Confirm signup” (or “Confirmation”) template.
2) Subject: `Confirm your CIG email`
3) Paste `src/templates/confirm-email.html`.
4) Save changes.

Required variables present in the template:
- `{{ .Token }}`: renders the 6‑digit code.
- `{{ .ConfirmationURL }}`: renders the magic link destination.

Redirect URLs (required for magic link):
- Add your dashboard callback, e.g. `https://app.cig.lat/auth/callback` and `http://localhost:3001/auth/callback` in Auth → URL Configuration.

## Local preview

You can do a simple string-substitution preview that writes to `./.preview/sign-in.html`:

```bash
pnpm --filter @cig/emails preview:sign-in
```

Then open the generated file in your browser.

## Notes

- The application already supports both flows. This email allows users to choose either from a single message.
- Keep any visual changes conservative for email client compatibility.
