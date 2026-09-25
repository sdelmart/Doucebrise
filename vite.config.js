import { defineConfig } from 'vite';

export default defineConfig({
  // Chemins relatifs : le build fonctionne depuis n'importe quel dossier / hébergeur statique.
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
  },
});
