import { config } from "dotenv";
import { createServerConnections, ServerType, startStdioServer } from "./start-stdio-server.js";
import type { X402ClientConfig } from "../../client/with-x402-client.js";

config();

// Load environment variables
const serverUrls = process.env.SERVER_URLS?.split(',') as string[];
if (!serverUrls || serverUrls.length === 0) {
    throw new Error("Missing environment variables: SERVER_URLS is required");
}

/**
 * Validates that the parsed wallet object has the correct structure for X402ClientConfig['wallet']
 * @param wallet - The parsed wallet object to validate
 * @returns true if the wallet structure is valid, false otherwise
 */
function isValidWalletStructure(wallet: unknown): wallet is X402ClientConfig['wallet'] {
    if (!wallet || typeof wallet !== 'object') {
        return false;
    }
    
    const walletObj = wallet as Record<string, unknown>;
    
    // Check if it has evm or svm properties (at least one should be present)
    const hasEvm = 'evm' in walletObj;
    const hasSvm = 'svm' in walletObj;
    
    if (!hasEvm && !hasSvm) {
        return false;
    }
    
    // If evm is present, it should be an object
    if (hasEvm && (typeof walletObj.evm !== 'object' || walletObj.evm === null)) {
        return false;
    }
    
    // If svm is present, it should be an object
    if (hasSvm && (typeof walletObj.svm !== 'object' || walletObj.svm === null)) {
        return false;
    }
    
    return true;
}

// Optional X402 client config via env
const x402WalletJson = process.env.X402_WALLET_JSON;
const x402MaxAtomic = process.env.X402_MAX_ATOMIC;
const x402Version = process.env.X402_VERSION;
let x402ClientConfig: X402ClientConfig | undefined = undefined;
if (x402WalletJson) {
    try {
        const parsedWallet = JSON.parse(x402WalletJson);
        
        if (!isValidWalletStructure(parsedWallet)) {
            console.error("Invalid X402_WALLET_JSON structure. Must contain 'evm' and/or 'svm' wallet objects.");
            process.exit(1);
        }
        
        const wallet = parsedWallet as X402ClientConfig['wallet'];
        const maybeMax = x402MaxAtomic ? (() => { try { return BigInt(x402MaxAtomic); } catch { return undefined; } })() : undefined;
        const maybeVersion = x402Version ? Number(x402Version) : undefined;
        x402ClientConfig = {
            wallet,
            ...(maybeMax !== undefined ? { maxPaymentValue: maybeMax } : {}),
            ...(maybeVersion !== undefined ? { version: maybeVersion } : {}),
        };
    } catch (e) {
        console.error("Invalid X402_WALLET_JSON. Must be valid JSON.");
        process.exit(1);
    }
}

/**
 * Main function to start the MCP stdio server
 * This connects to multiple remote MCP servers and exposes them via a stdio interface
 */
async function main() {
    try {
        // console.log(`Connecting to ${serverUrls.length} server(s)...`);
        
        // Multi-server approach using HTTP stream + optional X402 client
        const serverConnections = createServerConnections(
            serverUrls,
            ServerType.HTTPStream
        );
        
        await startStdioServer({
            serverConnections,
            x402ClientConfig,
        });
            
        // console.log(`Connected to ${serverUrls.length} servers using payment transport`);
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

// Run the main function
main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});