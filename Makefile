BACKEND_DIR  := apps/backend
FRONTEND_DIR := apps/frontend
TESTS_DIR    := tests/acceptance

.PHONY: install install-backend install-frontend install-tests \
        start-backend start-frontend start \
        build-backend build-frontend build \
        test test-backend \
        clean lint

## Install

install: install-backend install-frontend install-tests

install-backend:
	cd $(BACKEND_DIR) && npm install

install-frontend:
	cd $(FRONTEND_DIR) && npm install

install-tests:
	cd $(TESTS_DIR) && npm install

## Run

start-backend:
	cd $(BACKEND_DIR) && npm start

start-frontend:
	cd $(FRONTEND_DIR) && npm start

## Build

build-backend:
	cd $(BACKEND_DIR) && npm run build

build-frontend:
	cd $(FRONTEND_DIR) && npm run build

build: build-backend build-frontend

## Test

test:
	cd $(TESTS_DIR) && npx jest --forceExit --detectOpenHandles --runInBand

test-backend:
	cd $(TESTS_DIR) && npx jest --forceExit --detectOpenHandles --runInBand room-management collaborative-session

## Lint

lint:
	tools/spec-lint/spec_lint.sh
	tools/traceability/traceability_check.sh

## Clean

clean:
	rm -rf $(BACKEND_DIR)/node_modules $(BACKEND_DIR)/dist
	rm -rf $(FRONTEND_DIR)/node_modules $(FRONTEND_DIR)/build
	rm -rf $(TESTS_DIR)/node_modules
