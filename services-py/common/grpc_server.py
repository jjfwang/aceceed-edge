import logging
from concurrent import futures

import grpc


def serve(servicer, add_servicer, host: str, port: int, max_workers: int = 10):
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=max_workers))
    add_servicer(servicer, server)
    server.add_insecure_port(f"{host}:{port}")
    server.start()
    logging.info("grpc_server_started", extra={"host": host, "port": port})
    return server
