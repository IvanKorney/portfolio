import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ivan@korneychuk:~ — portfolio",
  description:
    "Terminal-style portfolio of Ivan Korneychuk — Computer Engineering @ Waterloo, fullstack & backend engineer.",
  openGraph: {
    title: "Ivan Korneychuk — Terminal Portfolio",
    description:
      "Type `help` to explore. Fullstack/backend engineer, Computer Engineering @ Waterloo.",
    type: "website",
  },
  icons: {
    icon:
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='18' fill='%2311141b'/><text x='14' y='66' font-family='monospace' font-size='56' fill='%237dd3fc'>&gt;_</text></svg>",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="modern" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
