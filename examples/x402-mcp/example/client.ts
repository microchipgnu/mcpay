import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { withX402Client } from "mcpay/client";
import { createSigner, isEvmSignerWallet, isSvmSignerWallet, SupportedEVMNetworks, SupportedSVMNetworks } from "x402/types";
import { config } from 'dotenv';
config();

export const getClient = async () => {
  const client = new Client({
    name: "example-client",
    version: "1.0.0",
  });

  const EVM_PRIVATE_KEY = process.env.EVM_PRIVATE_KEY as string;
  const SOLANA_PRIVATE_KEY = process.env.SOLANA_PRIVATE_KEY as string;
  const MCP_SERVER_URL = "http://localhost:3022/mcp"

  const transport = new StreamableHTTPClientTransport(new URL(MCP_SERVER_URL));

  // ✅ Wait for the connection
  await client.connect(transport);

  const evmSigner = await createSigner("base-sepolia", EVM_PRIVATE_KEY);
  if (!isEvmSignerWallet(evmSigner)) {
    throw new Error("Failed to create EVM signer");
  }

  const svmSigner = await createSigner("solana-devnet", SOLANA_PRIVATE_KEY);

  if (!isSvmSignerWallet(svmSigner)) {
    throw new Error("Failed to create SVM signer");
  }

  return withX402Client(client, {
    wallet: {
        evm: evmSigner,
        svm: svmSigner
    },
    confirmationCallback: async (payment) => {
      const readline = await import("readline");

      console.log("Payment available on the following networks:");
      console.log(payment)
      payment.forEach(payment => {
        console.log("-", payment.network, payment.maxAmountRequired, payment.asset);
      });

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      return new Promise((resolve) => {
        rl.question("Type the network to confirm payment: ", (answer: string) => {
          rl.close();
          if(SupportedEVMNetworks.includes(answer as typeof SupportedEVMNetworks[number])) {
            resolve({network: answer as typeof SupportedEVMNetworks[number]});
          }
          if(SupportedSVMNetworks.includes(answer as typeof SupportedSVMNetworks[number])) {
            resolve({network: answer as typeof SupportedSVMNetworks[number]});
          }
          resolve(false);
        });
      });
    }
  });
};

export const getClientResponse = async () => {
  const client = await getClient();
  // ✅ Correct overload: (name: string, args?: Record<string, unknown>)
  const res = await client.callTool({
    name: "weather",
    arguments: {
      city: "Tokyo"
    },
  });
  return res;
};

try {
  console.log("[main] Starting test...");
  const response = await getClientResponse();
  console.log("[main] Final response:", response);
} catch (err) {
  console.error(err);
}