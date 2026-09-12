// Export two isolated client bundles: the exact production UI and its presentation player.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/postcss';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'shoal-film-'));
const output = path.join(root, 'output/shoal-demo');
await fs.mkdir(output, { recursive: true });
const link = path.join(scratch, 'Link.tsx'),
  image = path.join(scratch, 'Image.tsx');
await fs.writeFile(
  link,
  `import React from '${root}/node_modules/react/index.js';export default function Link({children,...props}){return <a {...props}>{children}</a>}`,
);
await fs.writeFile(
  image,
  `import React from '${root}/node_modules/react/index.js';export default function Image({unoptimized,priority,fill,loader,...props}){return <img {...props}/>}`,
);
let fontCss = '';
for (const filename of await fs.readdir(path.join(root, '.next/static/css'))) {
  const text = await fs.readFile(
    path.join(root, '.next/static/css', filename),
    'utf8',
  );
  const faces = [
    ...text.matchAll(/@font-face\{[^}]*font-family:Geist;[^}]*\}/g),
  ];
  const face = faces.find((f) => f[0].includes('u+0000-00ff')) || faces.at(-1);
  const font = face?.[0].match(/url\((?:["'])?([^)'" ]+)/)?.[1];
  if (font) {
    const bytes = await fs.readFile(
      path.join(root, '.next', font.replace(/^\/_next\//, '')),
    );
    fontCss = `@font-face{font-family:FilmGeist;font-style:normal;font-weight:100 900;src:url(data:font/woff2;base64,${bytes.toString('base64')}) format('woff2')} :root{--font-geist-sans:FilmGeist}body{font-family:FilmGeist,Arial,sans-serif}`;
    break;
  }
}
async function bundle(name, component) {
  const work = path.join(scratch, name);
  await fs.mkdir(work, { recursive: true });
  await fs.writeFile(
    path.join(work, 'index.html'),
    '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shoal · Bell demo</title></head><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>',
  );
  await fs.writeFile(
    path.join(work, 'entry.tsx'),
    `import React from '${root}/node_modules/react/index.js';import {createRoot} from '${root}/node_modules/react-dom/client.js';import '${root}/app/globals.css';import {${component}} from '${root}/app/demo/${component}.tsx';createRoot(document.getElementById('root')).render(<${component}/>);`,
  );
  await build({
    configFile: false,
    root: work,
    publicDir: false,
    plugins: [react()],
    resolve: {
      alias: [
        { find: 'next/image', replacement: image },
        { find: 'next/link', replacement: link },
        { find: '@', replacement: root },
        {
          find: /^react$/,
          replacement: path.join(root, 'node_modules/react/index.js'),
        },
        {
          find: 'react/jsx-runtime',
          replacement: path.join(root, 'node_modules/react/jsx-runtime.js'),
        },
      ],
    },
    css: { postcss: { plugins: [tailwind()] } },
    build: {
      outDir: path.join(work, 'dist'),
      emptyOutDir: true,
      minify: true,
      chunkSizeWarningLimit: 1300,
    },
  });
  let html = await fs.readFile(path.join(work, 'dist/index.html'), 'utf8');
  const script = html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/);
  const sheet = html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/);
  let js = await fs.readFile(path.join(work, 'dist', script[1]), 'utf8');
  let css = await fs.readFile(path.join(work, 'dist', sheet[1]), 'utf8');
  if (name === 'app') {
    for (const filename of await fs.readdir(
      path.join(root, 'public/compute'),
    )) {
      if (!filename.endsWith('.png')) continue;
      const data = await fs.readFile(
        path.join(root, 'public/compute', filename),
      );
      js = js.replaceAll(
        '/compute/' + filename,
        `data:image/png;base64,${data.toString('base64')}`,
      );
    }
    for (const filename of await fs.readdir(path.join(root, 'public/agents'))) {
      const data = await fs.readFile(
        path.join(root, 'public/agents', filename),
      );
      if (filename.endsWith('.png'))
        css += `.agent-sprite[data-agent-character="${filename.slice(0, -4)}"] .agent-sprite-frame{background-image:url(data:image/png;base64,${data.toString('base64')})!important}`;
      else if (filename.endsWith('.gif'))
        css = css.replaceAll(
          '/agents/' + filename,
          `data:image/gif;base64,${data.toString('base64')}`,
        );
    }
  }
  const computer = await fs.readFile(
    path.join(root, 'public/compute/dell-shoal.png'),
  );
  js = js.replaceAll(
    '/compute/dell-shoal.png',
    `data:image/png;base64,${computer.toString('base64')}`,
  );
  const shell = await fs.readFile(
    path.join(root, 'public/brand/shoal-shell-icon.png'),
  );
  js = js.replaceAll(
    '/brand/shoal-shell-icon.png',
    `data:image/png;base64,${shell.toString('base64')}`,
  );
  const architecture = await fs.readFile(path.join(root, 'public/demo-art/shoal-architecture.png'));
  js = js.replaceAll('/demo-art/shoal-architecture.png', `data:image/png;base64,${architecture.toString('base64')}`);
  css += fontCss;
  html = html
    .replace(
      script[0],
      () =>
        `<script type="module">${js.replaceAll('</script', '<\\/script')}</script>`,
    )
    .replace(sheet[0], () => `<style>${css}</style>`);
  return html;
}
const app = await bundle('app', 'ExactApp');
let player = await bundle('player', 'DemoPlayer');
const encoded = Buffer.from(app).toString('base64');
player = player.replace(
  '<head>',
  `<head><script>window.__SHOAL_APP_HTML=new TextDecoder().decode(Uint8Array.from(atob('${encoded}'),c=>c.charCodeAt(0)));</script>`,
);
await fs.writeFile(path.join(output, 'shoal-bell-demo.html'), player);
console.log('Saved exact-UI standalone replay.');
await fs.rm(scratch, { recursive: true, force: true });
