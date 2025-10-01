import createMcpHandler from "./handler/server";

export { createMcpPaidHandler } from "./handler/server/templates/x402-server";
export { withX402 } from "./handler/server/plugins/with-x402";
export { makePlugins, composePlugins } from "./handler/server";
export { createMcpHandler };

export { withProxy } from "./handler/proxy";
export { Hook } from "./handler/proxy/hooks";
export { LoggingHook } from "./handler/proxy/hooks/logging-hook";
export { AuthHeadersHook } from "./handler/proxy/hooks/auth-headers-hook";
export { X402MonetizationHook } from "./handler/proxy/hooks/x402-hook";
