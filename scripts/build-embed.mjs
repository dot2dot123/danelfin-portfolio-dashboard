#!/usr/bin/env node
/**
 * Build cleartext HTML with embedded JSON into build/clear/, then caller encrypts.
 * Reads templates from src/templates and data from src/data.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const templates = path.join(root, "src", "templates");
const dataDir = path.join(root, "src", "data");
const outDir = path.join(root, "build", "clear");

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function embedInto(html, actionsData, meta) {
  const payload = {
    actionsData,
    meta,
  };
  const embedScript = `<script>\n    window.DASHBOARD_EMBEDDED = ${JSON.stringify(payload)};\n  </script>\n  `;
  // Insert embed immediately before DASHBOARD_CONFIG script, or before app.js
  if (html.includes("window.DASHBOARD_CONFIG")) {
    return html.replace(
      /<script>\s*\n\s*window\.DASHBOARD_CONFIG/,
      embedScript + "<script>\n    window.DASHBOARD_CONFIG"
    );
  }
  if (html.includes('src="../assets/app.js"')) {
    return html.replace(
      '<script src="../assets/app.js"></script>',
      embedScript + '<script src="../assets/app.js"></script>'
    );
  }
  if (html.includes('src="assets/app.js"')) {
    return html.replace(
      '<script src="assets/app.js"></script>',
      embedScript + '<script src="assets/app.js"></script>'
    );
  }
  // hub: no embed needed
  return html;
}

const meta = readJson("meta.json");
const pages = [
  { tpl: "index.html", out: "index.html", actions: null },
  {
    tpl: "otw/index.html",
    out: "otw/index.html",
    actions: "otw-actions.json",
  },
  {
    tpl: "swb/index.html",
    out: "swb/index.html",
    actions: "swb-actions.json",
  },
  {
    tpl: "new-jette/index.html",
    out: "new-jette/index.html",
    actions: "new-jette-actions.json",
  },
];

fs.rmSync(outDir, { recursive: true, force: true });

for (const page of pages) {
  const src = fs.readFileSync(path.join(templates, page.tpl), "utf8");
  let html = src;
  if (page.actions) {
    const actionsData = readJson(page.actions);
    html = embedInto(src, actionsData, meta);
    if (!html.includes("DASHBOARD_EMBEDDED")) {
      throw new Error(`Failed to embed data into ${page.tpl}`);
    }
  }
  const dest = path.join(outDir, page.out);
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, html);
  console.log("wrote", page.out, page.actions ? "(embedded)" : "(hub)");
}

console.log("cleartext build ready at", outDir);
