import "./globals.css";

export const metadata = {
  title: "ZKSpin - Zcash Testnet Block Roulette",
  description: "A test-credit roulette demo with deterministic results derived from CipherScan-reported Zcash testnet block hashes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
