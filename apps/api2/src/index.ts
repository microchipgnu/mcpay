import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { createMcpHandler } from 'mcp-handler';
import type { McpToolDefinition } from "openapi-mcp-generator";
import { getToolsFromOpenApi } from "openapi-mcp-generator";
import type { OpenAPIV3 } from 'openapi-types';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import getPort from 'get-port';

const app = new Hono();

type PrimitiveParam = string | number | boolean | null | undefined;
type ParamsMap = Record<string, PrimitiveParam>;

type ExecutionParameter = {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie' | string;
};

type ToolWithBaseUrl = McpToolDefinition & { baseUrl?: string };

const normalizeHeaders = (headersInput: unknown): Record<string, string> => {
  if (!headersInput) return {};
  // If already a Record<string, string>
  if (typeof headersInput === 'object' && !Array.isArray(headersInput)) {
    const record: Record<string, string> = {};
    Object.entries(headersInput as Record<string, unknown>).forEach(([k, v]) => {
      if (typeof v === 'string') record[k] = v;
    });
    return record;
  }
  // If iterable of [key, value]
  if (Array.isArray(headersInput)) {
    const record: Record<string, string> = {};
    for (const entry of headersInput as Array<[string, string]>) {
      const [k, v] = entry;
      if (typeof k === 'string' && typeof v === 'string') record[k] = v;
    }
    return record;
  }
  return {};
};

const buildExecutionParams = (
  tool: ToolWithBaseUrl
): ReadonlyArray<ExecutionParameter> => {
  if (Array.isArray(tool.executionParameters) && tool.executionParameters.length > 0) {
    return tool.executionParameters as ReadonlyArray<ExecutionParameter>;
  }
  if (Array.isArray(tool.parameters) && tool.parameters.length > 0) {
    return (tool.parameters as ReadonlyArray<OpenAPIV3.ParameterObject>).map((p) => ({
      name: p.name,
      in: p.in,
    }));
  }
  return [];
};

const executeDynamicTool = async (
  opts: {
    name: string;
    method: string;
    baseUrl: string;
    pathTemplate: string;
    parameters: ReadonlyArray<ExecutionParameter>;
    requestBodyContentType?: string;
    params: ParamsMap;
    originalHeaders: Record<string, string>;
  }
): Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }> => {
  const { name, method, baseUrl, pathTemplate, parameters, requestBodyContentType, params, originalHeaders } = opts;

  try {
    console.log(`Executing tool ${name} with params:`, params);

    let url = pathTemplate;
    const queryParams = new URLSearchParams();
    let requestBody: string | undefined;
    const headers: Record<string, string> = {};

    const headersToSkip = new Set(['host', 'content-length', 'connection', 'upgrade', 'expect']);
    Object.entries(originalHeaders).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      if (!headersToSkip.has(lowerKey) && typeof value === 'string') {
        headers[key] = value;
      }
    });

    if (requestBodyContentType) {
      headers['Content-Type'] = requestBodyContentType;
    }

    if (parameters && Array.isArray(parameters)) {
      parameters.forEach((param) => {
        const value = params[param.name];
        if (value !== undefined && value !== null) {
          switch (param.in) {
            case 'path':
              {
                const placeholder = `{${param.name}}`;
                if (url.includes(placeholder)) {
                  url = url.replace(placeholder, encodeURIComponent(String(value)));
                } else {
                  // Fallback: if placeholder isn't present, treat as query param
                  queryParams.append(param.name, String(value));
                }
              }
              break;
            case 'query':
              queryParams.append(param.name, String(value));
              break;
            case 'header':
              headers[param.name] = String(value);
              break;
            default:
              break;
          }
        }
      });
    }

    const upperMethod = method.toUpperCase();
    if ([ 'POST', 'PUT', 'PATCH' ].includes(upperMethod)) {
      console.log('Processing request body for method:', upperMethod);
      const bodyParams: Record<string, PrimitiveParam> = {};
      Object.entries(params).forEach(([key, value]) => {
        bodyParams[key] = value;
      });

      console.log('Collected body parameters:', bodyParams);

      if (Object.keys(bodyParams).length > 0) {
        if (requestBodyContentType && requestBodyContentType.includes('application/json')) {
          requestBody = JSON.stringify(bodyParams);
          console.log('Created JSON request body:', requestBody);
        } else {
          const formData = new URLSearchParams();
          Object.entries(bodyParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              formData.append(key, String(value));
            }
          });
          requestBody = formData.toString();
          console.log('Created form data request body:', requestBody);
        }
      } else {
        console.log('No body parameters to process');
      }
    }

    const finalUrl = new URL(url, baseUrl);
    queryParams.forEach((value, key) => {
      finalUrl.searchParams.append(key, value);
    });

    console.log(`Making ${upperMethod} request to:`, finalUrl.toString());
    console.log('Headers:', headers);
    console.log('Body:', requestBody);

    const response = await fetch(finalUrl.toString(), {
      method: upperMethod,
      headers,
      body: requestBody,
    });

    const responseText = await response.text();
    let responseData: unknown;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    console.log(`Response status: ${response.status}`);
    console.log(`Response data:`, responseData);

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `HTTP Error ${response.status}: ${responseText}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: typeof responseData === 'string' ? responseData : JSON.stringify(responseData, null, 2) }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `Execution error: ${message}` }],
      isError: true,
    };
  }
};

const getSchemaShape = (inputSchema: unknown): Record<string, z.ZodTypeAny> => {
  const schemaShape: Record<string, z.ZodTypeAny> = {};

  if (inputSchema && typeof inputSchema === 'object' && 'properties' in (inputSchema as Record<string, unknown>)) {
    const schemaObj = inputSchema as Record<string, unknown>;
    const rawProperties = (schemaObj as { properties?: unknown }).properties;
    const properties: Record<string, unknown> = rawProperties && typeof rawProperties === 'object' ? (rawProperties as Record<string, unknown>) : {};
    const required = Array.isArray((schemaObj as { required?: unknown }).required) ? ((schemaObj as { required?: unknown }).required as string[]) : [];

    const mapPrimitive = (typeVal: unknown, prop: Record<string, unknown>): z.ZodTypeAny | undefined => {
      const baseType = Array.isArray(typeVal) ? typeVal[0] : typeVal;
      if (typeof baseType !== 'string') return undefined;
      switch (baseType) {
        case 'string':
          return z.string();
        case 'number':
          return z.number();
        case 'integer':
          return z.number().int();
        case 'boolean':
          return z.boolean();
        case 'array': {
          const items = (prop as { items?: unknown }).items;
          if (items && typeof items === 'object' && !Array.isArray(items)) {
            const itemType = mapPrimitive((items as Record<string, unknown>).type, items as Record<string, unknown>) || z.unknown();
            return z.array(itemType);
          }
          return z.array(z.unknown());
        }
        case 'object':
          return z.record(z.string(), z.unknown());
        default:
          return undefined;
      }
    };

    Object.entries(properties).forEach(([key, prop]) => {
      if (typeof prop !== 'object' || prop === null) return;

      let zodField: z.ZodTypeAny | undefined;

      if (Array.isArray((prop as { enum?: unknown }).enum) && ((prop as { enum?: unknown }).enum as unknown[]).length > 0) {
        const enumVals = (prop as { enum: Array<string | number> }).enum as Array<string | number>;
        const allStrings = enumVals.every((v) => typeof v === 'string');
        const allNumbers = enumVals.every((v) => typeof v === 'number');
        if (allStrings && enumVals.length > 0) {
          zodField = z.enum(enumVals as [string, ...string[]]);
        } else if (enumVals.length > 0 && (allStrings || allNumbers)) {
          const literals = enumVals.map((v) => z.literal(v as never));
          if (literals.length === 1) {
            zodField = literals[0];
          } else {
            let unionSchema: z.ZodTypeAny = z.union([literals[0], literals[1]]);
            for (let i = 2; i < literals.length; i++) {
              unionSchema = z.union([unionSchema, literals[i]]);
            }
            zodField = unionSchema;
          }
        }
      }

      if (!zodField) {
        zodField = mapPrimitive((prop as Record<string, unknown>).type, prop as Record<string, unknown>);
      }

      if (!zodField) return;

      if ((prop as { description?: unknown }).description) {
        zodField = zodField.describe(String((prop as { description?: unknown }).description));
      }

      if (!required.includes(key)) {
        schemaShape[key] = zodField.optional();
      } else {
        schemaShape[key] = zodField;
      }
    });
  }

  return schemaShape;
};

const handler = (url: string) => createMcpHandler(async (server) => {
    console.log(`[MCP] Initializing MCP server`);

    const tools = await getToolsFromOpenApi(url, {
        dereference: true
    });

    tools.forEach((tool) => {
        console.log(`[MCP] Tool:`, tool.name);
      const t = tool as ToolWithBaseUrl;
      const name = t.name;
      const description = t.description || "";
      let paramsSchema = getSchemaShape(t.inputSchema);
      if (Object.keys(paramsSchema).length === 0) {
        paramsSchema = { _: z.string().optional().describe('No parameters') };
      }
      const execParams = buildExecutionParams(t);
      const baseUrl = t.baseUrl || '';

      // Ensure path/query/header parameters are present in the schema so they are not stripped by z.object()
      if (Array.isArray(t.parameters)) {
        (t.parameters as ReadonlyArray<OpenAPIV3.ParameterObject>).forEach((p) => {
          if (!p || typeof p !== 'object' || !('name' in p)) return;
          const key = p.name;
          if (paramsSchema[key]) return;

          let field: z.ZodTypeAny = z.string();
          const schema = (p as OpenAPIV3.ParameterObject).schema as (OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined);
          if (schema && typeof (schema as OpenAPIV3.SchemaObject).type === 'string') {
            const tpe = (schema as OpenAPIV3.SchemaObject).type;
            switch (tpe) {
              case 'integer':
              case 'number':
                field = z.number();
                break;
              case 'boolean':
                field = z.boolean();
                break;
              case 'array': {
                const items = (schema as OpenAPIV3.ArraySchemaObject).items;
                let itemZ: z.ZodTypeAny = z.string();
                if (items && !('$ref' in items) && typeof items.type === 'string') {
                  if (items.type === 'integer' || items.type === 'number') itemZ = z.number();
                  else if (items.type === 'boolean') itemZ = z.boolean();
                  else itemZ = z.string();
                }
                field = z.array(itemZ);
                break;
              }
              default:
                field = z.string();
            }
          }
          if (p.description) {
            field = field.describe(p.description);
          }
          paramsSchema[key] = p.required ? field : field.optional();
        });
      }

      console.log(`[MCP] Adding tool ${name}`);
      console.log(`[MCP] Parameters schema:`, paramsSchema);
      try {
        const previewSchema = zodToJsonSchema(z.object(paramsSchema), { strictUnions: true }) as Record<string, unknown>;
        console.log(`[MCP] inputSchema.type for ${name}:`, (previewSchema as any)?.type);
      } catch (e) {
        console.warn(`[MCP] Failed to preview inputSchema for ${name}:`, e);
      }
      console.log(`[MCP] Execution parameters:`, execParams);
      console.log(`[MCP] Base URL:`, baseUrl);

      server.tool(name, description, { ...paramsSchema }, async (args, extra) => {
        const originalHeaders = normalizeHeaders(extra?.requestInfo && (extra.requestInfo as unknown as { headers?: unknown }).headers);

        return executeDynamicTool({
          name,
          method: t.method,
          baseUrl,
          pathTemplate: t.pathTemplate,
          parameters: execParams,
          requestBodyContentType: t.requestBodyContentType,
          params: (args as unknown as ParamsMap) ?? {},
          originalHeaders,
        });
      });
    });
  });

// Root route handler that serves the main HTML page
// This page provides a simple UI for users to:
// - Enter an OpenAPI spec URL
// - Generate an MCP-compatible endpoint URL
// - View the generated URL that can be used with MCP clients
app.get('/', (c) => {
    return c.html(`
        <html>
            <head>
                <title>API to MCP Converter</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="font-sans max-w-5xl mx-auto p-6 md:p-8">
                <h1 class="text-3xl font-bold mb-2">API to MCP Converter</h1>
                <p class="text-gray-600 mb-6">Enter an OpenAPI URL to generate your MCP endpoint and preview the generated tools.</p>

                <div class="space-y-3 bg-gray-50 p-4 rounded-lg border">
                    <label for="apiUrl" class="block text-sm font-medium text-gray-700">
                        OpenAPI / Swagger specification URL
                    </label>
                    <input 
                        type="url" 
                        id="apiUrl" 
                        placeholder="https://api.example.com/openapi.json"
                        class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div class="flex flex-col sm:flex-row gap-3">
                        <button 
                            onclick="generateUrl()"
                            class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Generate MCP URL
                        </button>
                        <button 
                            onclick="inspectUrl()"
                            class="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-black focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2"
                        >
                            Inspect Tools
                        </button>
                    </div>
                </div>

                <div class="mt-6">
                    <h2 class="text-lg font-semibold mb-2">MCP base URL</h2>
                    <code id="baseUrl" class="bg-gray-100 px-3 py-1 rounded break-all"></code>
                    <div id="result" class="mt-3 break-all"></div>
                </div>

                <div id="toolsSection" class="mt-8 hidden">
                    <div class="flex items-center justify-between mb-3">
                        <h2 class="text-lg font-semibold">Discovered tools</h2>
                        <span id="toolCount" class="text-sm text-gray-500"></span>
                    </div>
                    <div id="tools" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
                </div>

                <script>
                    function computeBase() {
                        return window.location.origin + '/mcp?url=';
                    }

                    function setBaseLabel() {
                        const baseEl = document.getElementById('baseUrl');
                        if (baseEl) {
                            baseEl.textContent = computeBase();
                        }
                    }

                    setBaseLabel();

                    function generateUrl() {
                        const apiUrl = /** @type {HTMLInputElement|null} */(document.getElementById('apiUrl'))?.value || '';
                        if (!apiUrl) {
                            alert('Please enter a valid URL');
                            return;
                        }
                        const mcpUrl = computeBase() + encodeURIComponent(apiUrl);
                        const result = document.getElementById('result');
                        if (result) {
                            result.innerHTML = '<p class="text-gray-700 mb-2">Your MCP URL:</p><a class="underline text-blue-700" href="' + mcpUrl + '" target="_blank" rel="noopener noreferrer">' + mcpUrl + '</a>';
                        }
                    }

                    function badgeForMethod(method) {
                        const map = {
                            GET: 'bg-green-100 text-green-800',
                            POST: 'bg-blue-100 text-blue-800',
                            PUT: 'bg-yellow-100 text-yellow-800',
                            PATCH: 'bg-purple-100 text-purple-800',
                            DELETE: 'bg-red-100 text-red-800'
                        };
                        return map[method?.toUpperCase?.()] || 'bg-gray-100 text-gray-800';
                    }

                    function renderTools(tools) {
                        const toolsSection = document.getElementById('toolsSection');
                        const toolCount = document.getElementById('toolCount');
                        const container = document.getElementById('tools');
                        if (!toolsSection || !container || !toolCount) return;

                        container.innerHTML = '';
                        toolCount.textContent = tools.length + ' tool' + (tools.length === 1 ? '' : 's');
                        toolsSection.classList.remove('hidden');

                        tools.forEach(function (t) {
                            const method = t.method || '';
                            const card = document.createElement('div');
                            card.className = 'rounded-lg border bg-white p-4 shadow-sm';
                            card.innerHTML = '<div class="flex items-start justify-between gap-3">'
                                + '<div class="min-w-0">'
                                + '<div class="flex items-center gap-2">'
                                + '<span class="text-sm px-2 py-0.5 rounded ' + badgeForMethod(method) + '">' + (method || 'METHOD') + '</span>'
                                + '<h3 class="font-semibold truncate" title="' + (t.name || '') + '">' + (t.name || '') + '</h3>'
                                + '</div>'
                                + '<div class="text-xs text-gray-600 mt-1 break-all">' + (t.baseUrl || '') + (t.pathTemplate || '') + '</div>'
                                + '</div>'
                                + '</div>'
                                + '<p class="text-sm text-gray-700 mt-3 whitespace-pre-wrap">' + (t.description || '') + '</p>'
                                + '<div class="mt-3 space-y-2">'
                                + (Array.isArray(t.parameters) && t.parameters.length ? (
                                    '<div>'
                                    + '<div class="text-xs font-medium text-gray-600 mb-1">Parameters</div>'
                                    + '<ul class="text-xs text-gray-800 space-y-1">' + t.parameters.map(function(p){return '<li><code class="bg-gray-100 px-1 py-0.5 rounded">' + (p.in || 'query') + '</code> <span class="font-medium">' + p.name + '</span>' + (p.required ? ' <span class="text-red-600">(required)</span>' : '') + (p.description ? ' - ' + p.description : '') + '</li>';}).join('') + '</ul>'
                                    + '</div>'
                                ) : '')
                                + (t.requestBodyContentType ? (
                                    '<div class="text-xs text-gray-600">Body: <code class="bg-gray-100 px-1 py-0.5 rounded">' + t.requestBodyContentType + '</code></div>'
                                ) : '')
                                + (t.inputSchema && t.inputSchema.properties ? (
                                    '<div>'
                                    + '<div class="text-xs font-medium text-gray-600 mb-1">Input schema properties</div>'
                                    + '<ul class="text-xs text-gray-800 space-y-1">' + Object.keys(t.inputSchema.properties).map(function(k){return '<li><span class="font-medium">' + k + '</span></li>';}).join('') + '</ul>'
                                    + '</div>'
                                ) : '')
                                + '</div>';
                            container.appendChild(card);
                        });
                    }

                    async function inspectUrl() {
                        const apiUrl = /** @type {HTMLInputElement|null} */(document.getElementById('apiUrl'))?.value || '';
                        const toolsSection = document.getElementById('toolsSection');
                        const container = document.getElementById('tools');
                        const toolCount = document.getElementById('toolCount');

                        if (!apiUrl) {
                            alert('Please enter a valid URL');
                            return;
                        }
                        if (toolsSection) {
                            toolsSection.classList.remove('hidden');
                        }
                        if (container) {
                            container.innerHTML = '<div class="text-sm text-gray-600">Loading tools...</div>';
                        }
                        if (toolCount) {
                            toolCount.textContent = '';
                        }
                        try {
                            const res = await fetch('/inspect-mcp?url=' + encodeURIComponent(apiUrl));
                            if (!res.ok) {
                                throw new Error('Failed to inspect: ' + res.status);
                            }
                            const data = await res.json();
                            if (Array.isArray(data.tools)) {
                                renderTools(data.tools);
                            } else {
                                throw new Error('Unexpected response format');
                            }
                        } catch (err) {
                            if (container) {
                                container.innerHTML = '<div class="text-sm text-red-700">Error: ' + (err && err.message ? err.message : 'Unknown error') + '</div>';
                            }
                        }
                    }
                </script>
            </body>
        </html>
    `);
});

app.get('/inspect-mcp', async (c) => {
    const url = c.req.query('url');
    if (!url) {
        return c.text('Missing url parameter', 400);
    }

    const tools = await getToolsFromOpenApi(url, {
        dereference: true
    });

    const ensureObjectInputSchema = (schema: unknown): Record<string, unknown> => {
        if (schema && typeof schema === 'object') {
            const obj = schema as Record<string, unknown>;
            if (obj.type !== 'object') {
                return { type: 'object', properties: obj.properties ?? {} };
            }
            return obj;
        }
        return { type: 'object', properties: {} };
    };

    const normalizedTools = tools.map((t) => ({
        ...t,
        inputSchema: ensureObjectInputSchema((t as { inputSchema?: unknown }).inputSchema),
    }));

    return c.json({ url, tools: normalizedTools }, 200);
});

app.all('/*', async (c) => {
    const url = c.req.query('url');
    if (!url) {
        return c.text('Missing url parameter', 400);
    }

    console.log(`[MCP] Handling request for ${url}`);
    const response = await handler(url)(c.req.raw);
    return response;
});

const portPromise = getPort({ port: process.env.PORT ? Number(process.env.PORT) : 3000 });
const port = await portPromise;
serve({
  fetch: app.fetch,
  port: port,
  hostname: '0.0.0.0' // Important for sandbox access
}, (info) => {
  console.log(`[MCP] Server running on http://0.0.0.0:${info.port}`);
});