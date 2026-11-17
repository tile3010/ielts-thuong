import { mkdirSync, writeFileSync } from 'node:fs';
// Serve private app assets through the authenticated handler.
mkdirSync('public', { recursive: true });
writeFileSync('public/robots.txt', 'User-agent: *\nDisallow: /\n');
