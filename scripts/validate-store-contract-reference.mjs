import { readFile } from "node:fs/promises";
import process from "node:process";
import { validateStoreContract } from "../shared/store-contract/schema.js";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Uso: node scripts/validate-store-contract-reference.mjs <caminho-do-json>");
  process.exit(1);
}

let contract;
try {
  contract = JSON.parse(await readFile(inputPath, "utf8"));
} catch (error) {
  console.error(JSON.stringify({ valid: false, stage: "json-parse", error: String(error?.message || error) }));
  process.exit(1);
}

const result = validateStoreContract({ contractVersion: "1.0", generatedAt: new Date().toISOString(), ...contract });
if (!result.success) {
  console.error(JSON.stringify({ valid: false, stage: "contract-schema", issues: result.issues }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ valid: true, contractVersion: "1.0", sections: Object.keys(contract).sort() }));
