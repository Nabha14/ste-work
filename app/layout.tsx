import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/lib/wallet-context";
import Navbar from "@/components/layout/Navbar";
import OnboardingModal from "@/components/ui/OnboardingModal";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "StellarWork — Decentralized Freelance Escrow",
  description: "Milestone-based freelance escrow powered by Soroban smart contracts on Stellar. No middlemen, no fees, no trust required.",
  keywords: ["stellar", "soroban", "freelance", "escrow", "web3", "blockchain", "smart contracts", "defi"],
  authors: [{ name: "StellarWork" }],
  openGraph: {
    title: "StellarWork — Decentralized Freelance Escrow",
    description: "Milestone-based freelance escrow powered by Soroban smart contracts on Stellar. No middlemen, no fees, no trust required.",
    url: "https://ste-work.vercel.app",
    siteName: "StellarWork",
    type: "website",
    images: [
      {
        url: "https://ste-work.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "StellarWork — Trustless Freelancing on Stellar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StellarWork — Decentralized Freelance Escrow",
    description: "Milestone-based freelance escrow powered by Soroban smart contracts on Stellar.",
    images: ["https://ste-work.vercel.app/og-image.png"],
  },
  metadataBase: new URL("https://ste-work.vercel.app"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ background: "#0a0a0a", color: "#fff" }}>
        <WalletProvider>
          <Navbar />
          <OnboardingModal />
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
