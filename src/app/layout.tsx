import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Customer Support Agent Demo',
  description: 'Example Next.js agent demonstrating Noesis SDK integration',
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
