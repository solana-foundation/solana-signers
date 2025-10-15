# Manual Testing Scripts

Scripts for testing signer implementations with real API credentials.

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cd scripts
   cp .env.example .env
   ```

2. Fill in your credentials in `.env`

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Run a test script:
   ```bash
   pnpm test:privy
   ```

## Available Scripts

- `pnpm test:privy` - Test Privy signer with a simple memo transaction

## Security Notes

- Never commit the `.env` file (it's gitignored)
- Use devnet/testnet for testing
- These scripts are for manual testing only, not automated tests
