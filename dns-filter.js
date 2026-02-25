/**
 * Server-side DNS-based content filter.
 *
 * Uses a configurable DNS resolver (default: Cloudflare Family 1.1.1.3)
 * to check whether a hostname is blocked. When a filtering DNS server
 * blocks a domain it typically resolves it to 0.0.0.0 / ::.
 *
 * Environment variables:
 *   DNS_FILTER_ENABLED   – "true" to enable filtering (default: "false")
 *   DNS_FILTER_SERVERS   – comma-separated DNS server IPs
 *                          (default: "1.1.1.3,1.0.0.3" – Cloudflare Family)
 *   DNS_FILTER_CACHE_TTL – cache TTL in milliseconds (default: 300000 = 5 min)
 */

import { Resolver } from "dns";

const BLOCKED_IPS = new Set(["0.0.0.0", "::", "::1"]);

const BLOCKED_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blocked</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,-apple-system,sans-serif;background:#111;color:#fff;
      display:flex;justify-content:center;align-items:center;min-height:100vh;text-align:center;padding:20px}
    .card{max-width:480px}
    h1{font-size:1.6rem;margin-bottom:.75rem;color:#f44}
    p{color:#aaa;line-height:1.5}
  </style>
</head>
<body>
  <div class="card">
    <h1>Access Denied</h1>
    <p>The site you are trying to reach has been blocked by the DNS content filter configured on this server.</p>
  </div>
</body>
</html>`;

/**
 * Corrosion / Rhodium XOR codec (key = 2, applied to odd-indexed chars only).
 */
function corrosionXorDecode(encoded) {
  try {
    const decoded = decodeURIComponent(encoded);
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      result +=
        i % 2 === 1
          ? String.fromCharCode(decoded.charCodeAt(i) ^ 2)
          : decoded.charAt(i);
    }
    return result;
  } catch {
    return null;
  }
}

/**
 * Try to parse a string as a URL and return the hostname, or null.
 */
function hostnameFromString(str) {
  if (!str) return null;
  try {
    return new URL(str).hostname;
  } catch {
    try {
      return new URL("http://" + str).hostname;
    } catch {
      return null;
    }
  }
}

export default class DNSFilter {
  /**
   * @param {object} [opts]
   * @param {boolean} [opts.enabled]
   * @param {string[]} [opts.servers]  DNS server IPs
   * @param {number}   [opts.cacheTTL] milliseconds
   * @param {string}   [opts.barePath]
   * @param {string}   [opts.corrosionPrefix]
   * @param {string}   [opts.rhodiumPrefix]
   */
  constructor(opts = {}) {
    this.enabled = opts.enabled ?? false;
    this.servers = opts.servers ?? ["1.1.1.3", "1.0.0.3"];
    this.cacheTTL = opts.cacheTTL ?? 300_000;
    this.barePath = opts.barePath ?? "/not-sus-server/";
    this.corrosionPrefix = opts.corrosionPrefix ?? "/co/";
    this.rhodiumPrefix = opts.rhodiumPrefix ?? "/rho/";

    this.resolver = new Resolver();
    this.resolver.setServers(this.servers);

    /** @type {Map<string, {filtered: boolean, time: number}>} */
    this.cache = new Map();

    if (this.enabled) {
      console.log(
        `[dns-filter] Enabled – DNS servers: ${this.servers.join(", ")}, cache TTL: ${this.cacheTTL}ms`
      );
    }
  }

  /**
   * Create a DNSFilter from environment variables.
   */
  static fromEnv() {
    const enabled =
      (process.env.DNS_FILTER_ENABLED || "false").toLowerCase() === "true";
    const servers = process.env.DNS_FILTER_SERVERS
      ? process.env.DNS_FILTER_SERVERS.split(",").map((s) => s.trim())
      : undefined;
    const cacheTTL = process.env.DNS_FILTER_CACHE_TTL
      ? parseInt(process.env.DNS_FILTER_CACHE_TTL, 10)
      : undefined;
    return new DNSFilter({ enabled, servers, cacheTTL });
  }

  // ───────────────── hostname extraction ─────────────────

  /**
   * Extract the target hostname from an incoming HTTP request headed for one of
   * the proxies.  Returns null when the request is not proxy-related or the
   * hostname cannot be determined.
   */
  extractHostname(req) {
    try {
      const url = req.url;

      // Bare server (used by Ultraviolet & Stomp)
      if (url.startsWith(this.barePath)) {
        const host = req.headers["x-bare-host"];
        return host ? host.split(":")[0] : null;
      }

      // Corrosion
      if (url.startsWith(this.corrosionPrefix)) {
        const encoded = url.slice(this.corrosionPrefix.length).split("?")[0];
        return hostnameFromString(corrosionXorDecode(encoded));
      }

      // Rhodium
      if (url.startsWith(this.rhodiumPrefix)) {
        const encoded = url.slice(this.rhodiumPrefix.length).split("?")[0];
        return hostnameFromString(corrosionXorDecode(encoded));
      }
    } catch {
      /* best-effort */
    }
    return null;
  }

  // ───────────────── DNS resolution check ─────────────────

  /**
   * Resolve a hostname through the configured DNS servers and return true when
   * the DNS server signals the domain is blocked (resolves to 0.0.0.0 / ::).
   */
  async isFiltered(hostname) {
    if (!this.enabled || !hostname) return false;

    // Don't filter raw IP addresses
    if (/^[\d.]+$/.test(hostname) || hostname.includes(":")) return false;

    // Cache lookup
    const cached = this.cache.get(hostname);
    if (cached && Date.now() - cached.time < this.cacheTTL) {
      return cached.filtered;
    }

    let filtered = false;
    try {
      const addresses = await new Promise((resolve, reject) => {
        this.resolver.resolve4(hostname, (err, addrs) => {
          if (err) reject(err);
          else resolve(addrs);
        });
      });
      filtered = addresses.some((addr) => BLOCKED_IPS.has(addr));
    } catch {
      // NXDOMAIN / ENODATA / network error → don't block
      filtered = false;
    }

    this.cache.set(hostname, { filtered, time: Date.now() });
    return filtered;
  }

  // ───────────────── middleware helpers ─────────────────

  /**
   * Check an HTTP request and, if the target hostname is blocked, write a 403
   * response and return true.  Returns false when the request is allowed or
   * not proxy-related.
   */
  async handleRequest(req, res) {
    if (!this.enabled) return false;
    const hostname = this.extractHostname(req);
    if (!hostname) return false;
    const blocked = await this.isFiltered(hostname);
    if (blocked) {
      res.writeHead(403, { "Content-Type": "text/html" });
      res.end(BLOCKED_HTML);
      return true;
    }
    return false;
  }

  /**
   * Check a WebSocket upgrade request and, if blocked, destroy the socket.
   * Returns true when blocked.
   */
  async handleUpgrade(req, socket) {
    if (!this.enabled) return false;
    const hostname = this.extractHostname(req);
    if (!hostname) return false;
    const blocked = await this.isFiltered(hostname);
    if (blocked) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return true;
    }
    return false;
  }
}
