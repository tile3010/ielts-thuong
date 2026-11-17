# Thuong IELTS

Personal English study dashboard built with HTML5, CSS3, JavaScript and Node.js. Includes four-skill lessons, vocabulary maps, microphone recording, AI feedback and password login.

## Local setup

Requires Node.js 20 or newer. No external npm packages are required.

1. Open this directory in VS Code.
2. Run `Copy-Item .env.example .env` once.
3. Set `OPENAI_API_KEY` and your own `APP_PASSWORD` in `.env`.
4. Run `npm.cmd start` on Windows, or `npm start` elsewhere.
5. Open http://127.0.0.1:3000 in Chrome or Edge.

Restart the server after changing environment variables. Never commit `.env` or share your API key. API access and billing are separate from ChatGPT subscriptions. Model availability depends on your API account.

## GitHub

Upload the source directory, including `.env.example`, `server.js`, `package.json`, `index.html`, `js/` and `css/`. The ignore file excludes secrets, temporary files and generated previews. Do not force-add ignored files.

GitHub Pages cannot run this Node server. For an online version, use a Node hosting service with HTTPS, set environment variables in its dashboard, and set `HOST=0.0.0.0`. Do not publish the static preview as a substitute for server authentication.

## Data and limits

- Study data is stored in localStorage on the current browser, not a shared database. Export/backups and synchronization across devices are not implemented.
- Login sessions are in server memory, expire after 24 hours and reset on server restart. Login rate limiting is also in memory.
- The recorder requests microphone access on click. Audio is sent to OpenAI only when submitted. Speech is transcribed and its text evaluated; pronunciation is not scored directly from audio.
- AI feedback and vocabulary may require human review. Internal scores are not official IELTS bands.
- News uses Google News RSS with a 30-minute in-memory cache. Video and podcast links are topic searches or selected sources.
- This is a personal prototype intended for a single user, not a multi-user learning platform.

## Checks

Run `node --check server.js` and `node --check js/app.js` for syntax checks. Real microphone, playback and paid API requests require browser/account validation.
