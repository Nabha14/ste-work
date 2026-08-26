#!/usr/bin/env bash

# Build and redeploy StellarWork's two Soroban contracts to Stellar testnet.
# This script intentionally prints the new IDs instead of rewriting .env.local:
# review the output, update the frontend configuration, and deploy the frontend
# only after both initialize calls have succeeded.

set -euo pipefail

NETWORK="${NETWORK:-testnet}"
ADMIN_ALIAS="${ADMIN_ALIAS:?Set ADMIN_ALIAS to a funded Stellar CLI identity, e.g. ADMIN_ALIAS=admin}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS_DIR="$PROJECT_ROOT/contracts"
WASM_DIR="$CONTRACTS_DIR/target/wasm32v1-none/release"

if [[ "$NETWORK" != "testnet" ]]; then
  echo "This safety-guarded script only deploys to testnet."
  exit 1
fi

ADMIN_ADDRESS="$(stellar keys address "$ADMIN_ALIAS")"

cd "$CONTRACTS_DIR"
stellar contract build

WORK_TOKEN_WASM="$WASM_DIR/work_token.wasm"
ESCROW_WASM="$WASM_DIR/escrow_contract.wasm"
[[ -f "$WORK_TOKEN_WASM" ]] || { echo "Missing $WORK_TOKEN_WASM"; exit 1; }
[[ -f "$ESCROW_WASM" ]] || { echo "Missing $ESCROW_WASM"; exit 1; }

WORK_TOKEN_ID="$(stellar contract deploy \
  --source-account "$ADMIN_ALIAS" \
  --sign-with-key "$ADMIN_ALIAS" \
  --network "$NETWORK" \
  --wasm "$WORK_TOKEN_WASM")"

ESCROW_CONTRACT_ID="$(stellar contract deploy \
  --source-account "$ADMIN_ALIAS" \
  --sign-with-key "$ADMIN_ALIAS" \
  --network "$NETWORK" \
  --wasm "$ESCROW_WASM")"

NATIVE_TOKEN_ID="$(stellar contract id asset --asset native --network "$NETWORK")"

stellar contract invoke \
  --id "$ESCROW_CONTRACT_ID" \
  --source-account "$ADMIN_ALIAS" \
  --sign-with-key "$ADMIN_ALIAS" \
  --network "$NETWORK" \
  --send=yes \
  -- initialize \
  --admin "$ADMIN_ADDRESS" \
  --work-token "$WORK_TOKEN_ID" \
  --xlm-token "$NATIVE_TOKEN_ID"

stellar contract invoke \
  --id "$WORK_TOKEN_ID" \
  --source-account "$ADMIN_ALIAS" \
  --sign-with-key "$ADMIN_ALIAS" \
  --network "$NETWORK" \
  --send=yes \
  -- initialize \
  --admin "$ADMIN_ADDRESS" \
  --escrow-contract "$ESCROW_CONTRACT_ID"

printf '\nDeployment complete. Update .env.local with:\n'
printf 'NEXT_PUBLIC_NETWORK=testnet\n'
printf 'NEXT_PUBLIC_ESCROW_CONTRACT_ID=%s\n' "$ESCROW_CONTRACT_ID"
printf 'NEXT_PUBLIC_WORK_TOKEN_CONTRACT_ID=%s\n' "$WORK_TOKEN_ID"
printf 'NEXT_PUBLIC_NATIVE_TOKEN=%s\n' "$NATIVE_TOKEN_ID"
printf '\nExplorer:\nhttps://stellar.expert/explorer/testnet/contract/%s\n' "$ESCROW_CONTRACT_ID"
