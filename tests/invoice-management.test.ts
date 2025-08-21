import { describe, it, expect, beforeEach } from "vitest";

type Invoice = {
  issuer: string;
  recipient: string;
  amount: bigint;
  currency: string;
  issueDate: bigint;
  dueDate: bigint;
  status: bigint;
  verified: boolean;
  description: string;
};

const mockContract = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  oracle: "ST000000000000000000002AMW42H",
  paused: false,
  invoiceCounter: 0n,
  invoices: new Map<string, Invoice>(),
  invoiceHashes: new Map<string, bigint>(),
  STATUS_PENDING: 0n,
  STATUS_APPROVED: 1n,
  STATUS_PAID: 2n,
  STATUS_DISPUTED: 3n,
  STATUS_CANCELLED: 4n,

  isAdmin(caller: string): boolean {
    return caller === this.admin;
  },

  isValidStatus(status: bigint): boolean {
    return [
      this.STATUS_PENDING,
      this.STATUS_APPROVED,
      this.STATUS_PAID,
      this.STATUS_DISPUTED,
      this.STATUS_CANCELLED,
    ].includes(status);
  },

  setPaused(caller: string, pause: boolean): { value: boolean } | { error: number } {
    if (!this.isAdmin(caller)) return { error: 100 };
    this.paused = pause;
    return { value: pause };
  },

  setOracle(caller: string, newOracle: string): { value: boolean } | { error: number } {
    if (!this.isAdmin(caller)) return { error: 100 };
    if (newOracle === "SP000000000000000000002Q6VF78") return { error: 105 };
    this.oracle = newOracle;
    return { value: true };
  },

  createInvoice(
    caller: string,
    recipient: string,
    amount: bigint,
    currency: string,
    dueDate: bigint,
    description: string,
    invoiceHash: string,
    blockHeight: bigint
  ): { value: bigint } | { error: number } {
    if (this.paused) return { error: 104 };
    if (recipient === "SP000000000000000000002Q6VF78") return { error: 105 };
    if (amount <= 0n) return { error: 101 };
    if (dueDate <= blockHeight) return { error: 101 };
    if (this.invoiceHashes.has(invoiceHash)) return { error: 102 };
    const invoiceId = this.invoiceCounter + 1n;
    this.invoices.set(invoiceId.toString(), {
      issuer: caller,
      recipient,
      amount,
      currency,
      issueDate: blockHeight,
      dueDate,
      status: this.STATUS_PENDING,
      verified: false,
      description,
    });
    this.invoiceHashes.set(invoiceHash, invoiceId);
    this.invoiceCounter = invoiceId;
    return { value: invoiceId };
  },

  updateStatus(
    caller: string,
    invoiceId: bigint,
    newStatus: bigint
  ): { value: boolean } | { error: number } {
    if (this.paused) return { error: 104 };
    if (!this.isValidStatus(newStatus)) return { error: 106 };
    const invoice = this.invoices.get(invoiceId.toString());
    if (!invoice) return { error: 103 };
    if (caller !== invoice.issuer) return { error: 100 };
    this.invoices.set(invoiceId.toString(), { ...invoice, status: newStatus });
    return { value: true };
  },

  verifyInvoice(caller: string, invoiceId: bigint): { value: boolean } | { error: number } {
    if (this.paused) return { error: 104 };
    if (caller !== this.oracle) return { error: 100 };
    const invoice = this.invoices.get(invoiceId.toString());
    if (!invoice) return { error: 103 };
    if (invoice.verified) return { error: 107 };
    this.invoices.set(invoiceId.toString(), { ...invoice, verified: true });
    return { value: true };
  },

  cancelInvoice(caller: string, invoiceId: bigint): { value: boolean } | { error: number } {
    if (this.paused) return { error: 104 };
    const invoice = this.invoices.get(invoiceId.toString());
    if (!invoice) return { error: 103 };
    if (caller !== invoice.issuer) return { error: 100 };
    if (invoice.status !== this.STATUS_PENDING) return { error: 106 };
    this.invoices.set(invoiceId.toString(), { ...invoice, status: this.STATUS_CANCELLED });
    return { value: true };
  },

  getInvoice(invoiceId: bigint): { value: Invoice } | { error: number } {
    const invoice = this.invoices.get(invoiceId.toString());
    if (!invoice) return { error: 103 };
    return { value: invoice };
  },
};

describe("Invoice Management Contract", () => {
  beforeEach(() => {
    mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.oracle = "ST000000000000000000002AMW42H";
    mockContract.paused = false;
    mockContract.invoiceCounter = 0n;
    mockContract.invoices = new Map();
    mockContract.invoiceHashes = new Map();
  });

  it("should create an invoice", () => {
    const result = mockContract.createInvoice(
      "ST2CY5...",
      "ST3NB...",
      1000n,
      "USD",
      1000n,
      "Trade invoice for goods",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      500n
    );
    expect(result).toEqual({ value: 1n });
    const invoice = mockContract.invoices.get("1");
    expect(invoice).toEqual({
      issuer: "ST2CY5...",
      recipient: "ST3NB...",
      amount: 1000n,
      currency: "USD",
      issueDate: 500n,
      dueDate: 1000n,
      status: 0n,
      verified: false,
      description: "Trade invoice for goods",
    });
  });

  it("should prevent creating invoice with zero amount", () => {
    const result = mockContract.createInvoice(
      "ST2CY5...",
      "ST3NB...",
      0n,
      "USD",
      1000n,
      "Invalid invoice",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      500n
    );
    expect(result).toEqual({ error: 101 });
  });

  it("should prevent creating duplicate invoice hash", () => {
    mockContract.createInvoice(
      "ST2CY5...",
      "ST3NB...",
      1000n,
      "USD",
      1000n,
      "Trade invoice",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      500n
    );
    const result = mockContract.createInvoice(
      "ST2CY5...",
      "ST3NB...",
      2000n,
      "USD",
      1000n,
      "Another invoice",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      500n
    );
    expect(result).toEqual({ error: 102 });
  });

  it("should update invoice status", () => {
    mockContract.createInvoice(
      "ST2CY5...",
      "ST3NB...",
      1000n,
      "USD",
      1000n,
      "Trade invoice",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      500n
    );
    const result = mockContract.updateStatus("ST2CY5...", 1n, mockContract.STATUS_APPROVED);
    expect(result).toEqual({ value: true });
    const invoice = mockContract.invoices.get("1");
    expect(invoice?.status).toBe(mockContract.STATUS_APPROVED);
  });

  it("should prevent non-issuer from updating status", () => {
    mockContract.createInvoice(
      "ST2CY5...",
      "ST3NB...",
      1000n,
      "USD",
      1000n,
      "Trade invoice",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      500n
    );
    const result = mockContract.updateStatus("ST4RE5...", 1n, mockContract.STATUS_APPROVED);
    expect(result).toEqual({ error: 100 });
  });

  it("should verify invoice by oracle", () => {
    mockContract.createInvoice(
      "ST2CY5...",
      "ST3NB...",
      1000n,
      "USD",
      1000n,
      "Trade invoice",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      500n
    );
    const result = mockContract.verifyInvoice(mockContract.oracle, 1n);
    expect(result).toEqual({ value: true });
    const invoice = mockContract.invoices.get("1");
    expect(invoice?.verified).toBe(true);
  });

  it("should prevent non-oracle from verifying invoice", () => {
    mockContract.createInvoice(
      "ST2CY5...",
      "ST3NB...",
      1000n,
      "USD",
      1000n,
      "Trade invoice",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      500n
    );
    const result = mockContract.verifyInvoice("ST4RE5...", 1n);
    expect(result).toEqual({ error: 100 });
  });

  it("should cancel invoice", () => {
    mockContract.createInvoice(
      "ST2CY5...",
      "ST3NB...",
      1000n,
      "USD",
      1000n,
      "Trade invoice",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      500n
    );
    const result = mockContract.cancelInvoice("ST2CY5...", 1n);
    expect(result).toEqual({ value: true });
    const invoice = mockContract.invoices.get("1");
    expect(invoice?.status).toBe(mockContract.STATUS_CANCELLED);
  });

  it("should not allow operations when paused", () => {
    mockContract.setPaused(mockContract.admin, true);
    const result = mockContract.createInvoice(
      "ST2CY5...",
      "ST3NB...",
      1000n,
      "USD",
      1000n,
      "Trade invoice",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      500n
    );
    expect(result).toEqual({ error: 104 });
  });
});