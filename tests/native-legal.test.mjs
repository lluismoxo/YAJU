import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { renderLegalPage } from '../src/components/site-layout.mjs';
import { renderLegal } from '../src/components/legal.mjs';
const content = JSON.parse(await readFile(new URL('../src/content/legal.json', import.meta.url), 'utf8'));

test('native Legal renders every policy without browser hydration or compatibility patches', async () => {
  const html = await renderLegalPage(content);
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.doesNotMatch(html, /self\.__next_f|site-updates|<script[^>]+(?:_next|_yaju)/);
  assert.match(html, /native-navigation\.js/);
  for (const group of content.groups) for (const column of group.columns) for (const link of column) {
    assert.ok(html.includes(`href="${link.href}"`), link.href);
    await access(new URL(`../public${link.href}/index.html`, import.meta.url));
  }
  assert.equal((html.match(/gtag\('config', 'G-3T9YSET1R9'\)/g) || []).length, 1);
});

test('policy content escapes markup and rejects executable or external destinations', () => {
  const edited = structuredClone(content);
  edited.title = '<script>alert("test")</script>';
  assert.doesNotMatch(renderLegal(edited), /<script>/);
  for (const href of ['javascript:alert(1)', 'https://example.com', '//example.com', '/privacy" onclick="alert(1)']) {
    edited.groups[0].columns[0][0].href = href;
    assert.throws(() => renderLegal(edited), /Invalid policy link/);
  }
});
