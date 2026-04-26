# OCR Service Layer

Put OCR provider adapters here. Keep the rest of the app behind a stable interface so the provider can change later without touching receipt review or dashboard code.

Recommended interface:

```ts
export type ExtractReceiptInput = {
  imageUrl: string;
  mimeType: string;
};

export type ExtractReceiptResult = {
  merchantName?: string;
  purchasedAt?: string;
  total?: number;
  subtotal?: number;
  tax?: number;
  currency?: string;
  lineItems: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    total?: number;
  }>;
  confidence: number;
};
```
