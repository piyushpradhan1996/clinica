import { access, mkdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(scriptDir, "..");
const repoRoot = resolve(frontendDir, "..");
const backendDir = join(repoRoot, "backend");
const e2eDbPath = join(backendDir, "clinica-e2e.db");

await rm(e2eDbPath, { force: true });
await mkdir(dirname(e2eDbPath), { recursive: true });

const python = await findPython();
const child = spawn(
  python,
  ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
  {
    cwd: backendDir,
    stdio: "inherit",
    env: {
      ...process.env,
      CLINICA_DB_PATH: e2eDbPath
    }
  }
);

function stop() {
  child.kill("SIGTERM");
}

process.on("SIGTERM", stop);
process.on("SIGINT", stop);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

async function findPython() {
  const candidates =
    process.platform === "win32"
      ? [
          join(backendDir, ".venv", "Scripts", "python.exe"),
          "python",
          "py"
        ]
      : [
          join(backendDir, ".venv", "bin", "python"),
          "python3",
          "python"
        ];

  for (const candidate of candidates) {
    if (candidate.includes("/") || candidate.includes("\\")) {
      try {
        await access(candidate);
        return candidate;
      } catch {
        continue;
      }
    }

    return candidate;
  }

  return "python";
}
