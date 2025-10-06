.PHONY: fmt

fmt:
	@echo "Formatting code..."
	@cargo fmt
	@cargo clippy --all-targets --all-features -- -D warnings

test:
	@echo "Running tests..."
	@cargo test --all-features