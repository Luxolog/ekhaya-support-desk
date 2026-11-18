import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ekhaya Support Desk',
  description: 'Customer support workspace by Ekhaya Technologies.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
