import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Kennung dieses Builds: Commit (im Workflow `GITHUB_SHA`) und Bauzeit. Die
  // Anwendung kennt sie als `__FASSUNG__` und vergleicht sie mit der
  // veröffentlichten `fassung.json` – ein Fenster, das noch eine ältere
  // Fassung zeigt, meldet so „Neue Fassung verfügbar“ (src/shared/pwa.ts).
  const umgebung = loadEnv(mode, '.', '');
  const zeit = new Date().toISOString();
  const commit = umgebung.GITHUB_SHA ? umgebung.GITHUB_SHA.slice(0, 7) : null;
  const fassung = { id: `${commit ?? 'lokal'}-${zeit}`, commit, zeit };

  return {
    // Relative Pfade, damit der Build auch in einem Unterverzeichnis läuft
    // (z.B. GitHub Pages unter /<repository>/).
    base: './',
    define: { __FASSUNG__: JSON.stringify(fassung) },
    plugins: [
      react(),
      {
        name: 'kaplan-fassung',
        apply: 'build',
        generateBundle() {
          this.emitFile({ type: 'asset', fileName: 'fassung.json', source: JSON.stringify(fassung) });
        },
      },
    ],
    server: { port: 5173, host: true },
  };
});
