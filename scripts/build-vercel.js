import { mkdirSync } from 'node:fs';
// Serve every page through the authenticated handler, not as public static files.
mkdirSync('public', { recursive: true });
