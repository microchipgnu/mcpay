// Headers that must NOT be forwarded (RFC‑7230 §6.1 + platform-specific)
const HOP_BY_HOP = new Set([
    'proxy-authenticate', 'proxy-authorization',
    'te', 'trailer', 'transfer-encoding', 'upgrade', 'cookie',
    'authorization',
    'forwarded',
    'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-port', 'x-forwarded-proto',
    'x-real-ip',
    'x-matched-path',
    'x-vercel-deployment-url', 'x-vercel-forwarded-for', 'x-vercel-id',
    'x-vercel-internal-bot-check', 'x-vercel-internal-ingress-bucket', 'x-vercel-internal-ingress-port',
    'x-vercel-ip-as-number', 'x-vercel-ip-city', 'x-vercel-ip-continent', 'x-vercel-ip-country',
    'x-vercel-ip-country-region', 'x-vercel-ip-latitude', 'x-vercel-ip-longitude',
    'x-vercel-ip-postal-code', 'x-vercel-ip-timezone',
    'x-vercel-ja4-digest', 'x-vercel-oidc-token', 'x-vercel-proxied-for',
    'x-vercel-proxy-signature', 'x-vercel-proxy-signature-ts',
    'x-vercel-sc-basepath', 'x-vercel-sc-headers', 'x-vercel-sc-host',
]);

// Header prefixes that should not be forwarded
const BLOCKED_HEADER_PREFIXES = [
    'x-vercel-',
    'cf-',
    'x-forwarded-',
];

function shouldBlockHeader(headerName: string): boolean {
    const lowerName = headerName.toLowerCase();
    if (HOP_BY_HOP.has(lowerName)) return true;
    return BLOCKED_HEADER_PREFIXES.some(prefix => lowerName.startsWith(prefix));
}

export function filterIncomingHeaders(incoming: Headers): Headers {
    const headers = new Headers();
    incoming.forEach((value, key) => {
        if (!shouldBlockHeader(key)) {
            headers.set(key, value);
        }
    });
    return headers;
}


