import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/lib/wallet-context";
import Navbar from "@/components/layout/Navbar";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "StellarWork — Decentralized Freelance Escrow",
  description: "Milestone-based freelance escrow powered by Soroban smart contracts on Stellar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ background: "#0a0a0a", color: "#fff" }}>
        <WalletProvider>
          <Navbar />
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
