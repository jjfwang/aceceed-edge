from dataclasses import dataclass


@dataclass
class ServiceConfig:
    host: str = "127.0.0.1"
    port: int = 0
