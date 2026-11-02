import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ContentError } from "../shared/content.js";

const CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";

let cachedToken = null;

function tokenFile() {
  return path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
}

export function cloudError(message) {
  return new ContentError(message, 502);
}

export async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.accessToken;
  const file = tokenFile();
  if (!fs.existsSync(file)) {
    throw cloudError("No hay una sesión de Firebase en esta computadora. Entrá con firebase login.");
  }
  let stored;
  try {
    stored = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    throw cloudError("No se pudo leer la sesión de Firebase. Entrá de nuevo con firebase login.");
  }
  const tokens = stored && stored.tokens ? stored.tokens : {};
  const expiresAt = Number(tokens.expires_at) || 0;
  if (tokens.access_token && expiresAt > Date.now() + 60_000) {
    cachedToken = { accessToken: tokens.access_token, expiresAt };
    return tokens.access_token;
  }
  if (!tokens.refresh_token) {
    throw cloudError("No hay una sesión de Firebase en esta computadora. Entrá con firebase login.");
  }
  let response;
  try {
    response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });
  } catch {
    throw cloudError("No se pudo renovar la sesión de Firebase.");
  }
  if (!response.ok) {
    throw cloudError("La sesión de Firebase venció. Volvé a entrar con firebase login.");
  }
  const next = await response.json();
  const nextExpires = Date.now() + Number(next.expires_in || 3600) * 1000;
  cachedToken = { accessToken: next.access_token, expiresAt: nextExpires };
  return next.access_token;
}
