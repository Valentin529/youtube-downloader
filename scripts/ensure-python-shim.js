import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const binDir = resolve(rootDir, "node_modules", ".bin");
const shimPath = resolve(binDir, "python");

const python3 = spawnSync("which", ["python3"], { encoding: "utf8" })
  .stdout.trim();

if (python3) {
  const shim = `#!/bin/sh
exec "${python3}" "$@"
`;

  mkdirSync(binDir, { recursive: true });

  if (existsSync(shimPath)) {
    const current = lstatSync(shimPath);
    const currentContent = current.isFile() ? readFileSync(shimPath, "utf8") : "";

    if (current.isSymbolicLink() || currentContent !== shim) {
      unlinkSync(shimPath);
    }
  }

  if (!existsSync(shimPath)) {
    writeFileSync(shimPath, shim);
    chmodSync(shimPath, 0o755);
    console.log(`Created local python shim: ${shimPath} -> ${python3}`);
  }
}
