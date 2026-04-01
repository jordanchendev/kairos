import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const currentFile = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(currentFile);
const repoRoot = path.resolve(scriptsDir, "..");
const workspaceRoot = path.resolve(repoRoot, "..");

const defaultPoseidonInput = "./.cache-specs/poseidon/openapi.json";
const defaultTritonInput = "./.cache-specs/triton/openapi.json";

const poseidonInput = process.env.OPENAPI_POSEIDON_INPUT ?? defaultPoseidonInput;
const tritonInput = process.env.OPENAPI_TRITON_INPUT ?? defaultTritonInput;

async function ensureReadable(filePath) {
  await access(filePath);
}

async function syncPoseidonSpec() {
  if (poseidonInput !== defaultPoseidonInput) {
    return;
  }

  const poseidonRoot = path.join(workspaceRoot, "poseidon");
  const poseidonPython = path.join(poseidonRoot, ".venv", "bin", "python");
  const poseidonCacheDir = path.join(repoRoot, ".cache-specs", "poseidon");
  const poseidonCachePath = path.join(poseidonCacheDir, "openapi.json");
  const pythonCode = `
import json
import sys
from poseidon.main import app

json.dump(app.openapi(), sys.stdout, indent=2)
sys.stdout.write("\\n")
`.trim();

  await mkdir(poseidonCacheDir, { recursive: true });

  const result = spawnSync(poseidonPython, ["-c", pythonCode], {
    cwd: poseidonRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      PYTHONPATH: path.join(poseidonRoot, "src"),
    },
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || "Failed to generate Poseidon OpenAPI spec");
  }

  if (!result.stdout.trim()) {
    throw new Error("Generated Poseidon OpenAPI spec was empty");
  }

  await writeFile(poseidonCachePath, result.stdout, "utf8");
}

async function verifyInputs() {
  if (tritonInput === defaultTritonInput) {
    await ensureReadable(path.join(repoRoot, ".cache-specs", "triton", "openapi.json"));
  }
}

async function main() {
  await syncPoseidonSpec();
  await verifyInputs();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
