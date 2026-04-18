"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { NETWORK_PASSPHRASE } from "./contracts/config";

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (xdr: string) => Promise<string>;
  network: string;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  isConnected: false,
  isConnecting: false,
  connect: async () => {},
  disconnect: () => {},
  signTransaction: async () => "",
  network: "testnet",
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sw_wallet");
    if (saved) setAddress(saved);
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      if (typeof window !== "undefined" && (window as any).freighter) {
        const freighter = (window as any).freighter;
        await freighter.setAllowed();
        const { publicKey } = await freighter.getPublicKey();
        setAddress(publicKey);
        localStorage.setItem("sw_wallet", publicKey);
      } else {
        // Freighter not installed — show install prompt
        window.open("https://www.freighter.app/", "_blank");
      }
    } catch (e) {
      console.error("Wallet connect failed", e);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    localStorage.removeItem("sw_wallet");
  }, []);

  const signTransaction = useCallback(async (xdr: string): Promise<string> => {
    if (typeof window === "undefined" || !(window as any).freighter) {
      throw new Error("Freighter not installed");
    }
    const freighter = (window as any).freighter;
    const { signedTxXdr } = await freighter.signTransaction(xdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
    });
    return signedTxXdr;
  }, []);

  return (
    <WalletContext.Provider value={{
      address,
      isConnected: !!address,
      isConnecting,
      connect,
      disconnect,
      signTransaction,
      network: "testnet",
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
