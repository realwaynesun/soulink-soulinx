#!/usr/bin/env bash
# Deploy SoulinXPool to X Layer mainnet
# Usage: ./scripts/deploy-pool.sh
# Requires: DEPLOYER_PRIVATE_KEY, FEE_RECIPIENT env vars

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTRACTS_DIR="$(cd "$SCRIPT_DIR/../../contracts" && pwd)"

if [ -z "${DEPLOYER_PRIVATE_KEY:-}" ]; then
  echo "ERROR: Set DEPLOYER_PRIVATE_KEY env var"
  exit 1
fi

if [ -z "${FEE_RECIPIENT:-}" ]; then
  echo "ERROR: Set FEE_RECIPIENT env var"
  exit 1
fi

echo "=== Deploying SoulinXPool to X Layer mainnet ==="
echo "Contracts dir: $CONTRACTS_DIR"

cd "$CONTRACTS_DIR"

forge script DeploySoulinXPool \
  --profile xlayer \
  --rpc-url xlayer \
  --broadcast \
  --slow \
  -vvv

echo ""
echo "=== Deployment complete ==="
echo "Find the contract address in the output above."
echo "Update soulinx/.env with POOL_CONTRACT_ADDRESS=<address>"
