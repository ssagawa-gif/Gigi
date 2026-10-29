import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`      -> dist/ for GitHub Pages (base './' works at any repository path)
// `npm run build:html` -> dist-html/index.html, ONE self-contained file you can double-click
export default defineConfig(({ mode }) => ({
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
  base: './',
  build: mode === 'single' ? { outDir: 'dist-html' } : {},
}));
