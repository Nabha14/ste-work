// Stellar RPC client — reads/writes real on-chain contract state
// Zero mock data: all data fetched from Stellar testnet via Soroban RPC
import {
  Contract,
  rpc as SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
} from "@stellar/stellar-sdk";
import {
  SOROBAN_RPC,
  ESCROW_CONTRACT_ID,
  WORK_TOKEN_CONTRACT_ID,
  NETWORK_PASSPHRASE,
  NATIVE_TOKEN,
} from "./config";

// ── RPC server ────────────────────────────────────────────────────────────────

export function getRpc() {
  return new SorobanRpc.Server(SOROBAN_RPC, { allowHttp: false });
}

// ── Types mirroring the Rust structs ─────────────────────────────────────────

export type MilestoneStatus = "Locked" | "Submitted" | "Approved" | "Disputed";

export interface Milestone {
  title: string;
  amount: bigint;
  status: MilestoneStatus;
  deliverable: string;
  deadline: bigint;
}

export interface Job {
  id: bigint;
  title: string;
  description: string;
  client: string;
  freelancer: string | null;
  token: string;
  total: bigint;
  milestones: Milestone[];
  created_at: bigint;
  is_open: boolean;
}

// ── ScVal helpers ─────────────────────────────────────────────────────────────

function addressToScVal(addr: string) {
  return new Address(addr).toScVal();
}

function scValToJob(val: xdr.ScVal): Job {
  const map = scValToNative(val) as Record<string, unknown>;
  return {
    id:          BigInt(map.id as number),
    title:       map.title as string,
    description: map.description as string,
    client:      map.client as string,
    freelancer:  (map.freelancer as string | null | undefined) ?? null,
    token:       map.token as string,
    total:       BigInt(map.total as number),
    milestones:  (map.milestones as unknown[]).map((m: unknown) => {
      const ms = m as Record<string, unknown>;
      return {
        title:       ms.title as string,
        amount:      BigInt(ms.amount as number),
        status:      ms.status as MilestoneStatus,
        deliverable: ms.deliverable as string,
        deadline:    BigInt(ms.deadline as number),
      };
    }),
    created_at:  BigInt(map.created_at as number),
    is_open:     map.is_open as boolean,
  };
}

// ── Simulate (read-only) ──────────────────────────────────────────────────────
// Uses a well-known funded testnet account for simulation only

// Stellar testnet friendbot-funded account for read-only simulations
const SIM_ACCOUNT = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

async function simulate(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
): Promise<xdr.ScVal> {
  const rpc = getRpc();

  // Build a minimal account object — sequence number doesn't matter for simulation
  const account = {
    accountId: () => SIM_ACCOUNT,
    sequenceNumber: () => "0",
    incrementSequenceNumber: () => {},
  };

  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(account as any, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const result = await rpc.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(result)) {
    throw new Error(`Simulation error: ${(result as any).error}`);
  }

  const success = result as SorobanRpc.Api.SimulateTransactionSuccessResponse;
  if (!success.result) {
    throw new Error("No result from simulation");
  }
  return success.result.retval;
}

// ── Read functions ────────────────────────────────────────────────────────────

export async function getJobCount(): Promise<bigint> {
  const val = await simulate(ESCROW_CONTRACT_ID, "job_count", []);
  const native = scValToNative(val);
  return BigInt(native as number | string);
}

export async function getJob(jobId: bigint): Promise<Job> {
  const val = await simulate(ESCROW_CONTRACT_ID, "get_job", [
    nativeToScVal(Number(jobId), { type: "u64" }),
  ]);
  return scValToJob(val);
}

export async function listJobs(offset: bigint, limit: bigint): Promise<Job[]> {
  // First check count — if 0, return early
  const count = await getJobCount();
  if (count === 0n) return [];

  const idsVal = await simulate(ESCROW_CONTRACT_ID, "list_jobs", [
    nativeToScVal(Number(offset), { type: "u64" }),
    nativeToScVal(Number(limit),  { type: "u64" }),
  ]);

  const ids = scValToNative(idsVal) as (number | bigint)[];
  if (!ids || ids.length === 0) return [];

  const jobs = await Promise.all(ids.map(id => getJob(BigInt(id))));
  return jobs;
}

export async function getWorkTokenBalance(address: string): Promise<bigint> {
  try {
    const val = await simulate(WORK_TOKEN_CONTRACT_ID, "balance", [
      addressToScVal(address),
    ]);
    return BigInt(scValToNative(val) as number);
  } catch {
    return 0n;
  }
}

export async function getWorkTokenSupply(): Promise<bigint> {
  const val = await simulate(WORK_TOKEN_CONTRACT_ID, "total_supply", []);
  return BigInt(scValToNative(val) as number);
}

// ── Write helpers (return assembled+simulated tx for Freighter to sign) ───────

export async function buildPostJobTx(
  clientAddress: string,
  title: string,
  description: string,
  milestoneTitles: string[],
  milestoneAmounts: bigint[],
  milestoneDeadlines: bigint[],
): Promise<string> {
  const rpc = getRpc();
  const account = await rpc.getAccount(clientAddress);
  const contract = new Contract(ESCROW_CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "post_job",
        addressToScVal(clientAddress),
        addressToScVal(NATIVE_TOKEN),
        nativeToScVal(title,       { type: "string" }),
        nativeToScVal(description, { type: "string" }),
        xdr.ScVal.scvVec(milestoneTitles.map(t => nativeToScVal(t, { type: "string" }))),
        xdr.ScVal.scvVec(milestoneAmounts.map(a => nativeToScVal(Number(a), { type: "i128" }))),
        xdr.ScVal.scvVec(milestoneDeadlines.map(d => nativeToScVal(Number(d), { type: "u64" }))),
      ),
    )
    .setTimeout(30)
    .build();

  const simResult = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation error: ${simResult.error}`);
  }
  const assembled = SorobanRpc.assembleTransaction(tx, simResult).build();
  return assembled.toXDR();
}

export async function buildAcceptJobTx(
  freelancerAddress: string,
  jobId: bigint,
): Promise<string> {
  const rpc = getRpc();
  const account = await rpc.getAccount(freelancerAddress);
  const contract = new Contract(ESCROW_CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "accept_job",
        nativeToScVal(Number(jobId), { type: "u64" }),
        addressToScVal(freelancerAddress),
      ),
    )
    .setTimeout(30)
    .build();

  const simResult = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation error: ${simResult.error}`);
  }
  return SorobanRpc.assembleTransaction(tx, simResult).build().toXDR();
}

export async function buildSubmitMilestoneTx(
  freelancerAddress: string,
  jobId: bigint,
  milestoneIndex: number,
  deliverable: string,
): Promise<string> {
  const rpc = getRpc();
  const account = await rpc.getAccount(freelancerAddress);
  const contract = new Contract(ESCROW_CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "submit_milestone",
        nativeToScVal(Number(jobId),        { type: "u64" }),
        nativeToScVal(milestoneIndex,        { type: "u32" }),
        nativeToScVal(deliverable,           { type: "string" }),
      ),
    )
    .setTimeout(30)
    .build();

  const simResult = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation error: ${simResult.error}`);
  }
  return SorobanRpc.assembleTransaction(tx, simResult).build().toXDR();
}

export async function buildApproveMilestoneTx(
  clientAddress: string,
  jobId: bigint,
  milestoneIndex: number,
): Promise<string> {
  const rpc = getRpc();
  const account = await rpc.getAccount(clientAddress);
  const contract = new Contract(ESCROW_CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "approve_milestone",
        nativeToScVal(Number(jobId),      { type: "u64" }),
        nativeToScVal(milestoneIndex,      { type: "u32" }),
      ),
    )
    .setTimeout(30)
    .build();

  const simResult = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation error: ${simResult.error}`);
  }
  return SorobanRpc.assembleTransaction(tx, simResult).build().toXDR();
}

// ── Submit signed tx ──────────────────────────────────────────────────────────

export async function submitSignedTx(signedXdr: string): Promise<string> {
  const rpc = getRpc();
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const result = await rpc.sendTransaction(tx);
  if (result.status === "ERROR") {
    throw new Error(`Transaction failed: ${JSON.stringify(result.errorResult)}`);
  }
  // Poll for confirmation
  let getResult = await rpc.getTransaction(result.hash);
  let attempts = 0;
  while (getResult.status === "NOT_FOUND" && attempts < 20) {
    await new Promise(r => setTimeout(r, 1500));
    getResult = await rpc.getTransaction(result.hash);
    attempts++;
  }
  if (getResult.status === "FAILED") {
    throw new Error("Transaction failed on chain");
  }
  return result.hash;
}
