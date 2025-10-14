.PHONY: fmt build test

fmt:
	@echo "Formatting code..."
	@cargo fmt
	@echo "Running clippy with SDK v2..."
	@cargo clippy --all-targets --features all,sdk-v2,unsafe-debug -- -D warnings
	@echo "Running clippy with SDK v3..."
	@cargo clippy --all-targets --no-default-features --features all,sdk-v3,unsafe-debug -- -D warnings

test:
	@echo "Running tests with SDK v2..."
	@cargo test --features all,sdk-v2,unsafe-debug
	@echo "Running tests with SDK v3..."
	@cargo test --no-default-features --features all,sdk-v3,unsafe-debug

build:
	@echo "Building with SDK v2..."
	@cargo build --features all,sdk-v2
	@echo "Building with SDK v3..."
	@cargo build --no-default-features --features all,sdk-v3