import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import createMcpHandlerWithPlugins, { makePlugins, type ServerOptions as BaseServerOptions } from "../index.js";
import { withX402 } from "../plugins/with-x402.js";
import type { X402AugmentedServer, X402Config } from "../plugins/with-x402.js";

type HandlerConfig = Parameters<typeof createMcpHandlerWithPlugins>[2];
export type PaidServerOptions = Omit<BaseServerOptions, "plugins">;
export type PaidServerInitialize = (
  server: McpServer & X402AugmentedServer
) => Promise<void> | void;

/**
 * createPaidServer
 * Creates a Request handler for an MCP server augmented with X402 paid tools.
 * You provide your server initializer and the X402 configuration; this wires
 * the `withX402` plugin automatically.
 */
export function createMcpPaidHandler(
  initializeServer: PaidServerInitialize,
  x402: X402Config,
  serverOptions?: PaidServerOptions,
  config?: HandlerConfig
): (request: Request) => Promise<Response> {
  const plugins = makePlugins((server: McpServer) => withX402(server, x402));

  return createMcpHandlerWithPlugins(
    initializeServer as (server: McpServer & X402AugmentedServer) => unknown,
    { ...(serverOptions as object), plugins } as BaseServerOptions<typeof plugins>,
    config
  );
}

export type { X402Config, X402AugmentedServer, RecipientWithTestnet } from "../plugins/with-x402.js";



