import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import {
    StreamableHTTPServerTransport,
    type StreamableHTTPServerTransportOptions,
} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
    type CallToolRequest,
    type JSONRPCRequest
} from '@modelcontextprotocol/sdk/types.js';
import type { IncomingMessage, ServerResponse } from 'http';
import type { OutgoingHttpHeader, OutgoingHttpHeaders } from 'node:http';
import { type Address, getAddress } from 'viem';
import {
    type FacilitatorConfig,
    type Network,
    type PaymentPayload,
    type Price,
    settleResponseHeader,
    SupportedEVMNetworks
} from 'x402/types';
import {
    buildPaymentRequirementsForTool,
    decodePaymentHeaderOrThrow,
    decorateJsonRpcWithSettlement,
    settlePaymentForSelected,
    verifyPaymentForTool,
} from '../x402/x402-common.js';

interface X402TransportOptions {
  payTo: Partial<Record<Network, Address | string>>;
  facilitator?: FacilitatorConfig;
  toolPricing?: Record<string, string>;
  networks?: Partial<Network[]>;
}

interface ToolCallParams {
  name: string;
  arguments?: CallToolRequest['params']['arguments'];
}

export class X402StreamableHTTPServerTransport extends StreamableHTTPServerTransport {
  private payTo: Partial<Record<Network, Address | string>>;
  private networks: Partial<Network[]>;
  private facilitator?: FacilitatorConfig;
  private toolPricing: Record<string, Price>;

  constructor(options: X402TransportOptions & StreamableHTTPServerTransportOptions) {
    // Pass through the base transport options, defaulting enableJsonResponse to true
    super({
      ...options,
      enableJsonResponse: options.enableJsonResponse ?? true, // Default to JSON responses
    });

    // Normalize payTo addresses (strings -> checksum addresses for EVM)
    const normalizedPayTo: Partial<Record<Network, Address | string>> = {};
    for (const [network, address] of Object.entries(options.payTo)) {
      if (typeof address === 'string' && SupportedEVMNetworks.includes(network as Network)) {
        normalizedPayTo[network as Network] = getAddress(address);
      } else {
        normalizedPayTo[network as Network] = address;
      }
    }


    this.payTo = normalizedPayTo;
    this.facilitator = options.facilitator || { url: "https://facilitator.payai.network"}
    this.toolPricing = options.toolPricing || {};
    this.networks = options.networks || (Object.keys(options.payTo) as Partial<Network[]>) || ['base-sepolia'];

  }

  // No need to delegate - we inherit these from the parent class

  override async handleRequest(
    req: IncomingMessage & { auth?: AuthInfo },
    res: ServerResponse,
    parsedBody?: unknown
  ): Promise<void> {

    // Log response lifecycle events
    res.once('finish', () => {
      
    });
    res.once('close', () => {
      
    });

    // Only intercept POST requests to the MCP endpoint
    if (req.method !== 'POST' || !parsedBody) {
      return super.handleRequest(req, res, parsedBody);
    }

    // Check if this is a tool call that requires payment
    const messages = Array.isArray(parsedBody) ? parsedBody : [parsedBody];
    const toolCall = messages.find(
      (msg): msg is JSONRPCRequest & { params: ToolCallParams } =>
        msg.method === 'tools/call' &&
        msg.params &&
        typeof msg.params === 'object' &&
        'name' in msg.params &&
        typeof msg.params.name === 'string' &&
        this.toolPricing[msg.params.name] !== undefined
    );

    if (!toolCall) {
      
      return super.handleRequest(req, res, parsedBody);
    }

    const toolName = toolCall.params.name;
    const toolPrice = this.toolPricing[toolName];
    

    // Check for X-PAYMENT header
    const paymentHeader = req.headers['x-payment'];
    if (!paymentHeader || Array.isArray(paymentHeader)) {
      
      res.writeHead(402).end(
        JSON.stringify({
          x402Version: 1,
          error: 'X-PAYMENT header is required',
          accepts: await buildPaymentRequirementsForTool({
            toolName,
            price: toolPrice as Price,
            payTo: this.payTo,
            facilitator: this.facilitator,
            networks: this.networks as unknown as Network[],
            resourcePrefix: 'mcp',
          }),
        })
      );
      return;
    }

    // Decode and verify payment
    let decodedPayment: PaymentPayload;
    try {
      decodedPayment = decodePaymentHeaderOrThrow(paymentHeader);
    } catch (error) {
      
      res.writeHead(402).end(
        JSON.stringify({
          x402Version: 1,
          error: 'Invalid payment header',
          accepts: await buildPaymentRequirementsForTool({
            toolName,
            price: toolPrice as Price,
            payTo: this.payTo,
            facilitator: this.facilitator,
            networks: this.networks as unknown as Network[],
            resourcePrefix: 'mcp',
          }),
        })
      );
      return;
    }

    // Verify payment at HTTP level
    
    try {
      const verification = await verifyPaymentForTool({
        toolName,
        price: toolPrice as Price,
        payTo: this.payTo,
        facilitator: this.facilitator,
        payment: decodedPayment,
        networks: this.networks as unknown as Network[],
        resourcePrefix: 'mcp',
      });

      if (!verification.isValid) {
        
        res.writeHead(402).end(
          JSON.stringify({
            x402Version: 1,
            error: verification.invalidReason || 'Payment verification failed',
            accepts: verification.accepts,
          })
        );
        return;
      }

      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      res.writeHead(402).end(
        JSON.stringify({
          x402Version: 1,
          error: errorMessage,
          accepts: await buildPaymentRequirementsForTool({
            toolName,
            price: toolPrice as Price,
            payTo: this.payTo,
            facilitator: this.facilitator,
            networks: this.networks as unknown as Network[],
            resourcePrefix: 'mcp',
          }),
        })
      );
      return;
    }

    // At this point the payment is verified. We'll capture the outgoing body,
    // settle post-execution, decorate the JSON, and set header — no class state.
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    const originalWriteHead = res.writeHead.bind(res);

    let capturedStatus: number | undefined;
    let capturedHeaders: OutgoingHttpHeaders | undefined;
    const chunks: Buffer[] = [];

    function toBuffer(data: unknown, encoding?: BufferEncoding): Buffer {
      if (data == null) return Buffer.alloc(0);
      if (typeof data === 'string') return Buffer.from(data, encoding ?? 'utf8');
      if (data instanceof Uint8Array) return Buffer.from(data);
      try {
        return Buffer.from(String(data), 'utf8');
      } catch {
        return Buffer.alloc(0);
      }
    }

    res.writeHead = ((statusCode: number, headers?: OutgoingHttpHeaders | OutgoingHttpHeader[] | undefined) => {
      capturedStatus = statusCode;
      if (headers && !Array.isArray(headers)) {
        capturedHeaders = { ...headers };
      }
      // Defer actual header write until end
      return res;
    }) as typeof res.writeHead;

    res.write = ((chunk: unknown, encoding?: BufferEncoding, cb?: (error?: Error) => void) => {
      chunks.push(toBuffer(chunk, encoding));
      if (cb) cb();
      return true;
    }) as typeof res.write;

    res.end = ((chunk?: unknown, encoding?: BufferEncoding, cb?: () => void) => {
      if (chunk) chunks.push(toBuffer(chunk, encoding));
      const text = Buffer.concat(chunks).toString('utf8');

      let newText = text;
      const headers: OutgoingHttpHeaders = { ...(capturedHeaders ?? {}) };

      void (async () => {
        try {
          const verification = await verifyPaymentForTool({
            toolName,
            price: toolPrice as Price,
            payTo: this.payTo,
            facilitator: this.facilitator,
            payment: decodedPayment,
            networks: this.networks as unknown as Network[],
            resourcePrefix: 'mcp',
          });

          if (verification.isValid && verification.selectedRequirements) {
            const settleResponse = await settlePaymentForSelected({
              payment: decodedPayment,
              selectedRequirements: verification.selectedRequirements,
              facilitator: this.facilitator,
            });

            newText = decorateJsonRpcWithSettlement(text, settleResponse);
            headers['X-PAYMENT-RESPONSE'] = settleResponseHeader(settleResponse);
          }
        } catch {
          // Settlement failed — return original body/headers
        }

        // Ensure content-type
        const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
        if (!('content-type' in lower)) {
          headers['content-type'] = 'application/json';
        }

        originalWriteHead(capturedStatus ?? res.statusCode ?? 200, headers);
        originalWrite(Buffer.from(newText, 'utf8'));
        originalEnd();
        if (cb) cb();
      })();

      return res;
    }) as typeof res.end;

    // Delegate to parent class (response will be buffered)
    return super.handleRequest(req, res, parsedBody);
  }

  // getPaymentRequirementsForTool: moved to shared util (buildPaymentRequirementsForTool)
}

/**
 * Creates a payment-aware MCP server transport that requires X402 payments for specified tools
 * @param payTo - The wallet address to receive payments
 * @param toolPricing - Mapping of tool names to prices (e.g., { "my-tool": "$0.01" })
 * @param options - Optional configuration
 * @returns X402StreamableHTTPServerTransport configured with payment requirements
 */
export function makePaymentAwareServerTransport(
  payTo: Partial<Record<Network, Address | string>>,
  toolPricing: Record<string, string>,
  options?: Partial<StreamableHTTPServerTransportOptions> & {
    facilitator?: FacilitatorConfig;
  }
): X402StreamableHTTPServerTransport {
  const keys = Object.keys(payTo) as Network[];
  const networks = keys.length ? keys : (['base-sepolia'] as Network[]);

  return new X402StreamableHTTPServerTransport({
    payTo,
    networks,
    toolPricing,
    facilitator: options?.facilitator,
    sessionIdGenerator: options?.sessionIdGenerator,
    enableJsonResponse: options?.enableJsonResponse,
  });
}
