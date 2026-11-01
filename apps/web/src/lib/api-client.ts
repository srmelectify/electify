/**
 * API client helper for communication between web and the api service.
 * In Vercel Services, NESTJS_API_URL is automatically injected at runtime
 * into the web service via service bindings. In local development, it defaults to http://localhost:4000.
 */

export function getNestApiUrl(path: string = ""): string {
  const base = process.env.NESTJS_API_URL || "http://localhost:4000";
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  return `${cleanBase}${cleanPath}`;
}

export async function fetchNestApi(path: string, init?: RequestInit): Promise<Response> {
  const formattedPath = path.startsWith("/api") ? path : `/api${path.startsWith("/") ? path : `/${path}`}`;
  const url = getNestApiUrl(formattedPath);
  return fetch(url, init);
}

