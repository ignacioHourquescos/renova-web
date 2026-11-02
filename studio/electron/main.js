import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, Menu, shell } from "electron";
import { createServer } from "vite";

const studioRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(studioRoot, "..");

let mainWindow = null;
let viteServer = null;

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
  app.quit();
}

function focusWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

async function editorUrl() {
  viteServer = await createServer({
    configFile: path.join(studioRoot, "vite.config.js"),
    root: studioRoot,
    server: { open: false, strictPort: false },
  });
  await viteServer.listen();
  const base = viteServer.resolvedUrls?.local?.[0];
  if (!base) throw new Error("No se pudo iniciar el editor");
  return new URL("landings", base).href;
}

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: "Editor de landings",
    autoHideMenuBar: true,
    icon: path.join(studioRoot, "public", "logo-renova.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    shell.openExternal(target);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, target) => {
    const current = new URL(mainWindow.webContents.getURL());
    const next = new URL(target);
    if (next.origin !== current.origin) {
      event.preventDefault();
      shell.openExternal(target);
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  return mainWindow.loadURL(url);
}

function git(args) {
  return new Promise((resolve, reject) => {
    execFile("git", args, {
      cwd: repoRoot,
      windowsHide: true,
      maxBuffer: 12 * 1024 * 1024,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    }, (error, stdout, stderr) => {
      if (error) {
        const detail = String(stderr || stdout || error.message).trim();
        reject(new Error(detail || "Git no pudo completar la acción"));
        return;
      }
      resolve(stdout);
    });
  });
}

async function pullChanges() {
  const output = (await git(["pull", "--ff-only"])).trim();
  if (output) console.log(output);
}

async function openEditor() {
  Menu.setApplicationMenu(null);
  try {
    await pullChanges();
  } catch (error) {
    console.error(error);
    await dialog.showMessageBox({
      type: "warning",
      title: "Editor de landings",
      message: "No se pudieron bajar los cambios de Git.",
      detail: error.message,
      buttons: ["Abrir igual"],
    });
  }
  const url = await editorUrl();
  await createWindow(url);
  console.log(`Editor listo en ${url}`);
}

async function shutdown() {
  if (!viteServer) return;
  const server = viteServer;
  viteServer = null;
  await server.close();
}

if (hasLock) {
  app.on("second-instance", () => {
    focusWindow();
  });

  app.whenReady().then(openEditor).catch((error) => {
    console.error(error);
    dialog.showErrorBox("Editor de landings", error.message || "No se pudo abrir el editor");
    app.quit();
  });

  app.on("window-all-closed", () => {
    shutdown().finally(() => app.quit());
  });

  app.on("before-quit", () => {
    shutdown();
  });
}
