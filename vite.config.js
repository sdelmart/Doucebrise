import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  // Chemins relatifs : le build fonctionne depuis n'importe quel dossier / hébergeur statique.
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Musiques : noms de fichiers simples (sans espaces ni accents) dans le jeu construit.
        assetFileNames: (asset) => (/\.(mp3|ogg|oga|m4a|aac|wav|flac|opus|webm)$/i.test(asset.names?.[0] || asset.name || '') ? 'assets/music-[hash][extname]' : 'assets/[name]-[hash][extname]'),
      },
    },
  },
});
