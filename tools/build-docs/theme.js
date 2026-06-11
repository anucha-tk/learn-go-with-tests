// Theme tokens — single source of truth for colors, fonts, spacing.
// Reused across index.html and per-topic pages.
export const theme = {
  fonts: {
    sans: "'Sarabun', 'Noto Sans Thai', system-ui, -apple-system, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  colors: {
    bg: "#0f1115",
    bgElev: "#161922",
    bgCode: "#0b0d12",
    border: "#262a35",
    text: "#e6e8ee",
    textDim: "#9aa3b2",
    accent: "#7aa2f7",
    accentSoft: "#1f2a44",
    danger: "#f7768e",
    ok: "#9ece6a",
    warn: "#e0af68",
    link: "#7dcfff",
  },
  radius: "10px",
  maxWidth: "820px",
};

// Inline Google Fonts links — Sarabun (Thai) + JetBrains Mono.
export const fontLinks = `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link
    href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
    rel="stylesheet">
`;
