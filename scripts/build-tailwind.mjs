import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '../frontend/node_modules/@tailwindcss/node/dist/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const inputCssPath = path.join(rootDir, 'frontend', 'src', 'styles', 'tailwind.css');
const outputCssPath = path.join(rootDir, 'backend', 'priv_data', 'static', 'css', 'chisfis.css');

console.log('Reading input CSS:', inputCssPath);
const inputCss = fs.readFileSync(inputCssPath, 'utf8');

console.log('Compiling Tailwind v4 CSS for Gleam SSR + ChisFis...');
const compiler = await compile(inputCss, {
  base: path.dirname(inputCssPath),
  from: inputCssPath,
  onDependency: () => {},
});

// Scan all Gleam files and frontend files for Tailwind classes
const candidates = new Set();

function scanDir(dir, extensions) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'build') {
        scanDir(fullPath, extensions);
      }
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const tokens = content.match(/[\w\-:\[\]\/%#\(\)\.!]+/g) || [];
      for (const t of tokens) candidates.add(t);
    }
  }
}

scanDir(path.join(rootDir, 'frontend', 'src'), ['.ts', '.tsx', '.js', '.jsx']);
scanDir(path.join(rootDir, 'backend', 'src'), ['.gleam', '.erl']);

console.log(`Discovered ${candidates.size} candidate utility tokens across codebase.`);
const compiledCss = compiler.build(Array.from(candidates));

fs.mkdirSync(path.dirname(outputCssPath), { recursive: true });
fs.writeFileSync(outputCssPath, compiledCss, 'utf8');
console.log(`Successfully written ChisFis CSS to ${outputCssPath} (${(compiledCss.length / 1024).toFixed(1)} KB)`);
