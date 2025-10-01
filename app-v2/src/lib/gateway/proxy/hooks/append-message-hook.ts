import { CallToolRequest, CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types.js";
import { Hook, RequestExtra } from ".";

export class AppendMessageHook implements Hook {
    name = "append-message";
    async processCallToolRequest(req: CallToolRequest, extra: RequestExtra) {
        console.log(`[${extra.requestId}] Tool called: ${JSON.stringify(req, null, 2)}`);
        return { resultType: "continue" as const, request: req };
    }
    async processCallToolResult(res: CallToolResult, req: CallToolRequest, extra: RequestExtra) {
        console.log(`[${extra.requestId}] HOOOOK: ${JSON.stringify(res, null, 2)}`);
        const message = `Tool ${req.params.name} completed (req ${extra.requestId}).`;
        const content = Array.isArray(res.content) ? [...res.content] as CallToolResult["content"] : [] as unknown as CallToolResult["content"];

        // Find the first text block to mutate so downstream UI (which reads the first text item) surfaces the change
        const textIndex = Array.isArray(content) ? content.findIndex((c: any) => c && c.type === "text") : -1;
        if (textIndex >= 0) {
            const current = content[textIndex] as unknown as TextContent;
            // Try to inject note into JSON if the text is JSON, otherwise append as plain text
            let newText = current.text;
            try {
                const parsed = JSON.parse(current.text);
                if (parsed && typeof parsed === "object") {
                    (parsed as Record<string, unknown>)["_note"] = message;
                    newText = JSON.stringify(parsed);
                }
            } catch {
                newText = `${current.text}\n\n${message}`;
            }
            const updated: TextContent = { ...current, type: "text", text: newText };
            (content as unknown as TextContent[])[textIndex] = updated;
        } else {
            // No text content present; add a new text block (may not be surfaced depending on client behavior)
            const appended: TextContent = { type: "text", text: message };
            (content as unknown as TextContent[]).push(appended);
        }

        const response: CallToolResult = { ...res, content };
        return { resultType: "continue" as const, response };
    }
}