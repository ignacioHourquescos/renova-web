import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ContentError } from "../shared/content.js";
import { studioPaths } from "./store.js";

function repoRoot() {
  return path.resolve(studioPaths().studioRoot, "..");
}

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function git(args) {
  return new Promise((resolve, reject) => {
    execFile("git", args, {
      cwd: repoRoot(),
      windowsHide: true,
      maxBuffer: 12 * 1024 * 1024,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    }, (error, stdout, stderr) => {
      if (error) {
        const detail = String(stderr || stdout || error.message).trim();
        reject(new ContentError(detail || "Git no pudo completar la acción", 502));
        return;
      }
      resolve(stdout);
    });
  });
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (!inside(to, target)) continue;
    if (entry.isDirectory()) copyDir(source, target);
    else fs.copyFileSync(source, target);
  }
}

function placeExport(pages) {
  const exportDir = path.join(studioPaths().studioRoot, "export");
  const root = repoRoot();
  const paths = [];
  for (const page of pages) {
    const from = path.resolve(exportDir, page);
    const to = path.resolve(root, page);
    if (!inside(exportDir, from) || !inside(root, to)) {
      throw new ContentError("La exportación tiene una ruta inválida", 500);
    }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    paths.push(page.replaceAll("\\", "/"));
  }
  const heroFrom = path.join(exportDir, "hero.css");
  if (fs.existsSync(heroFrom)) {
    fs.copyFileSync(heroFrom, path.join(root, "hero.css"));
    paths.push("hero.css");
  }
  const assetsFrom = path.join(exportDir, "assets");
  if (fs.existsSync(assetsFrom)) {
    copyDir(assetsFrom, path.join(root, "assets"));
    paths.push("assets");
  }
  for (const file of ["views/js/landing-live.js", "views/js/firebase-landings-config.js"]) {
    if (fs.existsSync(path.join(root, file))) paths.push(file);
  }
  return paths;
}

export async function publishExport(pages) {
  const paths = placeExport(pages);
  await git(["add", "--", ...paths]);
  const staged = (await git(["diff", "--cached", "--name-only", "--", ...paths])).trim();
  if (!staged) {
    return { ok: true, pushed: false, message: "No hay cambios nuevos para publicar." };
  }
  await git(["commit", "-m", "Publica las landings del editor.", "--", ...paths]);
  await git(["push", "origin", "HEAD"]);
  return { ok: true, pushed: true, message: "Publicado en GitHub." };
}
