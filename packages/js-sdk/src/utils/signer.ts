import { Account, Chain, Client, PublicActions, RpcSchema, Transport, WalletActions } from "viem";
import { base, baseSepolia, avalancheFuji, sei, seiTestnet, polygon, polygonAmoy } from "viem/chains";
import { createWalletClient, http } from "viem";
import { publicActions } from "viem";

export type SignerWallet<
  chain extends Chain = Chain,
  transport extends Transport = Transport,
  account extends Account = Account,
> = Client<
  transport,
  chain,
  account,
  RpcSchema,
  PublicActions<transport, chain, account> & WalletActions<chain, account>
>;

function getChainFromNetwork(network: string | undefined): Chain {
    if (!network) {
      throw new Error("NETWORK environment variable is not set");
    }
  
    switch (network) {
      case "base":
        return base;
      case "base-sepolia":
        return baseSepolia;
      case "avalanche-fuji":
        return avalancheFuji;
      case "sei":
        return sei;
      case "sei-testnet":
        return seiTestnet;
      case "polygon":
        return polygon;
      case "polygon-amoy":
        return polygonAmoy;
      default:
        throw new Error(`Unsupported network: ${network}`);
    }
  }

export function createSignerFromViemAccount(network: string, account: Account): SignerWallet<Chain> {
    const chain = getChainFromNetwork(network);
    return createWalletClient({
      chain,
      transport: http(),
      account: account,
    }).extend(publicActions);
  }
    