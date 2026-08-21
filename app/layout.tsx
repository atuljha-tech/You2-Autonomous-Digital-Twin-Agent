import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ConditionalLayout from "@/components/ConditionalLayout";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "You² — Your Autonomous Digital Twin Agent",
  description: "An AI agent that learns your behavior, simulates your future decisions, and guides you in real-time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--bg-primary)] flex flex-col relative text-[var(--text-primary)]">
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  );
}
