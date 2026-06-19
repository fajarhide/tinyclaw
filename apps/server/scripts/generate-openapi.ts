import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { serializeHttpOpenApiSpec } from "../src/http/openapi";

const serverRoot = join(import.meta.dir, "..");
const outputPath = join(serverRoot, "openapi.json");

writeFileSync(outputPath, serializeHttpOpenApiSpec());
console.log(`Wrote ${outputPath}`);
