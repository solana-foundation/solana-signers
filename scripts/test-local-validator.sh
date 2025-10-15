#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

set -e

echo -e "${GREEN}Starting Solana Local Validator Test Script${NC}"

# Load environment variables from .env
if [ -f .env ]; then
    echo -e "${YELLOW}Loading environment variables from .env${NC}"
    export $(grep -v '^#' .env | xargs)
else
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# Get pubkeys from environment
PRIVY_PUBKEY="${PRIVY_WALLET_PUBKEY}"
TURNKEY_PUBKEY="${TURNKEY_PUBLIC_KEY}"

if [ -z "$PRIVY_PUBKEY" ]; then
    echo -e "${RED}Error: PRIVY_WALLET_PUBKEY not set in .env${NC}"
    exit 1
fi

if [ -z "$TURNKEY_PUBKEY" ]; then
    echo -e "${RED}Error: TURNKEY_PUBLIC_KEY not set in .env${NC}"
    exit 1
fi

echo -e "${GREEN}Privy pubkey: ${PRIVY_PUBKEY}${NC}"
echo -e "${GREEN}Turnkey pubkey: ${TURNKEY_PUBKEY}${NC}"

# Check if validator is already running
if pgrep -x "solana-test-validator" > /dev/null; then
    echo -e "${YELLOW}Solana test validator is already running. Killing it...${NC}"
    pkill -9 solana-test-validator || true
    sleep 2
fi

# Clean up ledger directory
echo -e "${YELLOW}Cleaning up old ledger data...${NC}"
rm -rf test-ledger
rm -f validator.log

# Start Solana test validator in background
echo -e "${YELLOW}Starting Solana test validator...${NC}"
solana-test-validator \
    --ledger test-ledger \
    --quiet \
    --reset \
    > validator.log 2>&1 &

VALIDATOR_PID=$!
echo -e "${GREEN}Validator started with PID: ${VALIDATOR_PID}${NC}"

# Wait for validator to start
echo -e "${YELLOW}Waiting for validator to be ready...${NC}"
max_attempts=30
attempt=0
while ! solana cluster-version --url http://localhost:8899 > /dev/null 2>&1; do
    if [ $attempt -ge $max_attempts ]; then
        echo -e "${RED}Validator failed to start within 30 seconds${NC}"
        kill $VALIDATOR_PID || true
        exit 1
    fi
    echo -e "${YELLOW}Waiting for validator... ($attempt/$max_attempts)${NC}"
    sleep 1
    ((attempt++))
done

echo -e "${GREEN}Validator is ready!${NC}"

# Airdrop to test keys
echo -e "${YELLOW}Airdropping 10 SOL to Privy wallet: ${PRIVY_PUBKEY}${NC}"
solana airdrop 10 $PRIVY_PUBKEY --url http://localhost:8899
PRIVY_BALANCE=$(solana balance $PRIVY_PUBKEY --url http://localhost:8899)
echo -e "${GREEN}Privy wallet balance: ${PRIVY_BALANCE}${NC}"

echo -e "${YELLOW}Airdropping 10 SOL to Turnkey wallet: ${TURNKEY_PUBKEY}${NC}"
solana airdrop 10 $TURNKEY_PUBKEY --url http://localhost:8899
TURNKEY_BALANCE=$(solana balance $TURNKEY_PUBKEY --url http://localhost:8899)
echo -e "${GREEN}Turnkey wallet balance: ${TURNKEY_BALANCE}${NC}"

# Export validator URL for tests
export SOLANA_RPC_URL="http://localhost:8899"

# Function to cleanup validator
cleanup() {
    echo -e "\n${YELLOW}Stopping validator...${NC}"
    pkill -f "solana-test-validator" 2>/dev/null || true
    rm -rf test-ledger
    rm -f validator.log
    exit 0
}

# Trap signals for cleanup
trap cleanup INT TERM EXIT

# Wait for external process to finish or signal
echo -e "${GREEN}Validator is running. Waiting for tests to complete...${NC}"
echo -e "${YELLOW}Validator PID: ${VALIDATOR_PID}${NC}"
echo -e "${YELLOW}To stop manually: kill ${VALIDATOR_PID}${NC}"

# Wait for validator process to exit or be killed
wait $VALIDATOR_PID
