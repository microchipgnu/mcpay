import type { PaymentRequirements } from "x402/types";

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
  paymentRequirements: PaymentRequirements[];
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


