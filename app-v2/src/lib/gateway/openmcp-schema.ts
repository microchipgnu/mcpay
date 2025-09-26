export const openmcpSchema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "OpenMCP Manifest Schema",
    "type": "object",
    "required": ["id", "name", "version", "runtime", "tools"],
    "properties": {
        "id": {
            "type": "string",
            "description": "Unique identifier for the MCP server/manifest"
        },
        "name": {
            "type": "string",
            "description": "Human-readable name of the server"
        },
        "version": {
            "type": "string",
            "description": "Version of the manifest (e.g. 1.0.0)"
        },
        "description": {
            "type": "string",
            "description": "Optional description of the server"
        },
        "runtime": {
            "oneOf": [
                {
                    "type": "object",
                    "required": ["language"],
                    "properties": {
                        "language": {
                            "type": "string",
                            "enum": ["python", "javascript"],
                            "description": "Implementation language for the server (Python or JavaScript)"
                        },
                        "memory": {
                            "oneOf": [
                                { "type": "integer", "minimum": 1 },
                                { "type": "string" }
                            ],
                            "description": "Memory limit for the function (integer MB or string with unit)"
                        },
                        "cpu": {
                            "oneOf": [
                                { "type": "number", "minimum": 0 },
                                { "type": "string" }
                            ],
                            "description": "CPU limit for the function (number of vCPUs or string identifier)"
                        },
                        "profile": {
                            "type": "string",
                            "description": "Serverless sandbox profile or environment (e.g., cloudflare, vercel)"
                        }
                    }
                },
                {
                    "type": "array",
                    "minItems": 1,
                    "items": {
                        "type": "object",
                        "required": ["language"],
                        "properties": {
                            "language": {
                                "type": "string",
                                "enum": ["python", "javascript"],
                                "description": "Implementation language for the server (Python or JavaScript)"
                            },
                            "memory": {
                                "oneOf": [
                                    { "type": "integer", "minimum": 1 },
                                    { "type": "string" }
                                ],
                                "description": "Memory limit for the function (integer MB or string with unit)"
                            },
                            "cpu": {
                                "oneOf": [
                                    { "type": "number", "minimum": 0 },
                                    { "type": "string" }
                                ],
                                "description": "CPU limit for the function (number of vCPUs or string identifier)"
                            },
                            "profile": {
                                "type": "string",
                                "description": "Serverless sandbox profile or environment (e.g., cloudflare, vercel)"
                            }
                        }
                    }
                }
            ],
            "description": "Runtime configuration (single runtime object or array of runtime objects)"
        },
        "tools": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "required": ["name", "inputSchema", "implementation"],
                "properties": {
                    "name": { "type": "string", "description": "Unique tool name" },
                    "description": { "type": "string", "description": "Description of the tool" },
                    "inputSchema": {
                        "type": "object",
                        "description": "JSON Schema defining tool input parameters"
                    },
                    "outputSchema": {
                        "type": "object",
                        "description": "JSON Schema defining tool output structure"
                    },
                    "streaming": {
                        "type": "boolean",
                        "description": "Whether the tool outputs streaming results"
                    },
                    "implementation": {
                        "type": "object",
                        "required": ["code", "entrypoint", "language"],
                        "properties": {
                            "language": { 
                                "type": "string", 
                                "enum": ["python", "javascript"],
                                "description": "Implementation language for this specific tool"
                            },
                            "entrypoint": { "type": "string" },
                            "code": { "type": "string" }
                        },
                        "description": "Embedded implementation code for the tool"
                    },
                    "annotations": {
                        "type": "object",
                        "properties": {
                            "readOnly": { "type": "boolean" },
                            "destructive": { "type": "boolean" },
                            "idempotent": { "type": "boolean" },
                            "openWorld": { "type": "boolean" }
                        },
                        "description": "Optional behavioral hints for the tool"
                    }
                }
            }
        },
        "dependencies": {
            "type": "object",
            "properties": {
                "pip": {
                    "type": "array",
                    "items": { "type": "string" },
                    "description": "List of PyPI packages required"
                },
                "npm": {
                    "type": "array",
                    "items": { "type": "string" },
                    "description": "List of NPM packages required"
                }
            }
        },
        "environment": {
            "type": "object",
            "additionalProperties": { "type": "string" },
            "description": "Environment variables required (name: value pairs or placeholders)"
        },
        "security": {
            "type": "object",
            "properties": {
                "networkAccess": { "type": "boolean" },
                "sandboxPermissions": { "type": "array", "items": { "type": "string" } }
            },
            "description": "Sandbox security settings/hints"
        }
    }
}
