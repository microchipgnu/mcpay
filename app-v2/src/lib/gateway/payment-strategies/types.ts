import type { ExtendedPaymentRequirements } from "@/types/x402";

export interface PaymentSigningContext {
  toolCall: {
    isPaid: boolean;
    payment: {
      maxAmountRequired: string;
      network: string;
      asset: string;
      payTo?: string;
      resource: string;
      description: string;
    };
  };
  user: {
    id: string;
    email?: string;
    name?: string;
    displayName?: string;
  };
  paymentRequirements: ExtendedPaymentRequirements[];
}

export interface PaymentSigningResult {
  success: boolean;
  signedPaymentHeader?: string;
  error?: string;
  strategy?: string;
  walletAddress?: string;
}

export interface PaymentSigningStrategy {
  name: string;
  priority: number;
  canSign(context: PaymentSigningContext): Promise<boolean>;
  signPayment(context: PaymentSigningContext): Promise<PaymentSigningResult>;
}


