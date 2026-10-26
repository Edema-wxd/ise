#!/usr/bin/env node
/**
 * Applies every .sql file in db/ in filename order.
 *
 * Each migration is written to be re-runnable (create table if not exists),
 * so this is safe to run repeatedly. There is no migrations ledger yet — add
 * one if the schema starts changing shape rather than only growing.
 *
 *   DATABASE_URL=... npm run db:migrate
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const dbDir = join(dirname(fileURLToPath(import.meta.url)), "..", "db");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL is not set.\n" +
      "Copy .env.example to .env.local and paste your Neon connection string,\n" +
      "then run: node --env-file=.env.local scripts/migrate.mjs",
  );
  process.exit(1);
}

const sql = neon(url);
const files = readdirSync(dbDir).filter((f) => f.endsWith(".sql")).sort();

for (const file of files) {
  // The HTTP driver takes one statement per request, so each file is split on
  // semicolons at end of line and sent statement by statement.
  const statements = readFileSync(join(dbDir, file), "utf8")
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s && !s.split("\n").every((line) => line.trim().startsWith("--")));

  for (const statement of statements) {
    await sql.query(statement);
  }
  console.log(`applied ${file} (${statements.length} statements)`);
}

console.log("migrations up to date");
