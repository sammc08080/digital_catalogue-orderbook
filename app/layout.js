import './globals.css';

export const metadata = {
  title: 'Catalogue & Order Book | TechIngen Solutions',
  description: 'Product catalogue and order book for businesses',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
