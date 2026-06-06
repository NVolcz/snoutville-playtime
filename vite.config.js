import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

function copyGameAssets() {
  return {
    name: 'copy-game-assets',
    closeBundle() {
      const source = resolve('assets');
      const target = resolve('dist/assets');

      if (existsSync(source)) {
        cpSync(source, target, { recursive: true });
      }
    }
  };
}

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];

export default defineConfig({
  base: process.env.GITHUB_ACTIONS && repositoryName ? `/${repositoryName}/` : '/',
  plugins: [copyGameAssets()]
});
