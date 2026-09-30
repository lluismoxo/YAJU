import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.argv[2];
if (!root) throw new Error("Usage: node inject-google-tag.mjs <directory>");

const marker = "gtag('config', 'G-3T9YSET1R9')";
const snippet = `
<!-- Google tag (gtag.js) -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-3T9YSET1R9');
</script>`;

const htmlFiles = [];
const walk = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.isFile() && entry.name.endsWith(".html")) htmlFiles.push(path);
  }
};

await walk(root);
let injected = 0;
let existing = 0;
let fragments = 0;

for (const path of htmlFiles) {
  const source = await readFile(path, "utf8");
  if (source.includes(marker)) {
    existing += 1;
    continue;
  }
  if (!source.includes("<head>")) {
    fragments += 1;
    continue;
  }
  await writeFile(path, source.replace("<head>", `<head>${snippet}`));
  injected += 1;
}

console.log(`Google tag: injected ${injected}, already present ${existing}, fragments skipped ${fragments}, total ${htmlFiles.length}`);
