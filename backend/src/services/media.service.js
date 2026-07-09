import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = path.resolve(__dirname, '..', '..', process.env.MEDIA_DIR || './media');

fs.mkdirSync(MEDIA_DIR, { recursive: true });

export function cleanupMedia(olderThanDays = 7) {
  const cutoff = Date.now() - olderThanDays * 86400000;
  const files = fs.readdirSync(MEDIA_DIR);
  for (const file of files) {
    const filepath = path.join(MEDIA_DIR, file);
    const stat = fs.statSync(filepath);
    if (stat.isFile() && stat.mtimeMs < cutoff) {
      fs.unlinkSync(filepath);
    }
  }
}
