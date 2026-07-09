import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcoMatter AI-QLab",
  description: "AI-powered inverse materials design — AI Living for India",
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
