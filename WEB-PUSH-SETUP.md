# Android Web Push

1. Run `npm.cmd install`, then `node scripts/setup-push.js` once. The script adds missing VAPID and cron variables to your private `.env` without printing them.
2. Copy `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and `CRON_SECRET` from `.env` to Vercel Environment Variables. Use Production (and Preview if testing there). Do not commit real values.
3. Redeploy. On Android Chrome open the stable production URL, sign in, tap **Bật thông báo 20:00**, and grant notification permission yourself.
4. Tap **Gửi thử** and verify that a notification appears. Then tap the notification to check that it opens the app.

The backend creates a private `ielts_push` table in the existing PostgreSQL database on first subscription. It stores push endpoints and encryption keys, grants no browser role access, deduplicates scheduled sends by device and Vietnam calendar day, and removes expired subscriptions on 404/410.

The cron path `/api/cron/remind` requires `Authorization: Bearer CRON_SECRET`; it never accepts a secret in the URL. `0 13 * * *` means 20:00 Vietnam. Vercel Hobby cron may run within that hour, and device delivery depends on network and system settings. The daily job processes at most 20 devices, sufficient for this personal app. A crash after a device is claimed can skip that day's message; this is not a guaranteed-delivery scheduler.

Disable the ChatGPT reminder separately if you no longer want both reminders. Web Push enrollment and OS permission must be completed on the target phone. Keep the VAPID key pair stable; rotating it requires device re-enrollment. Sign in on the same production domain each time; deployment preview domains have separate subscriptions.
