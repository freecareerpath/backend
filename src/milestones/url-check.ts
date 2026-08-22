/**
 * Reachability check only — NOT content verification (ADR-0004 "milestone
 * submission honesty"). We never claim to have judged whether the linked
 * work is good; we only reject links that are malformed or unreachable at
 * submit time.
 */
export function isWellFormedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Blocks the server from making an outbound request (SSRF) to loopback,
 * private, link-local, or cloud-metadata addresses on behalf of a submitted
 * URL. This is a hostname/IP-literal check only — it does not resolve DNS
 * first, so a hostname that *resolves* to a private address at request time
 * (DNS rebinding) is not caught here. That residual gap is acceptable for
 * now (nothing is deployed yet) but should be closed — e.g. by resolving and
 * checking the IP before connecting — before this runs against real traffic.
 */
function isPrivateOrReservedHost(hostname: string): boolean {
  // `new URL(...).hostname` keeps brackets around an IPv6 literal, e.g. "[::1]".
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host === '0.0.0.0' || host === '::1') return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
    return false;
  }

  if (
    host.startsWith('fe80:') ||
    host.startsWith('fc') ||
    host.startsWith('fd')
  ) {
    return true; // IPv6 link-local / unique-local
  }

  return false;
}

export type FetchLike = (
  url: string,
  init: { method: string },
) => Promise<{ ok: boolean }>;

export async function isReachable(
  url: string,
  fetchImpl: FetchLike = fetch,
): Promise<boolean> {
  if (!isWellFormedUrl(url)) return false;
  if (isPrivateOrReservedHost(new URL(url).hostname)) return false;

  try {
    const response = await fetchImpl(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}
