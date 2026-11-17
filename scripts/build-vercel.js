import { mkdirSync, writeFileSync, copyFileSync, cpSync } from 'node:fs';
// Serve every page through the authenticated handler, not as public static files.
mkdirSync('public', { recursive: true });
// Vercel requires a non-empty output directory. No private app assets go here.
writeFileSync('public/robots.txt', 'User-agent: *\nDisallow: /\n');
copyFileSync('manifest.webmanifest', 'public/manifest.webmanifest');
copyFileSync('sw.js', 'public/sw.js');
cpSync('icons', 'public/icons', { recursive: true });
// Application code is already public on GitHub; only data APIs and HTML need
// authentication. Serving these assets at the CDN avoids repeated Auth/DB calls.
cpSync('css', 'public/css', { recursive: true });
cpSync('js', 'public/js', { recursive: true });
