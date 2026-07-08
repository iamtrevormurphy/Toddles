#!/usr/bin/env node
// Generates the brand SVGs (app icon + splash) from Pip's character def —
// the same data the app renders, so the icon always matches the mascot.
// Run: node scripts/generate-brand-assets.js
// Then rasterize (macOS): see the printed commands.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

function loadModule(relPath, context) {
  let src = fs.readFileSync(path.join(root, relPath), 'utf8');
  src = src
    .replace(/^import[^;]*;$/gm, '')
    .replace(/^export default/gm, 'module.exports =')
    .replace(/^export /gm, '');
  vm.runInContext(src, context, { filename: relPath });
}

// --- load pip def + color helpers through the same source the app uses ----
const context = vm.createContext({ console, module: { exports: {} } });
loadModule('src/constants/theme.js', context);
const { shade, DEPTH, GRADIENTS } = vm.runInContext('({ shade, DEPTH, GRADIENTS })', context);

const pipContext = vm.createContext({ console, module: { exports: {} } });
vm.runInContext('const module = { exports: {} };', pipContext);
loadModule('src/characters/defs/pip.js', pipContext);
const pip = vm.runInContext('module.exports', pipContext);

const CHARACTER_COLORS = {
  teal: '#5FA8A0',
  cornflower: '#6C8FD4',
  amber: '#EDB95F',
  terracotta: '#E2795B',
  lavender: '#A99BD1',
  rose: '#D98BA3',
  moss: '#8FB26E',
  ink: '#3E3A5E',
  white: '#FFFDF9',
};
const resolve = (token) => CHARACTER_COLORS[token] || token;
const polyPath = (verts) => `M ${verts.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`;
// Keep all subpath windings uniform so nonzero fill never punches holes
const windUniform = (points) => {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return area < 0 ? [...points].reverse() : points;
};
const extrudeSidePath = (verts, dy = DEPTH.extrude.dy) => {
  let d = polyPath(windUniform(verts.map(([x, y]) => [x, y + dy])));
  for (let i = 0; i < verts.length; i++) {
    const [x1, y1] = verts[i];
    const [x2, y2] = verts[(i + 1) % verts.length];
    d += ` ${polyPath(windUniform([[x1, y1], [x2, y2], [x2, y2 + dy], [x1, y1 + dy]]))}`;
  }
  return d;
};

function pipSvgBody() {
  const parts = [];
  // ground shadow
  parts.push(
    `<ellipse cx="${pip.shadow.cx}" cy="${pip.shadow.cy}" rx="${pip.shadow.rx}" ry="3.4" fill="#3E3A5E" opacity="0.10"/>`,
    `<ellipse cx="${pip.shadow.cx}" cy="${pip.shadow.cy}" rx="${pip.shadow.rx * 1.35}" ry="4.6" fill="#3E3A5E" opacity="0.06"/>`
  );
  for (const m of pip.masses) {
    const side = shade(resolve(m.color), DEPTH.sideShade);
    parts.push(`<path d="${extrudeSidePath(m.verts)}" fill="${side}" stroke="${side}" stroke-width="0.5"/>`);
  }
  for (const m of pip.masses) {
    parts.push(`<path d="${polyPath(m.verts)}" fill="${resolve(m.color)}"/>`);
  }
  for (const d of pip.details) {
    parts.push(
      d.type === 'circle'
        ? `<circle cx="${d.cx}" cy="${d.cy}" r="${d.r}" fill="${resolve(d.color)}"/>`
        : `<path d="${polyPath(d.verts)}" fill="${resolve(d.color)}"/>`
    );
  }
  for (const a of pip.appendages) {
    for (const p of a.polys) {
      parts.push(`<path d="${polyPath(p.verts)}" fill="${resolve(p.color)}"/>`);
    }
  }
  const { left, right, radius } = pip.eyes;
  for (const [ex, ey] of [left, right]) {
    parts.push(
      `<circle cx="${ex}" cy="${ey}" r="${radius}" fill="#3E3A5E"/>`,
      `<circle cx="${ex + radius * 0.35}" cy="${ey - radius * 0.3}" r="${radius * 0.3}" fill="#FFFDF9"/>`
    );
  }
  for (const [cx, cy] of pip.cheeks.points) {
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${pip.cheeks.radius}" fill="#D98BA3" opacity="0.85"/>`);
  }
  return parts.join('\n    ');
}

// App icon: full-bleed dawn gradient, Pip centered large (OS masks corners).
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${GRADIENTS.dawn[0]}"/>
      <stop offset="1" stop-color="${GRADIENTS.dawn[1]}"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#sky)"/>
  <g transform="translate(180, 132) scale(6.6)">
    ${pipSvgBody()}
  </g>
</svg>`;

// Splash: sand background, Pip smaller and centered.
const splash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#F7F1E8"/>
  <g transform="translate(287, 260) scale(4.5)">
    ${pipSvgBody()}
  </g>
</svg>`;

const outDir = path.join(root, 'assets', 'brand');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'icon.svg'), icon);
fs.writeFileSync(path.join(outDir, 'splash.svg'), splash);
console.log('Wrote assets/brand/icon.svg and assets/brand/splash.svg');
console.log('Rasterize with:');
console.log('  qlmanage -t -s 1024 assets/brand/icon.svg -o assets/brand/');
