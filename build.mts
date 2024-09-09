import * as esbuild from 'esbuild';
import * as fs from 'node:fs';

fs.rmSync('dist', { recursive: true, force: true });

await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outdir: 'dist',
  minify: false,
  format: 'cjs',
  platform: 'node',
  target: 'esnext',
  tsconfig: './tsconfig.project.json',
});

fs.copyFileSync('package.json', 'dist/package.json');
fs.copyFileSync('LICENSE', 'dist/LICENSE');
fs.copyFileSync('README.md', 'dist/README.md');
