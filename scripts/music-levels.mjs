// Mesure le volume moyen de chaque musique du dossier music/ et écrit music/levels.json :
// le jeu s'en sert pour que toutes les chansons sonnent aussi fort les unes que les autres.
//   npm run music:levels            (ffmpeg doit être installé, ou FFMPEG=/chemin/vers/ffmpeg)

import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = 'music';
const TARGET_DB = -21; // volume moyen visé
const MAX_BOOST_DB = 8;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

function files(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(mp3|ogg|m4a|wav|flac|aac|opus)$/i.test(f) ? [p] : [];
  });
}

const levels = {};
for (const file of files(ROOT).sort()) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-i', file, '-map', '0:a:0', '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
  if (r.error) {
    console.error(`ffmpeg introuvable (${r.error.message}). Installe-le ou indique FFMPEG=/chemin/vers/ffmpeg.`);
    process.exit(1);
  }
  const mean = parseFloat(/mean_volume:\s*(-?[\d.]+) dB/.exec(r.stderr)?.[1]);
  const max = parseFloat(/max_volume:\s*(-?[\d.]+) dB/.exec(r.stderr)?.[1]);
  if (Number.isNaN(mean)) {
    console.warn(`? ${file} : volume illisible`);
    continue;
  }
  // Pas de saturation : le gain ne dépasse pas la marge du pic.
  const db = Math.min(TARGET_DB - mean, MAX_BOOST_DB, Number.isNaN(max) ? MAX_BOOST_DB : -max - 0.5);
  const key = relative(ROOT, file).split('\\').join('/');
  levels[key] = Math.round(10 ** (db / 20) * 1000) / 1000;
  console.log(`${db >= 0 ? '+' : ''}${db.toFixed(1)} dB  ${key}`);
}
writeFileSync(join(ROOT, 'levels.json'), `${JSON.stringify(levels, null, 2)}\n`);
console.log(`→ ${ROOT}/levels.json (${Object.keys(levels).length} musiques)`);
