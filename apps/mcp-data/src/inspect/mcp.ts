import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { config } from 'dotenv';
config();


export const inspectMcp = async (origin: string) => {
    const url = new URL(origin);

    const transport = new StreamableHTTPClientTransport(url);
    const client = new Client({ name: 'inspect-mcpay.tech/1.0', version: '1.0.0' }, { capabilities: {} });

    await client.connect(transport);

    const tools = await client.listTools();
    const resources = await client.listResources();
    const prompts = await client.listPrompts();
    const resourceTemplates = await client.listResourceTemplates();

    const serverCapabilities = client.getServerCapabilities();
    const serverInfo = client.getServerVersion();
    const serverInstructions = client.getInstructions();


    return {
        tools,
        resources,
        prompts,
        resourceTemplates,
        server: {
            capabilities: serverCapabilities,
            info: serverInfo,
            instructions: serverInstructions,
        }
    };
}