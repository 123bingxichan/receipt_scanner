import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Receipt Scan",
  description: "Scan receipts and track personal spending."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
