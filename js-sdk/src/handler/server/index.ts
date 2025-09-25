import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpHandler as baseCreateMcpHandler } from "mcp-handler";

type InnerServerOptions = NonNullable<Parameters<typeof baseCreateMcpHandler>[1]>;
type Config = NonNullable<Parameters<typeof baseCreateMcpHandler>[2]>;

// --- Plugin primitives ------------------------------------------------------

/** A plugin takes a server and returns an augmented server type. */
export type ServerPlugin<
  S extends McpServer = McpServer,
  R extends McpServer = S
> = (server: S) => R;

/** Apply a tuple of plugins to a server type (left-to-right) for typing. */
export type ApplyPlugins<
  S extends McpServer,
  W extends readonly ServerPlugin[]
> =
  W extends readonly []
    ? S
    : W extends readonly [infer F, ...infer R]
      ? F extends ServerPlugin<infer _In, infer Out>
        ? ApplyPlugins<Out, Extract<R, readonly ServerPlugin[]>>
        : S
      : S;

/** Preserve tuple info so TS can infer exact augmented type. */
export function makePlugins<W extends readonly ServerPlugin[]>(
  ...plugins: W
): W {
  return plugins;
}

/** Compose to a single plugin (right-to-left) if you like function style. */
export function composePlugins<W extends readonly ServerPlugin[]>(
  ...plugins: W
) {
  return <S extends McpServer>(server: S): ApplyPlugins<S, W> => {
    let result: unknown = server;
    for (let i = plugins.length - 1; i >= 0; i--) {
      result = plugins[i]?.(result as McpServer);
    }
    return result as ApplyPlugins<S, W>;
  };
}

// --- Public API: create handler that knows about plugins --------------------

export type ServerOptions<W extends readonly ServerPlugin[] = []> =
  InnerServerOptions & {
    /** Dynamically augment the McpServer instance with your plugins. */
    plugins?: W;
  };

/**
 * createMcpHandlerWithPlugins
 * Wraps your existing handler to:
 *  - apply plugins at runtime (mutating/augmenting the same server instance)
 *  - thread plugin types to the `initializeServer` callback (no casts needed)
 */
export default function createMcpHandler<
  W extends readonly ServerPlugin[] = []
>(
  initializeServer:
    | ((server: ApplyPlugins<McpServer, W>) => Promise<void>)
    | ((server: ApplyPlugins<McpServer, W>) => void),
  serverOptions?: ServerOptions<W>,
  config?: Config
): (request: Request) => Promise<Response> {
    
  return baseCreateMcpHandler(
    async (server: McpServer) => {
      // Apply plugins in-place (support plugins that return same instance or a new one)
      const ws = (serverOptions?.plugins ?? []) as readonly ServerPlugin[];
      let augmented: McpServer = server;
      for (const w of ws) {
        const out = w(augmented as unknown as McpServer);
        // If plugin returns a new object, keep it; otherwise keep the original.
        augmented = (out ?? augmented) as McpServer;
      }

      // Call the user's initializer with the *augmented* type
      await (initializeServer as (s: ApplyPlugins<McpServer, W>) => unknown)(
        augmented as ApplyPlugins<McpServer, W>
      );
    },
    // Pass through options and config unchanged
    serverOptions as InnerServerOptions,
    config
  );
}
