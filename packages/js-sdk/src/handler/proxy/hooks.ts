// Enhanced MCP hook types and interfaces supporting full MCP surface
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  type CallToolRequest,
  CallToolRequestSchema,
  type CallToolResult,
  CallToolResultSchema,
  type InitializeRequest,
  InitializeRequestSchema,
  type InitializeResult,
  InitializeResultSchema,
  type ListPromptsRequest,
  ListPromptsRequestSchema,
  type ListPromptsResult,
  ListPromptsResultSchema,
  type ListResourceTemplatesRequest,
  ListResourceTemplatesRequestSchema,
  type ListResourceTemplatesResult,
  ListResourceTemplatesResultSchema,
  type ListResourcesRequest,
  ListResourcesRequestSchema,
  type ListResourcesResult,
  ListResourcesResultSchema,
  type ListToolsRequest,
  ListToolsRequestSchema,
  type ListToolsResult,
  ListToolsResultSchema,
  type Notification,
  NotificationSchema,
  type ReadResourceRequest,
  ReadResourceRequestSchema,
  type ReadResourceResult,
  ReadResourceResultSchema,
  type Request,
  type RequestId,
  type RequestInfo,
  type RequestMeta,
  RequestSchema,
  type Result,
  ResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Re-export MCP types for convenience
export type {
  CallToolRequest,
  CallToolResult,
  InitializeRequest,
  InitializeResult,
  ListPromptsRequest,
  ListPromptsResult,
  ListResourcesRequest,
  ListResourcesResult,
  ListResourceTemplatesRequest,
  ListResourceTemplatesResult,
  ListToolsRequest,
  ListToolsResult,
  Notification,
  ReadResourceRequest,
  ReadResourceResult,
  Request,
  Result,
};

// Request context for hooks to inspect and modify HTTP request details
export const RequestContextSchemaRaw = {
  headers: z.record(z.string()).optional(),
  host: z.string().optional(),
  path: z.string().optional(),
};

export const RequestContextSchema = z.object(RequestContextSchemaRaw);
export type RequestContext = z.infer<typeof RequestContextSchema>;

// Extend request schemas with optional requestContext
export const CallToolRequestSchemaWithContext = CallToolRequestSchema.extend({
  requestContext: RequestContextSchema.optional(),
});
export const ListPromptsRequestSchemaWithContext =
  ListPromptsRequestSchema.extend({
    requestContext: RequestContextSchema.optional(),
  });
export const ListToolsRequestSchemaWithContext = ListToolsRequestSchema.extend({
  requestContext: RequestContextSchema.optional(),
});
export const InitializeRequestSchemaWithContext = InitializeRequestSchema.extend({
  requestContext: RequestContextSchema.optional(),
});
export const ListResourcesRequestSchemaWithContext =
  ListResourcesRequestSchema.extend({
    requestContext: RequestContextSchema.optional(),
  });
export const ListResourceTemplatesRequestSchemaWithContext =
  ListResourceTemplatesRequestSchema.extend({
    requestContext: RequestContextSchema.optional(),
  });
export const ReadResourceRequestSchemaWithContext = ReadResourceRequestSchema.extend({
  requestContext: RequestContextSchema.optional(),
});

// Extended request types that include request context for hooks
export type CallToolRequestWithContext = CallToolRequest & {
  requestContext?: RequestContext;
};
export type ListPromptsRequestWithContext = ListPromptsRequest & {
  requestContext?: RequestContext;
};
export type ListToolsRequestWithContext = ListToolsRequest & {
  requestContext?: RequestContext;
};
export type InitializeRequestWithContext = InitializeRequest & {
  requestContext?: RequestContext;
};
export type ListResourcesRequestWithContext = ListResourcesRequest & {
  requestContext?: RequestContext;
};
export type ListResourceTemplatesRequestWithContext =
  ListResourceTemplatesRequest & {
    requestContext?: RequestContext;
  };
export type ReadResourceRequestWithContext = ReadResourceRequest & {
  requestContext?: RequestContext;
};

// Generic error type for protocol-level errors (akin to McpError)
export const HookChainErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.unknown().optional(),
});
export type HookChainError = z.infer<typeof HookChainErrorSchema>;

// Hook result schemas
export const CallToolRequestHookResultSchema = z.discriminatedUnion(
  "resultType",
  [
    z.object({ resultType: z.literal("continue"), request: CallToolRequestSchemaWithContext }),
    z.object({ resultType: z.literal("respond"), response: CallToolResultSchema }),
  ],
);
export const CallToolResponseHookResultSchema = z.discriminatedUnion(
  "resultType",
  [
    z.object({ resultType: z.literal("continue"), response: CallToolResultSchema }),
    z.object({ resultType: z.literal("retry"), request: CallToolRequestSchemaWithContext }),
    z.object({ resultType: z.literal("abort"), reason: z.string(), body: z.unknown().optional() }),
  ],
);
export const CallToolErrorHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue") }),
  z.object({ resultType: z.literal("respond"), response: CallToolResultSchema }),
]);

export const ListPromptsErrorHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue") }),
  z.object({ resultType: z.literal("respond"), response: ListPromptsResultSchema }),
]);
export const ListToolsErrorHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue") }),
  z.object({ resultType: z.literal("respond"), response: ListToolsResultSchema }),
]);
export const InitializeErrorHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue") }),
  z.object({ resultType: z.literal("respond"), response: InitializeResultSchema }),
]);
export const OtherErrorHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue") }),
  z.object({ resultType: z.literal("respond"), response: ResultSchema }),
]);
export const TargetErrorHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue") }),
  z.object({ resultType: z.literal("respond"), response: ResultSchema }),
]);
export const NotificationErrorHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue") }),
]);
export const TargetNotificationErrorHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue") }),
]);

export const ListResourcesRequestHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue"), request: ListResourcesRequestSchemaWithContext }),
  z.object({ resultType: z.literal("respond"), response: ListResourcesResultSchema }),
]);
export const ListResourcesResponseHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue"), response: ListResourcesResultSchema }),
]);
export const ListResourcesErrorHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue") }),
  z.object({ resultType: z.literal("respond"), response: ListResourcesResultSchema }),
]);

export const ListResourceTemplatesRequestHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue"), request: ListResourceTemplatesRequestSchemaWithContext }),
  z.object({ resultType: z.literal("respond"), response: ListResourceTemplatesResultSchema }),
]);
export const ListResourceTemplatesResponseHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue"), response: ListResourceTemplatesResultSchema }),
]);
export const ListResourceTemplatesErrorHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue") }),
  z.object({ resultType: z.literal("respond"), response: ListResourceTemplatesResultSchema }),
]);

export const ReadResourceRequestHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue"), request: ReadResourceRequestSchemaWithContext }),
  z.object({ resultType: z.literal("respond"), response: ReadResourceResultSchema }),
]);
export const ReadResourceResponseHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue"), response: ReadResourceResultSchema }),
]);
export const ReadResourceErrorHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue") }),
  z.object({ resultType: z.literal("respond"), response: ReadResourceResultSchema }),
]);

export const ListPromptsRequestHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue"), request: ListPromptsRequestSchemaWithContext }),
  z.object({ resultType: z.literal("respond"), response: ListPromptsResultSchema }),
]);
export const ListToolsRequestHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue"), request: ListToolsRequestSchemaWithContext }),
  z.object({ resultType: z.literal("respond"), response: ListToolsResultSchema }),
]);
export const ListPromptsResponseHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue"), response: ListPromptsResultSchema }),
]);
export const ListToolsResponseHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue"), response: ListToolsResultSchema }),
]);

export const InitializeRequestHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue"), request: InitializeRequestSchemaWithContext }),
  z.object({ resultType: z.literal("respond"), response: InitializeResultSchema }),
]);
export const InitializeResponseHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue"), response: InitializeResultSchema }),
]);

export const RequestHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue"), request: RequestSchema }),
  z.object({ resultType: z.literal("respond"), response: ResultSchema }),
]);
export const ResponseHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue"), response: ResultSchema }),
]);
export const NotificationHookResultSchema = z.discriminatedUnion("resultType", [
  z.object({ resultType: z.literal("continue"), notification: NotificationSchema }),
]);

// Result types
export type CallToolRequestHookResult =
  | z.infer<typeof CallToolRequestHookResultSchema>
  | {
      resultType: "continueAsync";
      request: CallToolRequestWithContext;
      response: CallToolResult;
      callback: (
        response: CallToolResult | null,
        error: HookChainError | null,
      ) => Promise<void>;
    };
export type CallToolResponseHookResult = z.infer<
  typeof CallToolResponseHookResultSchema
>;
export type CallToolErrorHookResult = z.infer<
  typeof CallToolErrorHookResultSchema
>;
export type ListPromptsErrorHookResult = z.infer<
  typeof ListPromptsErrorHookResultSchema
>;
export type ListToolsErrorHookResult = z.infer<
  typeof ListToolsErrorHookResultSchema
>;
export type InitializeErrorHookResult = z.infer<
  typeof InitializeErrorHookResultSchema
>;
export type OtherErrorHookResult = z.infer<typeof OtherErrorHookResultSchema>;
export type TargetErrorHookResult = z.infer<typeof TargetErrorHookResultSchema>;
export type NotificationErrorHookResult = z.infer<
  typeof NotificationErrorHookResultSchema
>;
export type TargetNotificationErrorHookResult = z.infer<
  typeof TargetNotificationErrorHookResultSchema
>;
export type ListPromptsRequestHookResult =
  | z.infer<typeof ListPromptsRequestHookResultSchema>
  | {
      resultType: "continueAsync";
      request: ListPromptsRequestWithContext;
      response: ListPromptsResult;
      callback: (
        response: ListPromptsResult | null,
        error: HookChainError | null,
      ) => Promise<void>;
    };
export type ListPromptsResponseHookResult = z.infer<
  typeof ListPromptsResponseHookResultSchema
>;
export type ListToolsRequestHookResult =
  | z.infer<typeof ListToolsRequestHookResultSchema>
  | {
      resultType: "continueAsync";
      request: ListToolsRequestWithContext;
      response: ListToolsResult;
      callback: (
        response: ListToolsResult | null,
        error: HookChainError | null,
      ) => Promise<void>;
    };
export type ListToolsResponseHookResult = z.infer<
  typeof ListToolsResponseHookResultSchema
>;
export type InitializeRequestHookResult =
  | z.infer<typeof InitializeRequestHookResultSchema>
  | {
      resultType: "continueAsync";
      request: InitializeRequestWithContext;
      response: InitializeResult;
      callback: (
        response: InitializeResult | null,
        error: HookChainError | null,
      ) => Promise<void>;
    };
export type InitializeResponseHookResult = z.infer<
  typeof InitializeResponseHookResultSchema
>;
export type RequestHookResult =
  | z.infer<typeof RequestHookResultSchema>
  | {
      resultType: "continueAsync";
      request: Request;
      response: Result;
      callback: (
        response: Result | null,
        error: HookChainError | null,
      ) => Promise<void>;
    };
export type ResponseHookResult = z.infer<typeof ResponseHookResultSchema>;
export type NotificationHookResult = z.infer<
  typeof NotificationHookResultSchema
>;
export type ListResourcesRequestHookResult =
  | z.infer<typeof ListResourcesRequestHookResultSchema>
  | {
      resultType: "continueAsync";
      request: ListResourcesRequestWithContext;
      response: ListResourcesResult;
      callback: (
        response: ListResourcesResult | null,
        error: HookChainError | null,
      ) => Promise<void>;
    };
export type ListResourcesResponseHookResult = z.infer<
  typeof ListResourcesResponseHookResultSchema
>;
export type ListResourcesErrorHookResult = z.infer<
  typeof ListResourcesErrorHookResultSchema
>;
export type ListResourceTemplatesRequestHookResult =
  | z.infer<typeof ListResourceTemplatesRequestHookResultSchema>
  | {
      resultType: "continueAsync";
      request: ListResourceTemplatesRequestWithContext;
      response: ListResourceTemplatesResult;
      callback: (
        response: ListResourceTemplatesResult | null,
        error: HookChainError | null,
      ) => Promise<void>;
    };
export type ListResourceTemplatesResponseHookResult = z.infer<
  typeof ListResourceTemplatesResponseHookResultSchema
>;
export type ListResourceTemplatesErrorHookResult = z.infer<
  typeof ListResourceTemplatesErrorHookResultSchema
>;
export type ReadResourceRequestHookResult =
  | z.infer<typeof ReadResourceRequestHookResultSchema>
  | {
      resultType: "continueAsync";
      request: ReadResourceRequestWithContext;
      response: ReadResourceResult;
      callback: (
        response: ReadResourceResult | null,
        error: HookChainError | null,
      ) => Promise<void>;
    };
export type ReadResourceResponseHookResult = z.infer<
  typeof ReadResourceResponseHookResultSchema
>;
export type ReadResourceErrorHookResult = z.infer<
  typeof ReadResourceErrorHookResultSchema
>;

// Backwards compatibility aliases (older imports used ToolCall* names)
export type ToolCallRequestHookResult = CallToolRequestHookResult;
export type ToolCallResponseHookResult = CallToolResponseHookResult;
export type ToolCallErrorHookResult = CallToolErrorHookResult;

// Extra data provided to request handlers in hooks.
// Merge MCP SDK fields with proxy-specific metadata for compatibility
export type RequestExtra = {
  // Transport/session fields
    sessionId?: string;
  requestId: RequestId;
  authInfo?: AuthInfo;
  _meta?: RequestMeta;
  requestInfo?: RequestInfo;
  // Proxy-specific context
    originalUrl?: string;
    targetUrl?: string;
    inboundHeaders?: Headers;
    serverId?: string | null;
};

// Hook interface that all hooks may implement
export interface Hook {
    name: string;

  // tools/call
    processCallToolRequest?(
    request: CallToolRequestWithContext,
    requestExtra: RequestExtra,
  ): Promise<CallToolRequestHookResult>;
    processCallToolResult?(
    result: CallToolResult,
    originalCallToolRequest: CallToolRequestWithContext,
    originalRequestExtra: RequestExtra,
  ): Promise<CallToolResponseHookResult>;
  processCallToolError?(
    error: HookChainError,
    originalToolCall: CallToolRequestWithContext,
    originalRequestExtra: RequestExtra,
  ): Promise<CallToolErrorHookResult>;

  // prompts/list
  processListPromptsRequest?(
    request: ListPromptsRequestWithContext,
    requestExtra: RequestExtra,
  ): Promise<ListPromptsRequestHookResult>;
  processListPromptsResult?(
    result: ListPromptsResult,
    originalListPromptsRequest: ListPromptsRequestWithContext,
    originalRequestExtra: RequestExtra,
  ): Promise<ListPromptsResponseHookResult>;
  processListPromptsError?(
    error: HookChainError,
    originalRequest: ListPromptsRequestWithContext,
    originalRequestExtra: RequestExtra,
  ): Promise<ListPromptsErrorHookResult>;

  // tools/list
  processListToolsRequest?(
    request: ListToolsRequestWithContext,
    requestExtra: RequestExtra,
  ): Promise<ListToolsRequestHookResult>;
  processListToolsResult?(
    result: ListToolsResult,
    originalListToolsRequest: ListToolsRequestWithContext,
    originalRequestExtra: RequestExtra,
  ): Promise<ListToolsResponseHookResult>;
  processListToolsError?(
    error: HookChainError,
    originalRequest: ListToolsRequestWithContext,
    originalRequestExtra: RequestExtra,
  ): Promise<ListToolsErrorHookResult>;

  // initialize
  processInitializeRequest?(
    request: InitializeRequestWithContext,
    requestExtra: RequestExtra,
  ): Promise<InitializeRequestHookResult>;
  processInitializeResult?(
    result: InitializeResult,
    originalInitializeRequest: InitializeRequestWithContext,
    originalRequestExtra: RequestExtra,
  ): Promise<InitializeResponseHookResult>;
  processInitializeError?(
    error: HookChainError,
    originalRequest: InitializeRequestWithContext,
    originalRequestExtra: RequestExtra,
  ): Promise<InitializeErrorHookResult>;

  // generic
  processOtherRequest?(
    request: Request,
    requestExtra: RequestExtra,
  ): Promise<RequestHookResult>;
  processOtherResult?(
    result: Result,
    originalRequest: Request,
    originalRequestExtra: RequestExtra,
  ): Promise<ResponseHookResult>;
  processOtherError?(
    error: HookChainError,
    originalRequest: Request,
    originalRequestExtra: RequestExtra,
  ): Promise<OtherErrorHookResult>;

  // target-side (reverse direction)
  processTargetRequest?(
    request: Request,
    requestExtra: RequestExtra,
  ): Promise<RequestHookResult>;
  processTargetResult?(
    result: Result,
    originalRequest: Request,
    originalRequestExtra: RequestExtra,
  ): Promise<ResponseHookResult>;
  processTargetError?(
    error: HookChainError,
    originalRequest: Request,
    originalRequestExtra: RequestExtra,
  ): Promise<TargetErrorHookResult>;

  // resources/list
  processListResourcesRequest?(
    request: ListResourcesRequestWithContext,
    requestExtra: RequestExtra,
  ): Promise<ListResourcesRequestHookResult>;
  processListResourcesResult?(
    result: ListResourcesResult,
    originalListToolsRequest: ListResourcesRequestWithContext,
    originalRequestExtra: RequestExtra,
  ): Promise<ListResourcesResponseHookResult>;
  processListResourcesError?(
    error: HookChainError,
    originalRequest: ListResourcesRequestWithContext,
    originalRequestExtra: RequestExtra,
  ): Promise<ListResourcesErrorHookResult>;

  // resources/templates/list
  processListResourceTemplatesRequest?(
    request: ListResourceTemplatesRequestWithContext,
    requestExtra: RequestExtra,
  ): Promise<ListResourceTemplatesRequestHookResult>;
  processListResourceTemplatesResult?(
    result: ListResourceTemplatesResult,
    originalListToolsRequest: ListResourceTemplatesRequestWithContext,
    originalRequestExtra: RequestExtra,
  ): Promise<ListResourceTemplatesResponseHookResult>;
  processListResourceTemplatesError?(
    error: HookChainError,
    originalRequest: ListResourceTemplatesRequestWithContext,
    originalRequestExtra: RequestExtra,
  ): Promise<ListResourceTemplatesErrorHookResult>;

  // resources/read
  processReadResourceRequest?(
    request: ReadResourceRequestWithContext,
    requestExtra: RequestExtra,
  ): Promise<ReadResourceRequestHookResult>;
  processReadResourceResult?(
    result: ReadResourceResult,
    originalListToolsRequest: ReadResourceRequestWithContext,
    originalRequestExtra: RequestExtra,
  ): Promise<ReadResourceResponseHookResult>;
  processReadResourceError?(
    error: HookChainError,
    originalRequest: ReadResourceRequestWithContext,
    originalRequestExtra: RequestExtra,
  ): Promise<ReadResourceErrorHookResult>;

  // notifications
  processNotification?(
    notification: Notification,
  ): Promise<NotificationHookResult>;
  processNotificationError?(
    error: HookChainError,
    originalNotification: Notification,
  ): Promise<NotificationErrorHookResult>;
  processTargetNotification?(
    notification: Notification,
  ): Promise<NotificationHookResult>;
  processTargetNotificationError?(
    error: HookChainError,
    originalNotification: Notification,
  ): Promise<TargetNotificationErrorHookResult>;

    /**
     * Optional stage to allow hooks to mutate headers that will be forwarded to the upstream server.
     */
    prepareUpstreamHeaders?(
        headers: Headers,
        req: CallToolRequest,
        extra: RequestExtra
    ): Promise<void>;
}

// Generic TypeScript helper types
export type GenericRequestHookResult<TRequest, TResponse> =
  | { resultType: "continue"; request: TRequest }
  | { resultType: "respond"; response: TResponse }
  | ({
      resultType: "continueAsync";
      request: TRequest;
      response: TResponse;
    } & {
      callback: (
        response: TResponse | null,
        error: HookChainError | null,
      ) => Promise<void>;
    });

export type GenericResponseHookResult<TResponse> = {
  resultType: "continue";
  response: TResponse;
};

export type MethodsWithRequestType<TRequest> = Exclude<
  {
    [K in keyof Hook]: Hook[K] extends
      | ((request: infer R, requestExtra: RequestExtra) => unknown)
      | undefined
      ? R extends TRequest
        ? K
        : never
      : never;
  }[keyof Hook],
  undefined
>;

export type MethodsWithResponseType<TResponse, TRequest> = Exclude<
  {
    [K in keyof Hook]: Hook[K] extends
      | ((
          response: infer R,
          originalRequest: infer O,
          originalRequestExtra: RequestExtra,
          ...args: unknown[]
        ) => unknown)
      | undefined
      ? R extends TResponse
        ? O extends TRequest
          ? K
          : never
        : never
      : never;
  }[keyof Hook],
  undefined
>;

export type MethodsWithErrorType<TRequest> = Exclude<
  {
    [K in keyof Hook]: Hook[K] extends
      | ((
          error: HookChainError,
          originalRequest: infer R,
          originalRequestExtra: RequestExtra,
          ...args: unknown[]
        ) => unknown)
      | undefined
      ? R extends TRequest
        ? K
        : never
      : never;
  }[keyof Hook],
  undefined
>;
