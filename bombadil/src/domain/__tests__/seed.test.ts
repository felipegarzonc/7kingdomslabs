import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { renderBiomarkerSeed } from "../seed-sql";

it("supabase/seed.sql is in sync with the catalog (run `npm run gen:seed`)", () => {
  const file = readFileSync(path.resolve(import.meta.dirname, "../../../supabase/seed.sql"), "utf8");
  expect(file).toBe(renderBiomarkerSeed());
});

it("supabase/setup.sql is in sync with migrations + seed (run `npm run gen:setup`)", async () => {
  const { renderSetupSql } = await import("../setup-sql");
  const dir = path.resolve(import.meta.dirname, "../../../supabase");
  expect(readFileSync(path.join(dir, "setup.sql"), "utf8")).toBe(renderSetupSql(dir));
});
