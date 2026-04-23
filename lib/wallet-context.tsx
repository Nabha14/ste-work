"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  isConnected as freighterIsConnected,
  requestAccess,
  getAddress,
  signTransaction as freighterSign,
} from "@stellar/freighter-api";
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
  const [address, setAddress]           = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Restore session — verify Freighter still has the same account before trusting localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sw_wallet");
    if (!saved) return;

    // Silently verify the saved address still matches Freighter's current account
    (async () => {
      try {
        const connected = await freighterIsConnected();
        if (!connected) {
          // Freighter not available or locked — clear stale session
          localStorage.removeItem("sw_wallet");
          return;
        }
        const result = await getAddress();
        if (result.error || result.address !== saved) {
          // Account changed or error — clear stale session
          localStorage.removeItem("sw_wallet");
          return;
        }
        setAddress(saved);
      } catch {
        // If anything fails, clear the stale session rather than showing wrong address
        localStorage.removeItem("sw_wallet");
      }
    })();
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Check if Freighter is installed
      const connected = await freighterIsConnected();
      if (!connected) {
        alert(
          "Freighter not detected.\n\n" +
          "Please:\n" +
          "1. Install Freighter from freighter.app\n" +
          "2. Refresh this page\n" +
          "3. Try connecting again"
        );
        window.open("https://www.freighter.app/", "_blank");
        return;
      }

      // Request access (shows Freighter popup)
      const accessResult = await requestAccess();
      if (accessResult.error) {
        throw new Error(accessResult.error);
      }

      // Get the public key
      const addressResult = await getAddress();
      if (addressResult.error) {
        throw new Error(addressResult.error);
      }

      const pub = addressResult.address;
      setAddress(pub);
      localStorage.setItem("sw_wallet", pub);
    } catch (e: any) {
      console.error("Wallet connect failed:", e);
      if (!e.message?.toLowerCase().includes("declined")) {
        alert(`Connection failed: ${e.message}`);
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    localStorage.removeItem("sw_wallet");
  }, []);

  const signTransaction = useCallback(async (xdr: string): Promise<string> => {
    const result = await freighterSign(xdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
    });
    if (result.error) throw new Error(result.error);
    return result.signedTxXdr;
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
