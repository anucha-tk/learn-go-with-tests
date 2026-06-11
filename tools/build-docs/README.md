# build-docs

Render `docs/*.md` → `docs/index.html` + `docs/<slug>.html`.

Theme: dark, Sarabun (Thai) + JetBrains Mono, ตามที่กำหนดใน `theme.js` / `style.css`.

## ใช้งาน

```bash
cd tools/build-docs
npm install
npm run build        # build ครั้งเดียว
npm run watch        # rebuild อัตโนมัติเมื่อไฟล์เปลี่ยน
```

## เขียนบทใหม่

1. Copy `docs/TEMPLATE.md` → `docs/<slug>.md`
2. ใส่ frontmatter (slug, title, order, tags, summary) — slug ต้องไม่ซ้ำ, order เรียง TOC
3. เขียนเนื้อหาตาม structure: hook → เรื่อง → ปัญหา → naive → idiomatic → ทำไมต้องรู้ → หลุม → สรุป
4. Wikilink ไปบทอื่น: `[[other-slug]]` → auto-resolve เป็น `<a href="./other-slug.html">`
5. `npm run build` → เปิด `docs/index.html` ใน browser

## Theme — แก้ที่เดียวจบ

| อยากเปลี่ยน | แก้ที่ |
| --- | --- |
| สี / font / spacing | `tools/build-docs/style.css` (root CSS vars) |
| ชื่อ site / tagline | `tools/build-docs/build.mjs` (`SITE_TITLE`, `SITE_TAGLINE`) |
| โครงสร้าง HTML | `pageShell()` ใน `build.mjs` |
| Markdown features | `marked` config ใน `build.mjs` |

ทุกบทจะใช้ style เดียวกัน — แก้ CSS ครั้งเดียวทุกหน้าอัปเดต.
