<!-- 400f8f42-9695-431c-9246-5dca65231626 66b16702-9ab2-4d2e-b56b-b8f531fb3ad6 -->
# Expand MCP Proxy Hooks to All Requests

## Scope

- Add typed support and hook stages for: initialize, tools/list, prompts/list, resources/list, resources/templates/list, resources/read, notifications, and generic/target request/response/error.
- Introduce optional requestContext to all request shapes.
- Support continueAsync in request hooks (early response path), synchronous path remains default.

## Key Changes

### 1) Enhance `packages/js-sdk/src/handler/proxy/hooks.ts`

- Re-export MCP types needed by hooks.
- Add `RequestContext` zod schema and `*WithContext` request types.
- Define hook result schemas/types for each method (request/response/error), plus notification and target-side variants.
- Extend `Hook` interface with method signatures for all supported MCP methods and errors, including `processTarget*` and notification methods.
- Add generic helper types: `GenericRequestHookResult`, `GenericResponseHookResult`, and method-finder utility types.

### 2) Generalize proxy routing in `packages/js-sdk/src/handler/proxy/index.ts`

- Parse JSON-RPC envelope and route by `body.method`:
- "initialize" → initialize hook chain
- "tools/list" → listTools hook chain
- "prompts/list" → listPrompts hook chain
- "resources/list" → listResources hook chain
- "resources/templates/list" → listResourceTemplates hook chain
- "resources/read" → readResource hook chain
- "tools/call" → existing tool call chain (kept)
- else → other request chain
- For each chain:
- Run `process*Request` across hooks; honor results:
- `continue`: accumulate mutated request
- `respond`: short-circuit with given response (wrap in JSON-RPC result envelope with same id)
- `continueAsync` (when defined for that method): short-circuit immediately with provided response; do not forward upstream
- Build upstream headers: run `prepareUpstreamHeaders` with the active request (now for all methods, not only tools/call)
- Forward to target; parse response (JSON or SSE, same logic) and run `process*Result` across hooks; honor `continue`
- On upstream or parsing errors, run `process*Error` chain; if any hook returns `respond`, use it; else synthesize JSON-RPC error

### 3) Header stage generalization

- Keep `prepareUpstreamHeaders` as a generic stage; call it for every request kind.

### 4) Notifications support

- If JSON-RPC message has no `id`, treat as notification:
- Route to `processNotification` chain (client→target) and short-circuit if any hook modifies or blocks (return 204 for blocked or passthrough if forwarded).
- Forward to target; if target pushes notifications back (SSE or webhook), route through `processTargetNotification` where applicable.

### 5) Target-side scaffolding

- Define `processTargetRequest`, `processTargetResult`, `processTargetError`, `processTargetNotification`, `processTargetNotificationError` in the Hook interface and call sites where reverse direction is handled (primarily for SSE and future bidirectional transport). For v1, call result/error handlers after parsing SSE frames.

### 6) ContinueAsync handling

- Accept `continueAsync` in request-stage results for all supported methods that define it; short-circuit by immediately returning the provided response in a JSON-RPC envelope. The callback remains hook-owned; the proxy does not forward upstream nor schedule extra work.

### 7) Maintain backward compatibility

- Existing hooks (`analytics`, `auth-headers`, `logging`, `x402*`) continue to compile; their tool-call methods remain supported.
- `prepareUpstreamHeaders` signature unchanged.

### 8) Minimal docs

- Document the new Hook methods and result types in package README and JSDoc in `hooks.ts`.

## Acceptance Criteria

- tools/call behavior unchanged.
- initialize, tools/list, prompts/list, resources/list, resources/templates/list, resources/read all route through corresponding hook stages and forward successfully to target servers.
- Notifications (no `id`) are forwarded; hook stages can observe them.
- Error hooks can replace errors with valid results for each method.
- `continueAsync` on supported methods returns early and does not forward upstream.

## Notes

- No persistence or background scheduling is added for `continueAsync` in v1. Hooks that use it must manage their own callback lifecycle.

### To-dos

- [ ] Extend hooks.ts with schemas, requestContext, all hook result types, method helpers.
- [ ] Generalize proxy index.ts routing for all MCP methods and notifications.
- [ ] Call prepareUpstreamHeaders for every request kind.
- [ ] Invoke process*Error chains and honor respond results.
- [ ] Add processNotification and processTargetNotification call sites.
- [ ] Wire processTarget* handlers for SSE/streamed responses.
- [ ] Accept continueAsync and short-circuit with provided response.
- [ ] Ensure existing hooks compile under new types; adapt imports.
- [ ] Update README and JSDoc with new hook API and examples.