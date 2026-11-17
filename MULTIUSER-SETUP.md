# Enable separate learner accounts

This release defaults to the original single-user login. Enable the new mode only after setup:

1. In Supabase SQL Editor run `supabase/multiuser.sql`. It adds separate tables, preserves the old `ielts_progress` row, and isolates browser read access with RLS. No existing progress is automatically reassigned.
2. In Supabase Authentication, disable public signups. The app never presents signup. Create the owner's email/password user in the Auth dashboard and confirm the email. This is separate from the Supabase dashboard login and from APP_PASSWORD.
3. Add Vercel variables `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `OWNER_EMAIL` (the verified owner login email). Keep the working PostgreSQL configuration. For creating additional users inside the website, add a working server-only `SUPABASE_SECRET_KEY`.
4. Confirm Auth API keys work before proceeding. The previously encountered gateway 401 may also affect Auth; a working PostgreSQL connection does not fix API authentication. Test on a Preview deployment first.
5. Set `AUTH_MODE=supabase` and redeploy that environment. Sign in as owner. Use **Quản lý tài khoản** to create another user, pause access or adjust daily AI limits. All newly created accounts are learners; ownership depends exclusively on verified OWNER_EMAIL.
6. Owner: use **Chuyển bản cloud cá nhân cũ vào tài khoản của tôi**, then **Tải từ cloud**. This copies the legacy cloud row only if the owner has no new cloud state; it never overwrites a current account. Local-only old data is not auto-imported: save it to legacy cloud before switching.
7. Each user must enable Push separately. Pre-migration push subscriptions are skipped in multi-user mode until re-enrolled. Devices sharing a browser switch subscriptions when the account changes.

## Data and costs

- Every learner uses a separate localStorage namespace and a separate cloud row keyed by the authenticated Supabase user UUID. The server never accepts a requested owner/user ID for progress operations.
- Supabase access/refresh tokens are HttpOnly cookies. Each request validates the user with Supabase Auth and checks active membership. Suspended members cannot use AI, cloud or receive scheduled Push.
- Default daily limit is 10 submitted AI requests per user, using the Vietnam calendar day. Each endpoint submission consumes a slot, including failed upstream AI requests. It is a request cap, not a monetary/token spending cap. Add OpenAI account billing controls separately.
- RLS permits authenticated browser users to read only their membership and progress rows. Browser writes are revoked; authenticated server endpoints enforce writes and revision checks.
- Database connection uses a privileged role: keep database credentials private. RLS alone does not protect backend queries, so all progress writes explicitly filter by verified user UUID.
- Existing news sources and starter vocabulary remain shared content; personal work, feedback and adaptive weights are per-account.
- Account creation uses admin Auth API and may require resolving the earlier invalid-key issue. No invitations or credentials are sent automatically. Share initial credentials privately. Self-service password reset/change is not implemented; an owner can reset credentials through the Supabase Auth dashboard.

Rollback: remove `AUTH_MODE=supabase` and redeploy. This restores the original password login and legacy data, without deleting new user data.
