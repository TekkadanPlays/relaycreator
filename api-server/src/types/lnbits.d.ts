declare module "lnbits" {
  interface LNBitsConfig {
    adminKey: string;
    invoiceReadKey: string;
    endpoint: string;
  }

  interface CreateInvoiceParams {
    amount: number;
    memo: string;
    out: boolean;
  }

  interface Invoice {
    payment_hash: string;
    payment_request?: string;
    bolt11?: string;
  }

  interface Wallet {
    createInvoice(params: CreateInvoiceParams): Promise<Invoice>;
    payInvoice(params: { bolt11: string }): Promise<any>;
    getInvoiceStatus(params: { payment_hash: string }): Promise<any>;
  }

  interface LNBitsInstance {
    wallet: Wallet;
  }

  function LNBits(config: LNBitsConfig): LNBitsInstance;
  export default LNBits;
}
