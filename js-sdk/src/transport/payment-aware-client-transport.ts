import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { wrapFetchWithPayment } from 'x402-fetch';
import type { MultiNetworkSigner } from 'x402/types';
/**
 * Converts various header formats to a plain object.
 *
 * This is a workaround for a bug in x402-fetch where Headers objects are not
 * properly preserved during 402 payment retries. The library uses the spread
 * operator on headers (...init.headers), which doesn't work correctly with
 * Headers objects - it spreads the object's methods instead of the actual
 * header key-value pairs.
 *
 * Without this conversion, critical headers like 'Accept: application/json, text/event-stream'
 * (required by MCP) are lost during the payment retry, causing 406 Not Acceptable errors.
 *
 * Fix submitted: https://github.com/coinbase/x402/pull/314
 *
 * This function handles three possible input formats:
 * - Headers instance (from the Fetch API)
 * - Array of tuples ([key, value][])
 * - Plain object (Record<string, string>)
 *
 * @param headers - The headers in any of the supported formats
 * @returns A plain object with header key-value pairs that can be safely spread
 */
export function convertHeaders(headers?: HeadersInit): Record<string, string> {
  const headersObject: Record<string, string> = {};

  if (!headers) {
    return headersObject;
  }

  if (headers instanceof Headers) {
    // Headers object from Fetch API
    headers.forEach((value, key) => {
      headersObject[key] = value;
    });
  } else if (Array.isArray(headers)) {
    // Array of tuples format: [["Content-Type", "application/json"], ...]
    headers.forEach(([key, value]) => {
      headersObject[key] = value;
    });
  } else {
    // Plain object format: { "Content-Type": "application/json", ... }
    Object.assign(headersObject, headers);
  }

  return headersObject;
}

/**
 * Creates a payment-aware MCP client transport that automatically handles X402 payments
 * @param serverUrl - The MCP server URL
 * @param wallet - A viem WalletClient configured with account and chain
 * @param paymentCallback
 * @returns StreamableHTTPClientTransport configured with X402 payment capabilities
 */
export function makePaymentAwareClientTransport(
  serverUrl: string | URL,
  wallet: Partial<MultiNetworkSigner>,
  paymentCallback: (txHash: string) => void = () => {}
): StreamableHTTPClientTransport {

  const signer = { evm: wallet.evm, svm: wallet.svm } as MultiNetworkSigner;

  // Create x402-enabled fetch
  const x402Fetch = wrapFetchWithPayment(fetch, signer);

  // Create a wrapper that ensures proper headers for MCP
  const fetchWithPayment = async (input: RequestInfo, init: RequestInit) => {
    // WORKAROUND: x402-fetch has a bug where it doesn't properly preserve Headers objects
    // when retrying requests after 402 responses. The spread operator ...init.headers
    // doesn't work with Headers objects - it spreads methods instead of key-value pairs.
    // This causes critical headers like 'Accept: application/json, text/event-stream' to be lost.
    // See: x402-fetch/src/index.ts line ~41: ...init.headers || {}
    // This workaround converts Headers to a plain object to ensure headers are preserved.
    // Fix submitted: https://github.com/coinbase/x402/pull/314
    const headers = {
      ...convertHeaders(init?.headers),
      // MCP's StreamableHTTPClientTransport already sets this, but we ensure it's present
      Accept: 'application/json, text/event-stream',
    };

    const response = await x402Fetch(input, {
      ...init,
      headers,
    });

    // Log payment information if available
    const paymentResponse = response.headers.get('X-PAYMENT-RESPONSE');
    
    if (paymentResponse) {
      try {
        const decoded = JSON.parse(atob(paymentResponse));
        if (decoded.txHash) {
          paymentCallback(decoded.txHash);
        }
      } catch (e) {
        // do nothing
      }
    }

    return response;
  };

  // Create and return transport with x402-enabled fetch
  return new StreamableHTTPClientTransport(new URL(serverUrl), {
    fetch: fetchWithPayment as typeof fetch,
  });
}
