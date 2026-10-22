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
const defaultThalassaInput = "./.cache-specs/thalassa/openapi.json";
const defaultPipelineInput = "./.cache-specs/pipeline/openapi.json";

const openapiService = process.env.OPENAPI_SERVICE ?? "";
if (openapiService !== "" && openapiService !== "poseidon") {
  console.error(`Unsupported OPENAPI_SERVICE: ${openapiService}`);
  process.exit(1);
}
const poseidonOnly = openapiService === "poseidon";

const poseidonInput = process.env.OPENAPI_POSEIDON_INPUT ?? defaultPoseidonInput;
const tritonInput = process.env.OPENAPI_TRITON_INPUT ?? defaultTritonInput;
const thalassaInput = process.env.OPENAPI_THALASSA_INPUT ?? defaultThalassaInput;
const pipelineInput = process.env.OPENAPI_PIPELINE_INPUT ?? defaultPipelineInput;

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

async function syncThalassaSpec() {
  if (thalassaInput !== defaultThalassaInput) {
    return;
  }

  const thalassaRoot = path.join(workspaceRoot, "thalassa");
  const thalassaPython = path.join(thalassaRoot, ".venv", "bin", "python");
  const thalassaCacheDir = path.join(repoRoot, ".cache-specs", "thalassa");
  const thalassaCachePath = path.join(thalassaCacheDir, "openapi.json");
  const pythonCode = `
import json
import sys
from thalassa.main import app

json.dump(app.openapi(), sys.stdout, indent=2)
sys.stdout.write("\\n")
`.trim();

  await mkdir(thalassaCacheDir, { recursive: true });

  const result = spawnSync(thalassaPython, ["-c", pythonCode], {
    cwd: thalassaRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      PYTHONPATH: path.join(thalassaRoot, "src"),
    },
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || "Failed to generate Thalassa OpenAPI spec");
  }

  if (!result.stdout.trim()) {
    throw new Error("Generated Thalassa OpenAPI spec was empty");
  }

  await writeFile(thalassaCachePath, result.stdout, "utf8");
}

// The strategy-pipeline runner is a separate FastAPI app inside the Poseidon repo
// (branch feat/strategy-pipeline, poseidon.pipeline.app). Set OPENAPI_PIPELINE_INPUT to a spec
// file or URL (e.g. http://localhost:8011/openapi.json on stormtrooper) to skip the local build.
// Importing the app asserts an isolated pipeline database, so the local build also needs
// POSEIDON_DATABASE_URL pointing at one.
async function syncPipelineSpec() {
  if (pipelineInput !== defaultPipelineInput) {
    return;
  }

  const poseidonRoot = path.join(workspaceRoot, "poseidon");
  const poseidonPython = path.join(poseidonRoot, ".venv", "bin", "python");
  const cacheDir = path.join(repoRoot, ".cache-specs", "pipeline");
  const pythonCode = `
import json
import sys
from poseidon.pipeline.app import app

json.dump(app.openapi(), sys.stdout, indent=2)
sys.stdout.write("\\n")
`.trim();

  await mkdir(cacheDir, { recursive: true });

  const result = spawnSync(poseidonPython, ["-c", pythonCode], {
    cwd: poseidonRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      PYTHONPATH: path.join(poseidonRoot, "src"),
    },
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || "Failed to generate Pipeline OpenAPI spec");
  }

  if (!result.stdout.trim()) {
    throw new Error("Generated Pipeline OpenAPI spec was empty");
  }

  await writeFile(path.join(cacheDir, "openapi.json"), result.stdout, "utf8");
}

async function verifyInputs() {
  if (tritonInput === defaultTritonInput) {
    await ensureReadable(path.join(repoRoot, ".cache-specs", "triton", "openapi.json"));
  }
  if (thalassaInput === defaultThalassaInput) {
    await ensureReadable(path.join(repoRoot, ".cache-specs", "thalassa", "openapi.json"));
  }
  if (pipelineInput === defaultPipelineInput) {
    await ensureReadable(path.join(repoRoot, ".cache-specs", "pipeline", "openapi.json"));
  }
}

async function verifyPoseidonOnlyInput() {
  if (!process.env.OPENAPI_POSEIDON_INPUT?.trim()) {
    throw new Error("OPENAPI_SERVICE=poseidon requires an explicit OPENAPI_POSEIDON_INPUT");
  }
  await ensureReadable(process.env.OPENAPI_POSEIDON_INPUT);
}

async function main() {
  if (poseidonOnly) {
    await verifyPoseidonOnlyInput();
    return;
  }
  await syncPoseidonSpec();
  await syncThalassaSpec();
  await syncPipelineSpec();
  await verifyInputs();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
