.PHONY: fmt build test

INTEGRATION_TESTS := test_privy_integration test_turnkey_integration
SDKV2_ALL_FEATURES := all,sdk-v2,unsafe-debug,integration-tests,integration-test-simulation
SDKV3_ALL_FEATURES := all,sdk-v3,unsafe-debug,integration-tests,integration-test-simulation

fmt:
	@echo "Formatting code..."
	@cargo fmt
	@echo "Running clippy with SDK v2..."
	@cargo clippy --all-targets --no-default-features --features $(SDKV2_ALL_FEATURES) -- -D warnings
	@echo "Running clippy with SDK v3..."
	@cargo clippy --all-targets --no-default-features --features $(SDKV3_ALL_FEATURES) -- -D warnings

test:
	@echo "Running tests with SDK v2..."
	@cargo test --no-default-features --features all,sdk-v2,unsafe-debug
	@echo "Running tests with SDK v3..."
	@cargo test --no-default-features --features all,sdk-v3,unsafe-debug

test-integration:
	@echo "Running integration tests with SDK v2..."
	@for test in $(INTEGRATION_TESTS); do \
		cargo test --no-default-features --features all,sdk-v2,unsafe-debug,integration-tests tests::$$test:: || exit 1; \
	done
	@echo "Running integration tests with SDK v3..."
	@for test in $(INTEGRATION_TESTS); do \
		cargo test --no-default-features --features all,sdk-v3,unsafe-debug,integration-tests tests::$$test:: || exit 1; \
	done

test-integration-simulation:
	@echo "Starting local validator and running integration tests..."
	@chmod +x scripts/test-local-validator.sh
	@scripts/test-local-validator.sh &
	@VALIDATOR_PID=$$!; \
	echo "Validator started with PID: $$VALIDATOR_PID"; \
	sleep 15; \
	echo "Running integration tests with SDK v2..."; \
	for test in $(INTEGRATION_TESTS); do \
		cargo test --no-default-features --features $(SDKV2_ALL_FEATURES) tests::$$test:: || (kill $$VALIDATOR_PID; wait $$VALIDATOR_PID; exit 1); \
	done; \
	echo "Running integration tests with SDK v3..."; \
	for test in $(INTEGRATION_TESTS); do \
		cargo test --no-default-features --features $(SDKV3_ALL_FEATURES) tests::$$test:: || (kill $$VALIDATOR_PID; wait $$VALIDATOR_PID; exit 1); \
	done; \
	echo "Tests completed. Stopping validator..."; \
	kill $$VALIDATOR_PID; \
	wait $$VALIDATOR_PID; \
	echo "Validator stopped successfully"

test-all: test test-integration

build:
	@echo "Building with SDK v2..."
	@cargo build --features all,sdk-v2
	@echo "Building with SDK v3..."
	@cargo build --no-default-features --features all,sdk-v3