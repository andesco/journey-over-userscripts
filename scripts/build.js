
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { minify } from "terser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const libsDir = path.join(root, "libs");

function isMinFile(file) {
	return file.endsWith(".min.js");
}

async function walk(dir) {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	const files = [];
	for (const ent of entries) {
		const full = path.join(dir, ent.name);
		if (ent.isDirectory()) files.push(...(await walk(full)));
		else if (ent.isFile() && ent.name.endsWith(".js") && !isMinFile(ent.name)) files.push(full);
	}
	return files;
}

// Extract a leading userscript header (// ==UserScript== ... // ==/UserScript==) if present
function extractHeader(content) {
	const lines = content.split(/\r?\n/);
	if (lines[0].trim().startsWith("// ==UserScript==")) {
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
	return { header: "", body: content };
}

async function ensureMinified(file) {
	const src = await fs.readFile(file, "utf8");
	const { header, body } = extractHeader(src);
	// Use a conservative terser config: disable mangle and compress so we only
	// remove whitespace/comments and do not rename identifiers or change semantics.
	const terserOpts = {
		module: true,
		mangle: false,
		compress: false,
		format: { comments: false },
	};
	const result = await minify(body, terserOpts);
	if (!result || typeof result.code !== "string") throw new Error(`Terser failed for ${file}`);

			// Ensure there is exactly one empty line between the userscript header
			// and the minified code: header lines, then two newlines => one blank line.
			const out = (header ? header + "\n\n" : "") + result.code;
			// Ensure file always ends with a single newline
			const finalOut = out.endsWith("\n") ? out : out + "\n";
	const outPath = file.replace(/\.js$/, ".min.js");

	let write = true;
	try {
		const existing = await fs.readFile(outPath, "utf8");
		if (existing === finalOut) write = false;
	} catch (e) {
		// file doesn't exist, will write
	}

	if (write) {
		await fs.writeFile(outPath, finalOut, "utf8");
		console.log(`Wrote: ${path.relative(root, outPath)}`);
	} else {
		console.log(`Unchanged: ${path.relative(root, outPath)}`);
	}
}

async function validateWithTerser(file) {
	const src = await fs.readFile(file, "utf8");
	const { body } = extractHeader(src);
	try {
		const r = await minify(body, { module: true, mangle: false, compress: false });
		if (!r || typeof r.code !== "string") {
			console.error(`Terser produced no output for ${file}`);
			return false;
		}
		console.log(`Valid: ${path.relative(root, file)}`);
		return true;
	} catch (err) {
		console.error(`Terser error for ${path.relative(root, file)}:`, err.message || err);
		return false;
	}
}

async function main() {
	try {
			const files = await walk(libsDir);
			if (files.length === 0) {
				console.log("No JS source files found under libs/");
			}
			let hadError = false;
			// Validate and minify libs
			for (const f of files) {
				const ok = await validateWithTerser(f);
				if (!ok) hadError = true;
				await ensureMinified(f);
			}

			// Validate JS files under userscripts/ but do not minify or write outputs there
			const userscriptsDir = path.join(root, "userscripts");
			try {
				const userFiles = await walk(userscriptsDir);
				for (const uf of userFiles) {
					const ok = await validateWithTerser(uf);
					if (!ok) hadError = true;
				}
			} catch (e) {
				// userscripts directory might not exist or be empty — that's fine
			}

			if (hadError) process.exitCode = 2;
		console.log("Build complete.");
	} catch (err) {
		console.error(err);
		process.exitCode = 1;
	}
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith("build.js")) main();
