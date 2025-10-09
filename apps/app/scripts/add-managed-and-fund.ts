#!/usr/bin/env tsx
import 'dotenv/config';
import { parseArgs } from 'node:util';
import { withTransaction, txOperations } from '@/lib/gateway/db/actions';
import { isTest } from '@/lib/gateway/env';

async function main() {
  const {
    values: { userId, network = 'base-sepolia', createSmartAccount = 'false', fundSei = 'false' },
  } = parseArgs({
    options: {
      userId: { type: 'string', short: 'u' },
      network: { type: 'string', short: 'n' },
      createSmartAccount: { type: 'string' },
      fundSei: { type: 'string' },
    },
  });

  if (!userId) {
    console.error('Usage: tsx scripts/add-managed-and-fund.ts --userId <USER_ID> [--network base-sepolia] [--createSmartAccount true|false] [--fundSei true|false]');
    process.exit(1);
  }

  console.log(`[SCRIPT] Ensuring CDP managed wallets for user ${userId} on ${network} (smart=${createSmartAccount})`);

  const result = await withTransaction(async (tx) => {
    return await txOperations.autoCreateCDPWalletForUser(
      userId,
      {
        // Minimal user info; can be extended if needed
        displayName: userId.slice(0, 8),
      },
      {
        createSmartAccount: String(createSmartAccount).toLowerCase() === 'true',
        network: network as any,
      },
    )(tx);
  });

  if (result) {
    console.log('[SCRIPT] CDP wallets created or ensured:', {
      accountName: result.accountName,
      wallets: result.wallets.map((w) => ({ id: w.id, address: w.walletAddress, primary: w.isPrimary })),
    });
  } else {
    console.log('[SCRIPT] User already had CDP wallets, no creation performed.');
  }

  // Optional: experimental SEI funding similar to auth.ts hook
  if (String(fundSei).toLowerCase() === 'true') {
    if (isTest()) {
      console.log('[SEI FAUCET] Skipping in test environment');
      return;
    }

    if (!process.env.EXPERIMENTAL_SEI_FAUCET_PRIVATE_KEY) {
      console.log('[SEI FAUCET] Missing EXPERIMENTAL_SEI_FAUCET_PRIVATE_KEY; skipping funding');
      return;
    }

    try {
      // Defer importing viem deps to runtime to avoid type resolution issues in CLI context
      // @ts-ignore - runtime require for CLI script
      const { createPublicClient, createWalletClient, http, parseUnits } = await import('viem');
      // @ts-ignore - runtime require for CLI script
      const { privateKeyToAccount } = await import('viem/accounts');
      // @ts-ignore - runtime require for CLI script
      const { seiTestnet } = await import('viem/chains');

      const faucetAccount = privateKeyToAccount(process.env.EXPERIMENTAL_SEI_FAUCET_PRIVATE_KEY as `0x${string}`);
      const publicClient = createPublicClient({ chain: seiTestnet, transport: http() });
      const walletClient = createWalletClient({ chain: seiTestnet, transport: http(), account: faucetAccount });

      // Find a primary or first active wallet for the user
      const wallets = await withTransaction(async (tx) => {
        return await txOperations.getCDPWalletsByUser(userId)(tx);
      });

      const primary = wallets.find((w: any) => w.isPrimary && w.isActive) || wallets.find((w: any) => w.isActive);
      if (!primary) {
        console.log('[SEI FAUCET] No active wallet found for user');
        return;
      }

      const userAddress = primary.walletAddress as `0x${string}`;
      console.log(`[SEI FAUCET] Checking USDC balance for ${userAddress}`);

      const USDC_ADDRESS = '0x4fCF1784B31630811181f670Aea7A7bEF803eaED' as const;
      const USDC_DECIMALS = 6;
      const FUNDING_AMOUNT = '0.5';

      const userUSDCBalance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: [
          {
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }],
          },
        ] as const,
        functionName: 'balanceOf',
        args: [userAddress],
      });

      if (userUSDCBalance === BigInt(0)) {
        const faucetUSDCBalance = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: [
            {
              name: 'balanceOf',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'account', type: 'address' }],
              outputs: [{ name: '', type: 'uint256' }],
            },
          ] as const,
          functionName: 'balanceOf',
          args: [faucetAccount.address],
        });

        const fundingAmountBigInt = parseUnits(FUNDING_AMOUNT, USDC_DECIMALS);
        if (faucetUSDCBalance < fundingAmountBigInt) {
          console.error('[SEI FAUCET] Insufficient faucet USDC balance');
          return;
        }

        const txHash = await walletClient.writeContract({
          address: USDC_ADDRESS,
          abi: [
            {
              name: 'transfer',
              type: 'function',
              stateMutability: 'nonpayable',
              inputs: [
                { name: 'to', type: 'address' },
                { name: 'amount', type: 'uint256' },
              ],
              outputs: [{ name: '', type: 'bool' }],
            },
          ] as const,
          functionName: 'transfer',
          args: [userAddress, fundingAmountBigInt],
        });

        console.log('[SEI FAUCET] Transfer sent:', txHash);
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        console.log('[SEI FAUCET] Receipt:', receipt.status);
      } else {
        console.log('[SEI FAUCET] User already has USDC; skipping funding');
      }
    } catch (err) {
      console.error('[SEI FAUCET] Error funding user:', err);
    }
  }
}

main().catch((err) => {
  console.error('[SCRIPT] Error:', err);
  process.exit(1);
});


