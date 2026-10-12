// Blocks cross-site writes to the API.
//
// Browsers are inconsistent about the `Origin` header on same-origin POSTs: Chrome and Firefox
// omit it entirely for a same-origin fetch/XHR and send `Sec-Fetch-Site: same-origin` instead.
// Rejecting every request with no `Origin` therefore refused the storefront's own sign-in,
// checkout, and admin saves. The rules below keep the protection while accepting those requests.
//
// Order of checks:
//   1. `Origin` present      -> it must match the request host/protocol, or FRONTEND_ORIGIN.
//   2. `Origin` absent       -> accept only when another browser-set signal proves same-origin:
//        - `Sec-Fetch-Site: same-origin` (or `none` for a direct navigation), or
//        - a `Referer` whose host and protocol match the request.
//   Anything else is rejected.
//
// A cross-site attacker cannot pass these: a cross-origin POST always carries the attacker's
// `Origin`, and its `Sec-Fetch-Site` is `cross-site` with its own `Referer`. `Sec-Fetch-*` and
// `Referer` cannot be set from JavaScript, so neither can be forged by a page.

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function hostMatches(reference, request) {
  if (!reference) return false;
  try {
    const url = new URL(reference);
    const requestHost = String(request.get('host') || '').toLowerCase();
    return url.host.toLowerCase() === requestHost && url.protocol === `${request.protocol}:`;
  } catch {
    return false;
  }
}

function requireSameOriginForMutations(request, response, next) {
  if (!MUTATING_METHODS.has(request.method)) return next();

  const origin = request.get('origin');
  const requestHost = String(request.get('host') || '').toLowerCase();
  const requestProtocol = request.protocol;

  if (origin) {
    let originUrl;
    try {
      originUrl = new URL(origin);
    } catch {
      return response.status(403).json({ error: 'Request origin is not valid.' });
    }

    const sameRequestOrigin = hostMatches(origin, request);
    let configuredOrigin = false;
    if (process.env.FRONTEND_ORIGIN) {
      try {
        configuredOrigin = originUrl.origin === new URL(process.env.FRONTEND_ORIGIN).origin;
      } catch {
        configuredOrigin = false;
      }
    }

    if (!sameRequestOrigin && !configuredOrigin) {
      return response.status(403).json({ error: 'Cross-origin requests are not allowed.' });
    }

    return next();
  }

  // No Origin header. Chrome and Firefox omit it for same-origin requests, so fall back to the
  // signals a browser still sets and that page scripts cannot spoof.
  const fetchSite = String(request.get('sec-fetch-site') || '').toLowerCase();
  if (fetchSite === 'same-origin' || fetchSite === 'none') return next();

  if (hostMatches(request.get('referer'), request)) return next();

  return response.status(403).json({
    error: 'This request needs a same-origin browser session.',
  });
}

module.exports = { requireSameOriginForMutations };
