import type { Network } from './blockchain';

export interface UserWallet {
  id: string;
  userId: string;
  walletAddress: string;
  blockchain: string;
  walletType: 'external' | 'managed' | 'custodial';
  provider?: string;
  isPrimary: boolean;
  isActive: boolean;
  walletMetadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BalancesByChain {
  mainnetBalancesByChain: Partial<Record<Network, unknown[]>>;
  testnetBalancesByChain: Partial<Record<Network, unknown[]>>;
}
