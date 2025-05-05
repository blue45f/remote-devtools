import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Remote Debug Tools - Test Page",
  description: "Test page for Remote Debug Tools SDK",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script src="https://localhost:4991" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
