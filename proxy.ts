import { NextResponse, type NextRequest } from "next/server";

function unavailable(message: string, status = 503) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Next-only API boundary. The Vinext app keeps its native D1/R2 routes. */
export async function proxy(request: NextRequest): Promise<Response> {
  if (process.env.SHOAL_NATIVE_BACKEND === "1") return NextResponse.next();
  const caller = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== caller.origin)
    return unavailable("Open this request from your Shoal workspace.", 403);
  if (request.headers.get("sec-fetch-site") === "cross-site")
    return unavailable("Cross-site API requests are not allowed.", 403);

  const configured = process.env.SHOAL_BACKEND_URL?.trim();
  if (!configured) return unavailable("The shared backend is not connected yet.");
  let backend: URL;
  try {
    backend = new URL(configured);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(backend.hostname);
    if (
      (backend.protocol !== "https:" && !(backend.protocol === "http:" && loopback)) ||
      backend.username ||
      backend.password ||
      backend.search ||
      backend.hash ||
      backend.pathname !== "/"
    )
      throw new Error("Invalid backend origin");
    if (backend.origin === caller.origin) throw new Error("Proxy loop");
  } catch {
    return unavailable("The shared backend address is not configured correctly.");
  }

  // Assign the pathname rather than resolving user input as a URL: //host paths
  // must never replace the configured target host.
  backend.pathname = caller.pathname;
  backend.search = caller.search;
  const headers = new Headers();
  for (const name of [
    "accept",
    "content-type",
    "if-match",
    "if-none-match",
    "if-modified-since",
    "if-unmodified-since",
    "range",
    "if-range",
    "idempotency-key",
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("origin", backend.origin);
  const token = process.env.SHOAL_BACKEND_TOKEN?.trim();
  const authorization = token ? `Bearer ${token}` : request.headers.get("authorization");
  if (authorization) headers.set("authorization", authorization);
  // No browser cookies, Host, forwarding headers, or hop-by-hop request headers.
  try {
    const init: RequestInit & { duplex?: "half" } = {
      method: request.method,
      headers,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(90000)]),
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
      init.duplex = "half";
    }
    const upstream = await fetch(backend, init);
    const responseHeaders = new Headers(upstream.headers);
    const connectionHeaders =
      responseHeaders
        .get("connection")
        ?.split(",")
        .map((value) => value.trim())
        .filter(Boolean) ?? [];
    for (const name of [
      ...connectionHeaders,
      "connection",
      "keep-alive",
      "proxy-authenticate",
      "proxy-authorization",
      "te",
      "trailer",
      "transfer-encoding",
      "upgrade",
      "set-cookie",
      "content-encoding",
      "content-length",
      "access-control-allow-origin",
      "access-control-allow-credentials",
    ])
      responseHeaders.delete(name);
    responseHeaders.set("cache-control", "no-store");
    responseHeaders.set("x-content-type-options", "nosniff");
    const location = responseHeaders.get("location");
    if (location) {
      const destination = new URL(location, backend);
      // Do not send the browser to a protected backend or follow redirects with
      // its credential. Same-backend redirects stay behind this proxy.
      if (destination.origin !== backend.origin || !destination.pathname.startsWith("/api/")) {
        await upstream.body?.cancel();
        return unavailable("The backend returned an unsupported redirect.", 502);
      }
      responseHeaders.set(
        "location",
        `${caller.origin}${destination.pathname}${destination.search}${destination.hash}`,
      );
    }
    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return unavailable(
      request.signal.aborted
        ? "Request cancelled."
        : "The shared backend could not be reached. Try again.",
      request.signal.aborted ? 499 : 502,
    );
  }
}

export const config = { matcher: ["/api/:path*"] };
