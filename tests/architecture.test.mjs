import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkArchitecture } from "../scripts/check-architecture.mjs";

function fixture(files, verify) {
  const root = mkdtempSync(join(tmpdir(), "kplex-architecture-"));
  try {
    files = { "tsconfig.json": JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@/*": ["src/*"] }, moduleResolution: "bundler", module: "esnext", allowJs: true } }), ...files };
    for (const [name, contents] of Object.entries(files)) {
      const path = join(root, name);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, contents);
    }
    verify(checkArchitecture(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const failWith = (fragment) => (result) => assert(result.errors.some((error) => error.includes(fragment)), JSON.stringify(result));

test("direct and type-only Obsidian imports fail", () => {
  fixture({ "src/core/graph/root.ts": 'import { App } from "obsidian"; export const app = App;' }, failWith("forbidden external import obsidian"));
  fixture({ "src/core/graph/root.ts": 'import type { App } from "obsidian"; export type Host = App;' }, failWith("forbidden external import obsidian"));
  fixture({ "src/core/graph/root.ts": 'export type Host = import("obsidian").App;' }, failWith("forbidden external import obsidian"));
});

test("transitive and aliased host dependencies fail", () => {
  fixture({
    "src/core/graph/root.ts": 'export { value } from "@/core/graph/helper";',
    "src/core/graph/helper.ts": 'import type { TFile } from "obsidian"; export const value = 1;',
  }, failWith("src/core/graph/helper.ts: forbidden external import obsidian"));
});

test("unmigrated dependencies, globals and loading escape hatches fail", () => {
  fixture({ "src/core/graph/root.ts": 'import type { Page } from "../../types"; export type P = Page;', "src/types.ts": 'export type Page = string;' }, failWith("unmigrated module"));
  fixture({ "src/core/graph/root.ts": 'export const now = window.performance.now();' }, failWith("forbidden global window"));
  fixture({ "src/core/graph/root.ts": 'export const now = performance.now();' }, failWith("forbidden global performance"));
  fixture({ "src/core/graph/root.ts": 'export const later = () => setTimeout(() => {}, 0);' }, failWith("forbidden global setTimeout"));
  fixture({ "src/core/graph/root.ts": 'export const load = (name: string) => import(name);' }, failWith("nonliteral module loading"));
  fixture({ "src/core/graph/root.ts": 'export const load = require("node:fs");' }, failWith("forbidden external import node:fs"));
  fixture({ "src/ui/features/root.tsx": 'export const plugin = window["app"].plugins;' }, failWith("plugin escape through window[app]"));
});

test("host adapters may import core while core cannot import adapters", () => {
  fixture({
    "src/core/graph/root.ts": 'export type NodeId = string;',
    "src/adapters/obsidian/source.ts": 'import type { App } from "obsidian"; import type { NodeId } from "../../core/graph/root"; export type Bound = { app: App; id: NodeId };',
  }, (result) => assert.deepEqual(result.errors, []));
  fixture({
    "src/core/graph/root.ts": 'import type { Bound } from "../../adapters/obsidian/source"; export type Node = Bound;',
    "src/adapters/obsidian/source.ts": 'export type Bound = string;',
  }, failWith("graph cannot import adapter"));
});


test("portable parser layer cannot reach host globals or graph semantics", () => {
  fixture({ "src/core/parser/root.ts": 'export const timer = window.setTimeout(() => {}, 0);' }, failWith("forbidden global window"));
  fixture({
    "src/core/parser/root.ts": 'import type { Node } from "../graph/model"; export type Parsed = Node;',
    "src/core/graph/model.ts": 'export type Node = string;',
  }, failWith("parser cannot import graph"));
  fixture({
    "src/core/parser/root.ts": 'export type Parsed = { value: string };',
    "src/adapters/obsidian/source.ts": 'import type { Parsed } from "../../core/parser/root"; export type Bound = Parsed;',
  }, (result) => assert.deepEqual(result.errors, []));
});
test("new source cannot hide in an unclassified core folder or declaration file", () => {
  fixture({ "src/core/other/root.ts": "export const value = 1;" }, failWith("unclassified migrated path"));
  fixture({ "src/core/graph/types.d.ts": 'import type { App } from "obsidian"; export type Host = App;' }, failWith("forbidden external import obsidian"));
  fixture({ "src/core/graph/helper.js": 'export const app = window.app;' }, failWith("forbidden global window"));
});


test("localization is a host-free migrated layer usable by features and adapters", () => {
  fixture({
    "src/lang/en.ts": 'export const message = "English";',
    "src/ui/features/copy.ts": 'import { message } from "../../lang/en"; export const copy = message;',
    "src/adapters/obsidian/copy.ts": 'import { getLanguage } from "obsidian"; import { message } from "../../lang/en"; export const copy = () => getLanguage() + message;',
  }, (result) => assert.deepEqual(result.errors, []));
  fixture({
    "src/lang/en.ts": 'import { getLanguage } from "obsidian"; export const message = getLanguage();',
  }, failWith("src/lang/en.ts: forbidden external import obsidian"));
});
