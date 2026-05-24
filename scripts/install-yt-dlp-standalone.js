import { createWriteStream } from "node:fs";
import { chmod, mkdir, rename, rm } from "node:fs/promises";
import { get } from "node:https";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const binDir = resolve(rootDir, "node_modules", "yt-dlp-exec", "bin");
const targetName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
const targetPath = resolve(binDir, targetName);
const tempPath = `${targetPath}.download`;
const releaseApi =
  process.env.YT_DLP_RELEASE_API ||
  "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest";

function assetName() {
  if (process.platform === "darwin") {
    return "yt-dlp_macos";
  }

  if (process.platform === "win32") {
    return "yt-dlp.exe";
  }

  if (process.platform === "linux") {
    if (process.arch === "arm64") {
      return "yt-dlp_linux_aarch64";
    }

    if (process.arch === "x64") {
      return "yt-dlp_linux";
    }
  }

  throw new Error(
    `No standalone yt-dlp asset is configured for ${process.platform}/${process.arch}`
  );
}

function request(url, redirects = 0) {
  return new Promise((resolveRequest, reject) => {
    const req = get(
      url,
      {
        headers: {
          Accept: "application/vnd.github+json, application/octet-stream",
          "User-Agent": "youtube-downloader-installer",
        },
      },
      (res) => {
        const location = res.headers.location;

        if (
          location &&
          [301, 302, 303, 307, 308].includes(res.statusCode ?? 0)
        ) {
          res.resume();

          if (redirects >= 5) {
            reject(new Error(`Too many redirects while downloading ${url}`));
            return;
          }

          resolveRequest(
            request(new URL(location, url).toString(), redirects + 1)
          );
          return;
        }

        if ((res.statusCode ?? 0) >= 400) {
          res.resume();
          reject(new Error(`Request failed with status ${res.statusCode}: ${url}`));
          return;
        }

        resolveRequest(res);
      }
    );

    req.on("error", reject);
  });
}

async function fetchJson(url) {
  const res = await request(url);
  const chunks = [];

  for await (const chunk of res) {
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function download(url, destination) {
  const res = await request(url);

  await new Promise((resolveDownload, reject) => {
    const file = createWriteStream(destination, { mode: 0o755 });

    res.pipe(file);
    res.on("error", reject);
    file.on("error", reject);
    file.on("finish", resolveDownload);
  });
}

const release = await fetchJson(releaseApi);
const wantedAssetName = assetName();
const asset = release.assets?.find(({ name }) => name === wantedAssetName);

if (!asset?.browser_download_url) {
  throw new Error(`Could not find yt-dlp release asset: ${wantedAssetName}`);
}

await mkdir(binDir, { recursive: true });
await rm(tempPath, { force: true });
await download(asset.browser_download_url, tempPath);
await chmod(tempPath, 0o755);
await rename(tempPath, targetPath);

console.log(`Installed standalone yt-dlp: ${wantedAssetName} -> ${targetPath}`);
