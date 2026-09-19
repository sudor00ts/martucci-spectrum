import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_APP_NAME = "Martucci Spectrum";
export const OG_SERVICE_URL_DEFAULT = "";
export const OG_SITE_REL_PATH = "src/lib/og/site.json";
export const GROK_EXTENSIONS_SCRIPT_SRC = "";

const AMP = "&" + "amp;";
const LT = "&" + "lt;";
const GT = "&" + "gt;";
const QUOT = "&" + "quot;";

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", AMP)
    .replaceAll("<", LT)
    .replaceAll(">", GT)
    .replaceAll('"', QUOT);
}

export function publicAppHost(hostHeader) {
  return String(hostHeader ?? "").split(",")[0].trim() || "localhost";
}
export function resolvePublicHost(hostHeader) {
  return publicAppHost(hostHeader);
}
export function appNameFromHost() {
  return DEFAULT_APP_NAME;
}
export function isInstallQuery(url) {
  return /[?&]install=1(?:&|$)/.test(String(url ?? ""));
}
export function isDocumentPath(pathname) {
  const p = String(pathname ?? "/");
  if (p.startsWith("/api") || p.startsWith("/__")) return false;
  return p === "/" || !/\.[a-z0-9]+$/i.test(p);
}
export function acceptsHtml(accept) {
  return String(accept ?? "").includes("text/html") || String(accept ?? "").includes("*/*");
}
export function stripInstallParams(url) {
  try {
    const u = new URL(String(url ?? "/"), "https://x.invalid");
    u.searchParams.delete("install");
    u.searchParams.delete("platform");
    return u.pathname + u.search;
  } catch {
    return "/";
  }
}
export function renderInstallPageHtml(template, context = {}) {
  const host = publicAppHost(context.host);
  const appUrl = "https://" + host + stripInstallParams(context.url);
  return String(template ?? "")
    .replaceAll("{{APP_NAME}}", DEFAULT_APP_NAME)
    .replaceAll("{{APP_URL}}", appUrl);
}
export function renderWebManifest(hostHeader) {
  const host = publicAppHost(hostHeader);
  return JSON.stringify({
    name: DEFAULT_APP_NAME,
    short_name: "Martucci",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0b0a",
    theme_color: "#0c0b0a",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
    id: "https://" + host + "/",
  });
}
export function grokPwaHeadTags(appName = DEFAULT_APP_NAME) {
  return [
    ["link", '<link rel="manifest" href="/__grok/manifest.webmanifest" />'],
    ["meta", '<meta name="apple-mobile-web-app-title" content="' + escapeHtml(appName) + '" />'],
  ];
}
export function readGrokProjectId() { return ""; }
export function readXCreator() { return ""; }
export function readXCreatorId() { return ""; }
export function grokXCreatorHeadTags() { return []; }
export function grokExtensionsHeadTags() { return []; }
export function readOgSite(cwd = process.cwd()) {
  try {
    const p = join(cwd, OG_SITE_REL_PATH);
    if (!existsSync(p)) return { title: DEFAULT_APP_NAME, card: "custom" };
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return { title: DEFAULT_APP_NAME, card: "custom" };
  }
}
export function ogCardPublicPath() { return "/favicon.svg"; }
export function snapshotOgIdentity(cwd) { return { site: readOgSite(cwd) }; }
export function customOgAssetPath() { return ""; }
export function resolveOgCardAsset() { return "/favicon.svg"; }
export function ogServiceUrl() { return ""; }
export function titleFromDocument(html) {
  const m = String(html).match(/<title>([^<]*)<\/title>/i);
  return m?.[1] ?? DEFAULT_APP_NAME;
}
export function resolveOgTitle(site, appName) {
  return site?.title || appName || DEFAULT_APP_NAME;
}
export function siteHasCustomCard() { return true; }
export function grokOgHeadTags(ctx = {}) {
  const title = escapeHtml(resolveOgTitle(ctx.site, ctx.appName));
  return [
    '<meta property="og:title" content="' + title + '" />',
    '<meta property="og:type" content="website" />',
  ];
}
export function stripShareMetaTags(html) { return html; }
export function normalizeHeadContext(ctx = {}) {
  return {
    appName: ctx.appName || DEFAULT_APP_NAME,
    projectId: "",
    creator: "",
    creatorId: "",
    host: publicAppHost(ctx.host),
    cwd: ctx.cwd || process.cwd(),
    site: ctx.site || readOgSite(ctx.cwd),
  };
}
export function injectGrokPwaHead(html, ctx) {
  const tags = grokOgHeadTags(normalizeHeadContext(ctx)).join("");
  if (!html.includes("</head>")) return html + tags;
  return html.replace("</head>", tags + "</head>");
}
export function createHeadInjector(ctx) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let pending = "";
  let done = false;
  return {
    push(chunk) {
      if (done) return [typeof chunk === "string" ? encoder.encode(chunk) : chunk];
      pending += typeof chunk === "string" ? chunk : decoder.decode(chunk);
      if (pending.toLowerCase().indexOf("</head>") === -1) {
        if (pending.length > 20000) {
          const out = encoder.encode(pending);
          pending = "";
          return [out];
        }
        return [];
      }
      const injected = injectGrokPwaHead(pending, ctx);
      done = true;
      pending = "";
      return [encoder.encode(injected)];
    },
    flush() {
      if (!pending) return [];
      const out = encoder.encode(done ? pending : injectGrokPwaHead(pending, ctx));
      pending = "";
      done = true;
      return [out];
    },
  };
}
