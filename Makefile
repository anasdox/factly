# Use bash + nvm so all recipes use the nvm-managed Node.js version
SHELL := /bin/bash
.SHELLFLAGS := -c '. "$$HOME/.nvm/nvm.sh" && eval "$$@"' bash

BACKEND_DIR    := apps/backend
FRONTEND_DIR   := apps/frontend
TESTS_DIR      := tests/acceptance
BENCHMARK_DIR  := tools/benchmark
BACKEND_PID    := /tmp/factly-backend.pid

.PHONY: install install-backend install-frontend install-tests install-benchmark \
        start-backend stop-backend restart-backend start-frontend start \
        build-backend build-frontend build \
        typecheck typecheck-backend typecheck-frontend typecheck-benchmark \
        test test-backend test-acceptance \
        demo demo-m8 demo-m9 demo-m16 demo-m17 \
        clean lint

## Install

install: install-backend install-frontend install-tests install-benchmark

install-backend:
	cd $(BACKEND_DIR) && npm install

install-frontend:
	cd $(FRONTEND_DIR) && npm install --legacy-peer-deps

install-tests:
	cd $(TESTS_DIR) && npm install

install-benchmark:
	cd $(BENCHMARK_DIR) && npm install

## Run

start-backend:
	@if [ -f $(BACKEND_PID) ] && kill -0 $$(cat $(BACKEND_PID)) 2>/dev/null; then \
		echo "Backend already running (PID $$(cat $(BACKEND_PID)))"; \
	else \
		cd $(BACKEND_DIR) && nohup npx ts-node src/index.ts > /tmp/factly-backend.log 2>&1 & echo $$! > $(BACKEND_PID); \
		sleep 2; \
		if kill -0 $$(cat $(BACKEND_PID)) 2>/dev/null; then \
			echo "Backend started (PID $$(cat $(BACKEND_PID)))"; \
		else \
			echo "Backend failed to start. See /tmp/factly-backend.log"; \
			cat /tmp/factly-backend.log; \
			exit 1; \
		fi; \
	fi

stop-backend:
	@if [ -f $(BACKEND_PID) ] && kill -0 $$(cat $(BACKEND_PID)) 2>/dev/null; then \
		kill $$(cat $(BACKEND_PID)) && rm -f $(BACKEND_PID); \
		echo "Backend stopped"; \
	else \
		echo "Backend not running"; \
		rm -f $(BACKEND_PID); \
	fi
	@# Also kill any stray process on port 3002
	@lsof -ti:3002 2>/dev/null | xargs kill 2>/dev/null || true

restart-backend: stop-backend start-backend

start-frontend:
	cd $(FRONTEND_DIR) && npm start

start: start-backend start-frontend

## Build

build-backend:
	cd $(BACKEND_DIR) && npm run build

build-frontend:
	cd $(FRONTEND_DIR) && npm run build

build: build-backend build-frontend

## Typecheck

typecheck-backend:
	cd $(BACKEND_DIR) && npx tsc --noEmit

typecheck-frontend:
	cd $(FRONTEND_DIR) && npx tsc --noEmit

typecheck-benchmark:
	cd $(BENCHMARK_DIR) && npx tsc --noEmit

typecheck: typecheck-backend typecheck-frontend typecheck-benchmark

## Test
## Tests manage their own backend process (start/stop/restart).
## We must stop any external backend first to free port 3002 and the DB file,
## then restart it after tests complete.

test-acceptance: restart-backend
	cd $(TESTS_DIR) && npx jest --no-coverage --forceExit --detectOpenHandles --runInBand; \
	status=$$?; \
	$(MAKE) -C $(CURDIR) restart-backend; \
	exit $$status

test: test-acceptance

test-backend: restart-backend
	cd $(TESTS_DIR) && npx jest --no-coverage --forceExit --detectOpenHandles --runInBand room-management collaborative-session; \
	status=$$?; \
	$(MAKE) -C $(CURDIR) restart-backend; \
	exit $$status

## Demo

demo-m8:
	bash demos/ServerSidePersistence/demo.sh

demo-m9:
	bash demos/InputValidationErrorHandling/demo.sh

demo-m16:
	bash demos/BenchmarkQualityTool/demo.sh

demo-m17:
	bash demos/BenchmarkDashboardUI/demo.sh

demo: demo-m16 demo-m17

## Lint

lint:
	tools/spec-lint/spec_lint.sh
	tools/traceability/traceability_check.sh

## Clean

clean:
	rm -rf $(BACKEND_DIR)/node_modules $(BACKEND_DIR)/dist
	rm -rf $(FRONTEND_DIR)/node_modules $(FRONTEND_DIR)/build
	rm -rf $(TESTS_DIR)/node_modules
	rm -rf $(BENCHMARK_DIR)/node_modules

## Logs

logs-backend:
	@tail -f /tmp/factly-backend.log
