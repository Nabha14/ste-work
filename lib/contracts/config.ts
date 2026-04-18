export const NETWORK = process.env.NEXT_PUBLIC_NETWORK as "testnet" | "mainnet";
export const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL!;
export const SOROBAN_RPC = process.env.NEXT_PUBLIC_SOROBAN_RPC!;
export const ESCROW_CONTRACT_ID = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ID!;
export const WORK_TOKEN_CONTRACT_ID = process.env.NEXT_PUBLIC_WORK_TOKEN_CONTRACT_ID!;
export const NATIVE_TOKEN = process.env.NEXT_PUBLIC_NATIVE_TOKEN!;

export const NETWORK_PASSPHRASE =
  NETWORK === "testnet"
    ? "Test SDF Network ; September 2015"
    : "Public Global Stellar Network ; September 2015";
