# Deploy on Vercel

Import the GitHub repository. Select Framework Preset **Other**, Node.js **22.x**, and leave the Root Directory at the repository root. Build and output settings are provided in `vercel.json`.

Set these environment variables in Vercel (do not upload `.env`):

- `APP_PASSWORD`: your private website password.
- `SESSION_SECRET`: a long random secret, identical across deployments that should share sessions. Generate locally with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TRANSCRIBE_MODEL`: your API settings.
- `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`: the working Session pooler settings from your local environment.
- `PGSSLROOTCERT=./supabase-ca.crt`: the CA certificate is packaged with the function. It is a public certificate, not a private key.

`HOST`, `PORT` and Data API credentials are not needed for this deployment when PostgreSQL pooler settings are provided.

After deploying, check password login, cloud read/write, AI and microphone recording on the HTTPS URL. Cloud saves are manual: save from the old device before loading on a new one.

## Behavior and limits

- All routes, including HTML/CSS/JS, pass through the authenticated handler.
- Sessions use signed cookies with 24-hour expiry, not per-instance memory. Changing APP_PASSWORD invalidates cookies when SESSION_SECRET is omitted; when SESSION_SECRET is configured, rotate that secret to invalidate all cookies. Logout clears the cookie in the current browser; it does not revoke a copied cookie on another device.
- Login throttling and news caching remain per-instance in-memory features. For stronger protection add a shared rate limiter or hosting firewall before wider use.
- Vercel request-size limits apply to audio uploads; recordings that exceed the platform limit must be shortened. Function duration is set to 60 seconds; slow AI calls can time out.
- No cloud deployment or paid API check has been performed merely by preparing these files.

Local use remains available with `npm.cmd start`.
