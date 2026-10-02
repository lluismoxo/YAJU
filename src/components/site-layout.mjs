import { readFile } from 'node:fs/promises';
import { renderLegal } from './legal.mjs';
import { renderAnalytics } from './analytics.mjs';
const templates = new Map();
async function template(name) {
  if (!templates.has(name)) templates.set(name, readFile(new URL(`./site/${name}.html`,import.meta.url),'utf8'));
  return templates.get(name);
}
export async function renderLegalPage(content) {
  const [head,header,footer] = await Promise.all(['legal-head','header','footer'].map(template));
  return `<!DOCTYPE html><html lang="en-US" dir="ltr"><head>${renderAnalytics()}${head}<script src="/assets/native-navigation.js" defer></script></head><body class="bg-surface-inverse"><div>${header}<div class="h-full">${renderLegal(content)}</div>${footer}</div><script defer src="/_vercel/insights/script.js"></script><script defer src="/_vercel/speed-insights/script.js"></script></body></html>`;
}
