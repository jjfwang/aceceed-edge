.PHONY: setup dev prod lint format test

setup:
	pnpm install

dev:
	pnpm -C apps/edge-runtime dev

prod:
	pnpm -C apps/edge-runtime start

lint:
	pnpm lint

format:
	pnpm format

test:
	pnpm test
