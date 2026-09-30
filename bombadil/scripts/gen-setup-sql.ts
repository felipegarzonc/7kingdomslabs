/**
 * Concatenates all migrations + the biomarker seed into supabase/setup.sql,
 * so a hosted project can be set up with one paste into the SQL Editor.
 * Usage: npm run gen:setup (a unit test checks it stays in sync).
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { renderSetupSql } from "../src/domain/setup-sql";

const out = path.resolve(import.meta.dirname, "../supabase/setup.sql");
writeFileSync(out, renderSetupSql(path.resolve(import.meta.dirname, "../supabase")));
console.log(`wrote ${out}`);
