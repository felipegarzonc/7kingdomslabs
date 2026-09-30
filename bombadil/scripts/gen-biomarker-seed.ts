/**
 * Generates supabase/seed.sql from the TypeScript biomarker catalog.
 * Usage: npm run gen:seed
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { renderBiomarkerSeed } from "../src/domain/seed-sql";

const out = path.resolve(import.meta.dirname, "../supabase/seed.sql");
writeFileSync(out, renderBiomarkerSeed());
console.log(`wrote ${out}`);
