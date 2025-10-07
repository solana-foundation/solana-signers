.PHONY: fmt build test

fmt:
	@echo "Formatting code..."
	@cargo fmt
	@cargo clippy --all-targets --all-features -- -D warnings

test:
	@echo "Running tests..."
	@cargo test --all-features

build:
	@echo "Building..."
	@cargo build --all-features