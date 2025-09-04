import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { minify } from "terser";
import { js as jsBeautify } from "js-beautify";

// -----------------------------
// Config
// -----------------------------
const beautifyOpts = {
  indent_size: 2,
  indent_char: " ",
  max_preserve_newlines: 5,
  preserve_newlines: true,
  keep_array_indentation: true,
  break_chained_methods: false,
  indent_scripts: "normal",
  brace_style: "collapse,preserve-inline",
  space_before_conditional: true,
  unescape_strings: false,
  jslint_happy: false,
  end_with_newline: true,
  wrap_line_length: 0,
  indent_inner_html: false,
  comma_first: false,
  e4x: false,
  indent_empty_lines: false,
};

const terserOpts = {
  module: true,
  mangle: false,
  compress: false,
  format: { comments: false },
};

// -----------------------------
// Paths
// -----------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const libsDir = path.join(root, "libs");
const userscriptsDir = path.join(root, "userscripts");

// -----------------------------
// Utilities
// -----------------------------
const isJsFile = (name) => name.endsWith(".js") && !name.endsWith(".min.js");

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) files.push(...(await walk(full)));
    else if (ent.isFile() && isJsFile(ent.name)) files.push(full);
  }
  return files;
}

function extractHeader(content) {
  const lines = content.split(/\r?\n/);
  if (!lines[0]?.trim().startsWith("// ==UserScript==")) return { header: "", body: content };

  const headerLines = [];
  let i = 0;
  for (; i < lines.length; i++) {
    headerLines.push(lines[i]);
    if (lines[i].trim().startsWith("// ==/UserScript==")) {
      i++;
      break;
    }
  }
  return { header: headerLines.join("\n"), body: lines.slice(i).join("\n") };
}

function normalizeEnding(content) {
  return content.endsWith("\n") ? content : content + "\n";
}

// -----------------------------
// JS Processing
// -----------------------------
async function formatSource(file) {
  const src = await fs.readFile(file, "utf8");
  const { header, body } = extractHeader(src);
  const beautifiedBody = jsBeautify(body, beautifyOpts);
  const out = (header ? header + "\n\n" : "") + beautifiedBody;
  const finalOut = normalizeEnding(out);

  if (finalOut !== src) {
    await fs.writeFile(file, finalOut, "utf8");
    console.log(`Formatted: ${path.relative(root, file)}`);
    return true;
  }
  console.log(`Unchanged format: ${path.relative(root, file)}`);
  return false;
}

async function ensureMinified(file) {
  const src = await fs.readFile(file, "utf8");
  const { header, body } = extractHeader(src);
  const beautifiedBody = jsBeautify(body, beautifyOpts);
  const result = await minify(beautifiedBody, terserOpts);
  if (!result?.code) throw new Error(`Terser failed for ${file}`);

  const out = (header ? header + "\n\n" : "") + result.code;
  const finalOut = normalizeEnding(out);
  const outPath = file.replace(/\.js$/, ".min.js");

  try {
    const existing = await fs.readFile(outPath, "utf8");
    if (existing === finalOut) {
      console.log(`Unchanged: ${path.relative(root, outPath)}`);
      return;
    }
  } catch {} // File doesn't exist, will write

  await fs.writeFile(outPath, finalOut, "utf8");
  console.log(`Wrote: ${path.relative(root, outPath)}`);
}

async function validateWithTerser(file) {
  const src = await fs.readFile(file, "utf8");
  const { body } = extractHeader(src);
  try {
    const beautified = jsBeautify(body, beautifyOpts);
    const r = await minify(beautified, { module: true, mangle: false, compress: false });
    if (!r?.code) throw new Error("No output from terser");
    console.log(`Valid: ${path.relative(root, file)}`);
    return true;
  } catch (err) {
    console.error(`Terser error for ${path.relative(root, file)}:`, err.message || err);
    return false;
  }
}

// -----------------------------
// Main
// -----------------------------
async function main() {
  try {
    const files = await walk(libsDir);
    if (!files.length) console.log("No JS source files found under libs/");

    let hadError = false;

    for (const f of files) {
      await formatSource(f);
      if (!(await validateWithTerser(f))) hadError = true;
      await ensureMinified(f);
    }

    // Process userscripts without minifying
    try {
      const userFiles = await walk(userscriptsDir);
      for (const uf of userFiles) {
        await formatSource(uf);
        if (!(await validateWithTerser(uf))) hadError = true;
      }
    } catch {} // userscripts/ may not exist

    if (hadError) process.exitCode = 2;
    console.log("Build complete.");
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith("build.js")) main();
