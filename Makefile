.DEFAULT_GOAL := help
.PHONY: help install dev build preview test test-watch typecheck check new-concept logo clean distclean

NPM ?= npm

help: ## Show this help
	@printf "\033[1mUNDERHOOD\033[0m — Make the invisible visible\n\nUsage: make \033[36m<target>\033[0m\n\n"
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z_-]+:.*## / {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@printf "\nAdd a concept:  make new-concept ID=b-tree TITLE=\"B-Tree\" DIR=data-structures/b-tree\n"

install: ## Install dependencies (npm ci when a lockfile exists)
	@if [ -f package-lock.json ]; then $(NPM) ci; else $(NPM) install; fi

node_modules: package.json
	@$(MAKE) --no-print-directory install
	@touch node_modules

dev: node_modules ## Start the dev server at http://localhost:5173
	$(NPM) run dev

build: node_modules ## Typecheck and build the production bundle into dist/
	$(NPM) run build

preview: build ## Serve the production build locally
	$(NPM) run preview

test: node_modules ## Run all tests once (unit, contract, render-sync, app)
	$(NPM) test

test-watch: node_modules ## Run tests in watch mode
	$(NPM) run test:watch

typecheck: node_modules ## Strict TypeScript check without emitting
	$(NPM) run typecheck

check: typecheck test build ## Everything CI runs: typecheck + tests + build

new-concept: node_modules ## Scaffold a concept: make new-concept ID=b-tree TITLE="B-Tree" DIR=data-structures/b-tree
	@test -n "$(ID)" -a -n "$(TITLE)" -a -n "$(DIR)" || { echo "usage: make new-concept ID=<kebab-id> TITLE=\"<Title>\" DIR=<category/dir>"; exit 1; }
	$(NPM) run new-concept -- "$(ID)" "$(TITLE)" "$(DIR)"

logo: ## Regenerate the pixel-art logo (docs/assets/logo.svg)
	$(NPM) run logo

clean: ## Remove build output and caches
	rm -rf dist coverage node_modules/.vite node_modules/.vitest

distclean: clean ## clean + remove node_modules
	rm -rf node_modules
