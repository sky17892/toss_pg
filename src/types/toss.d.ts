declare global {
  interface Window {
    TossPayments: {
      checkout: (clientKey: string, options: TossPaymentOptions) => Promise<void>;
    }
  }
}

export interface TossPaymentOptions {
  amount: number;
  orderId: string;
  orderName: string;
  customerName: string;
  successUrl: string;
  failUrl: string;
  windowTarget?: string;
} 