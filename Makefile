.PHONY: proto install run-mock run-device lint format test

PROTOC_TS=./orchestrator-ts/node_modules/.bin/grpc_tools_node_protoc
PROTOC_TS_PLUGIN=./orchestrator-ts/node_modules/.bin/protoc-gen-ts

proto:
	mkdir -p orchestrator-ts/src/rpc/gen services-py/common/gen
	python3 -m grpc_tools.protoc -I proto \
		--python_out=services-py/common/gen \
		--grpc_python_out=services-py/common/gen \
		proto/assistant.proto
	$(PROTOC_TS) --plugin=protoc-gen-ts=$(PROTOC_TS_PLUGIN) -I proto \
		--js_out=import_style=commonjs,binary:orchestrator-ts/src/rpc/gen \
		--grpc_out=grpc_js:orchestrator-ts/src/rpc/gen \
		--ts_out=grpc_js:orchestrator-ts/src/rpc/gen \
		proto/assistant.proto

install:
	npm -C orchestrator-ts install
	python3 -m pip install -r services-py/requirements.txt

run-mock:
	./deploy/scripts/run_mock.sh

run-device:
	./deploy/scripts/run_device.sh

lint:
	pnpm lint

format:
	pnpm format

test:
	pnpm test
