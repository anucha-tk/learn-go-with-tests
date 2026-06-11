// build.mjs — render docs/*.md → docs/index.html + docs/<slug>.html
// Theme: dark, Sarabun/Noto. Markdown engine: marked. Frontmatter: gray-matter.

import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { existsSync, watch } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Marked } from "marked";
import matter from "gray-matter";
import { theme, fontLinks } from "./theme.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const DOCS = join(ROOT, "docs");
const STYLE_PATH = join(__dirname, "style.css");
const TEMPLATE_PATH = join(DOCS, "TEMPLATE.md");

const SITE_TITLE = "เรียน Go ด้วยการเขียนเทสต์";
const SITE_TAGLINE = "สรุปแบบ storytelling — ภาษาไทย";

// Files we never render as pages.
const SKIP_FILES = new Set(["TEMPLATE.md", "README.md"]);

// marked setup — GitHub-flavored, code blocks get language class for prism/highlight.
const marked = new Marked({ gfm: true, breaks: false });
marked.use({
  renderer: {
    code({ text, lang }) {
      const cls = lang ? ` class="language-${lang}"` : "";
      return `<pre><code${cls}>${escapeHtml(text)}</code></pre>\n`;
    },
  },
});

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function pageShell({ title, body, breadcrumb }) {
  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — ${SITE_TITLE}</title>
  ${fontLinks}
  <link rel="stylesheet" href="./_assets/style.css">
</head>
<body>
  <div class="shell">
    <header class="site">
      <h1><a href="./index.html" style="color:var(--text)">${SITE_TITLE}</a></h1>
      <nav class="crumb">${breadcrumb || `<a href="./index.html">${SITE_TAGLINE}</a>`}</nav>
    </header>
    <main>
      ${body}
    </main>
    <footer class="site">
      <span>${SITE_TAGLINE}</span>
      <span>build: <a href="https://github.com/anucha-tk/learn-go-with-tests">source</a></span>
    </footer>
  </div>
</body>
</html>`;
}

function renderMeta(data) {
  const tags = (data.tags || []).map(
    (t) => `<span class="tag">${escapeHtml(t)}</span>`,
  );
  if (!tags.length) return "";
  return `<div class="meta">${tags.join("")}</div>`;
}

function buildTopicPage({ data, content }, allTopics) {
  const title = data.title || data.slug || "untitled";
  const breadcrumb = `<a href="./index.html">← กลับหน้าหลัก</a> · ${escapeHtml(title)}`;

  // Resolve [[slug]] wikilinks to real anchors.
  const resolved = content.replace(
    /\[\[([a-z0-9_-]+)\]\]/g,
    (m, slug) => {
      const target = allTopics.find((t) => t.data.slug === slug);
      if (!target) return `<span class="muted">[${slug}?]</span>`;
      return `<a href="./${slug}.html">${target.data.title || slug}</a>`;
    },
  );

  const body = `
    <h1>${escapeHtml(title)}</h1>
    ${renderMeta(data)}
    ${marked.parse(resolved)}
  `;
  return pageShell({ title, body, breadcrumb });
}

function buildIndex(topics) {
  const items = topics
    .slice()
    .sort((a, b) => (a.data.order ?? 999) - (b.data.order ?? 999))
    .map((t) => {
      const slug = t.data.slug;
      const title = t.data.title || slug;
      const summary = t.data.summary || "";
      return `<li>
        <a href="./${slug}.html">${escapeHtml(title)}</a>
        <span class="summary">${escapeHtml(summary)}</span>
      </li>`;
    })
    .join("\n");

  const body = `
    <h1>${SITE_TITLE}</h1>
    <p class="muted">${SITE_TAGLINE}</p>
    <ul class="toc">${items}</ul>
  `;
  return pageShell({ title: "หน้าหลัก", body });
}

async function copyAssets() {
  const assetsDir = join(DOCS, "_assets");
  if (!existsSync(assetsDir)) await mkdir(assetsDir, { recursive: true });
  const css = await readFile(STYLE_PATH, "utf8");
  await writeFile(join(assetsDir, "style.css"), css);
}

async function loadTopics() {
  const files = (await readdir(DOCS)).filter(
    (f) => f.endsWith(".md") && !SKIP_FILES.has(f),
  );
  const topics = [];
  for (const f of files) {
    const raw = await readFile(join(DOCS, f), "utf8");
    const parsed = matter(raw);
    if (!parsed.data.slug) {
      console.warn(`[skip] ${f} — no frontmatter.slug`);
      continue;
    }
    topics.push(parsed);
  }
  return topics;
}

async function build() {
  const topics = await loadTopics();
  await copyAssets();

  const indexHtml = buildIndex(topics);
  await writeFile(join(DOCS, "index.html"), indexHtml);

  for (const t of topics) {
    const html = buildTopicPage(t, topics);
    const out = join(DOCS, `${t.data.slug}.html`);
    await writeFile(out, html);
    console.log(`[built] ${relative(ROOT, out)}`);
  }
  console.log(`[built] ${relative(ROOT, join(DOCS, "index.html"))} (${topics.length} topics)`);
}

const WATCH = process.argv.includes("--watch");
await build();
if (WATCH) {
  console.log("[watch] polling docs/ + tools/build-docs/style.css every 2s");
  let last = Date.now();
  setInterval(async () => {
    try {
      const docsStat = (await readdir(DOCS, { withFileTypes: true }))
        .filter((e) => e.isFile())
        .map((e) => e.name);
      const styleStat = existsSync(STYLE_PATH) ? STYLE_PATH : null;
      const all = [...docsStat.map((n) => join(DOCS, n)), styleStat].filter(Boolean);
      const newest = await Promise.all(
        all.map(async (p) => {
          const { statSync } = await import("node:fs");
          try { return { p, m: statSync(p).mtimeMs }; } catch { return { p, m: 0 }; }
        }),
      );
      const max = Math.max(...newest.map((n) => n.m));
      if (max > last) {
        last = max;
        console.log("[rebuild]");
        await build();
      }
    } catch (e) {
      console.error("[watch error]", e);
    }
  }, 2000);
}
