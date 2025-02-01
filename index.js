#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const readline = require("readline");

const colors = {
  red    : "\x1b[31m",
  green  : "\x1b[32m",
  yellow : "\x1b[33m",
  blue   : "\x1b[34m",
  reset  : "\x1b[0m",
};

const PACKER_VERSION = "1.0.0";
const EXCLUDED_FILES = [
  "LICENSE",
  "README.md",
  "package-lock.json",
  "package.json",

  ".git",
  ".gitignore",
  ".DS_Store",
  ".vscode",

  "node_modules/.bin",
  "node_modules/.package-lock.json",
  "node_modules/@eslint",
  "node_modules/@eslint-community",
  "node_modules/@humanwhocodes",
  "node_modules/@nodelib",
  "node_modules/@ungap",
  "node_modules/acorn",
  "node_modules/acorn-jsx",
  "node_modules/ajv",
  "node_modules/ansi-regex",
  "node_modules/ansi-styles",
  "node_modules/argparse",
  "node_modules/balanced-match",
  "node_modules/brace-expansion",
  "node_modules/callsites",
  "node_modules/chalk",
  "node_modules/color-convert",
  "node_modules/color-name",
  "node_modules/concat-map",
  "node_modules/cross-spawn",
  "node_modules/debug",
  "node_modules/deep-is",
  "node_modules/doctrine",
  "node_modules/escape-string-regexp",
  "node_modules/eslint",
  "node_modules/eslint-plugin-require-sort",
  "node_modules/eslint-scope",
  "node_modules/eslint-visitor-keys",
  "node_modules/espree",
  "node_modules/esquery",
  "node_modules/esrecurse",
  "node_modules/estraverse",
  "node_modules/esutils",
  "node_modules/fast-deep-equal",
  "node_modules/fast-json-stable-stringify",
  "node_modules/fast-levenshtein",
  "node_modules/fastq",
  "node_modules/file-entry-cache",
  "node_modules/find-up",
  "node_modules/flat-cache",
  "node_modules/flatted",
  "node_modules/fs.realpath",
  "node_modules/glob",
  "node_modules/glob-parent",
  "node_modules/globals",
  "node_modules/graphemer",
  "node_modules/has-flag",
  "node_modules/ignore",
  "node_modules/import-fresh",
  "node_modules/imurmurhash",
  "node_modules/inflight",
  "node_modules/inherits",
  "node_modules/is-extglob",
  "node_modules/is-glob",
  "node_modules/is-path-inside",
  "node_modules/isexe",
  "node_modules/js-yaml",
  "node_modules/json-buffer",
  "node_modules/json-schema-traverse",
  "node_modules/json-stable-stringify-without-jsonify",
  "node_modules/keyv",
  "node_modules/levn",
  "node_modules/locate-path",
  "node_modules/lodash.merge",
  "node_modules/minimatch",
  "node_modules/ms",
  "node_modules/natural-compare",
  "node_modules/once",
  "node_modules/optionator",
  "node_modules/p-limit",
  "node_modules/p-locate",
  "node_modules/parent-module",
  "node_modules/path-exists",
  "node_modules/path-is-absolute",
  "node_modules/path-key",
  "node_modules/prelude-ls",
  "node_modules/punycode",
  "node_modules/queue-microtask",
  "node_modules/resolve-from",
  "node_modules/reusify",
  "node_modules/rimraf",
  "node_modules/run-parallel",
  "node_modules/shebang-command",
  "node_modules/shebang-regex",
  "node_modules/strip-ansi",
  "node_modules/strip-json-comments",
  "node_modules/supports-color",
  "node_modules/text-table",
  "node_modules/type-check",
  "node_modules/type-fest",
  "node_modules/uri-js",
  "node_modules/which",
  "node_modules/word-wrap",
  "node_modules/wrappy",
  "node_modules/yocto-queue",
];

const EXCLUDED_PATTERNS = [
  /^\.git/,
  /^\.vscode/,
  /^\.?eslintrc/,
  /^node_modules\/(\.bin|.*-sort.*)/,
];

const REQUIRED_FIELDS = [
  "name",
  "version",
  "description",
  "author",
  "dependencies",
];

const targetDir = process.argv[2] || ".";

const rl = readline.createInterface({
  input  : process.stdin,
  output : process.stdout,
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function shouldExclude(file) {
  return EXCLUDED_FILES.includes(file) || EXCLUDED_PATTERNS.some(pattern => pattern.test(file));
}

function validateInfoJson(info) {
  for (const field of REQUIRED_FIELDS)
    if (!(field in info))
      throw new Error(`Missing required field in info.json: ${field}`);

  if (typeof info.description !== "object" || !info.description.zh_tw)
    throw new Error("description must be an object with zh_tw field");

  if (!Array.isArray(info.author))
    throw new Error("author must be an array");

  if (typeof info.dependencies !== "object")
    throw new Error("dependencies must be an object");
}

async function packTrem(directory) {
  try {
    const infoPath = path.join(directory, "info.json");
    if (!fs.existsSync(infoPath))
      throw new Error("info.json not found");

    const info = JSON.parse(fs.readFileSync(infoPath, "utf8"));
    validateInfoJson(info);

    const signaturePath = path.join(directory, "signature.json");
    if (fs.existsSync(signaturePath)) {
      const signature = JSON.parse(fs.readFileSync(signaturePath, "utf8"));
      if (signature.version !== info.version)
        throw new Error(`Version mismatch: info.json (${info.version}) ≠ signature.json (${signature.version})`);
    }

    console.log("\n" + colors.yellow + "Plugin Information:" + colors.reset);
    console.log(`Name: ${info.name}`);
    console.log(`Version: ${info.version}`);
    console.log(`Description: ${info.description.zh_tw}`);
    console.log(`Authors: ${info.author.join(", ")}`);
    console.log("Dependencies:", JSON.stringify(info.dependencies, null, 2));

    const confirm = await question(colors.yellow + "\nConfirm plugin information? (y/N): " + colors.reset);
    if (confirm.toLowerCase() !== "y") {
      console.log(colors.red + "Operation cancelled by user" + colors.reset);
      process.exit(0);
    }

    if (!fs.existsSync(signaturePath)) {
      const createSignature = await question(colors.yellow + "\nsignature.json not found. Continue without it? (y/N): " + colors.reset);
      if (createSignature.toLowerCase() !== "y") {
        console.log(colors.red + "Operation cancelled by user" + colors.reset);
        process.exit(0);
      }
    }

    const zip = new AdmZip();
    const outputName = `${info.name}.trem`;

    function addFilesToZip(currentPath, zipPath = "") {
      const files = fs.readdirSync(currentPath);

      files.forEach(file => {
        const filePath = path.join(currentPath, file);
        const stat = fs.statSync(filePath);
        const relativePath = path.join(zipPath, file);

        if (file.startsWith("__MACOSX") || shouldExclude(relativePath) || file.endsWith(".trem"))
          return;

        if (stat.isDirectory())
          addFilesToZip(filePath, relativePath);
        else {
          const fileData = fs.readFileSync(filePath);
          zip.addFile(relativePath, fileData);
          console.log(colors.blue + `Adding: ${relativePath}` + colors.reset);
        }
      });
    }

    addFilesToZip(directory);
    zip.writeZip(outputName);
    console.log(colors.green + `\nSuccessfully created ${outputName}` + colors.reset);
    console.log(colors.yellow + `Plugin: ${info.name} v${info.version}` + colors.reset);
    console.log(colors.blue + `Packer Version: ${PACKER_VERSION}` + colors.reset);

  } catch (error) {
    console.error(colors.red + "Error: " + error.message + colors.reset);
    process.exit(1);
  } finally {
    rl.close();
  }
}

packTrem(targetDir);
