from __future__ import annotations

import asyncio
import inspect
import json
import os
from collections.abc import Awaitable, Callable, Mapping
from dataclasses import dataclass
from typing import Any

import app.config  # noqa: F401  Loads crawler .env before reading environment.
from app.events import (
    CRAWLER_SCRAPE_REQUEST_QUEUE,
    EXCHANGE_NAME,
    SCRAPE_REQUESTED,
)


MessageHandler = Callable[[Mapping[str, Any], str], Awaitable[None] | None]


@dataclass(frozen=True)
class RabbitSettings:
    exchange: str
    request_queue: str
    host: str
    port: int
    username: str
    password: str
    url: str | None = None

    @classmethod
    def from_env(cls) -> "RabbitSettings":
        return cls(
            exchange=EXCHANGE_NAME,
            request_queue=os.getenv(
                "RABBITMQ_SCRAPE_REQUEST_QUEUE",
                CRAWLER_SCRAPE_REQUEST_QUEUE,
            ),
            host=os.getenv("RABBITMQ_HOST", "localhost"),
            port=int(os.getenv("RABBITMQ_PORT", "5672")),
            username=os.getenv("RABBITMQ_USERNAME", "guest"),
            password=os.getenv("RABBITMQ_PASSWORD", "guest"),
            url=os.getenv("RABBITMQ_URL") or None,
        )


class RabbitMessageBus:
    def __init__(self, settings: RabbitSettings):
        self.settings = settings
        self._connection = None
        self._channel = None
        self._loop = None

    def publish(self, routing_key: str, payload: dict[str, Any]) -> None:
        channel = self._ensure_channel()
        channel.basic_publish(
            exchange=self.settings.exchange,
            routing_key=routing_key,
            body=json.dumps(payload).encode("utf-8"),
            properties=self._basic_properties(),
        )

    def consume(self, handler: MessageHandler) -> None:
        channel = self._ensure_channel()
        channel.basic_qos(prefetch_count=1)

        def callback(ch, method, properties, body):
            try:
                payload = json.loads(body.decode("utf-8"))
                result = handler(payload, method.routing_key)
                if inspect.isawaitable(result):
                    self._ensure_event_loop().run_until_complete(result)
            except Exception:
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                raise
            else:
                ch.basic_ack(delivery_tag=method.delivery_tag)

        channel.basic_consume(
            queue=self.settings.request_queue,
            on_message_callback=callback,
        )

        channel.start_consuming()

    def close(self) -> None:
        try:
            if self._connection and self._connection.is_open:
                self._connection.close()
        finally:
            if self._loop and not self._loop.is_closed():
                self._loop.close()

    def _ensure_channel(self):
        if self._channel is None:
            self._connection, self._channel = self._connect()
            self._declare_topology(self._channel)
        return self._channel

    def _ensure_event_loop(self):
        if self._loop is None or self._loop.is_closed():
            self._loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self._loop)
        return self._loop

    def _connect(self):
        import pika

        if self.settings.url:
            parameters = pika.URLParameters(self.settings.url)
        else:
            credentials = pika.PlainCredentials(
                self.settings.username,
                self.settings.password,
            )
            parameters = pika.ConnectionParameters(
                host=self.settings.host,
                port=self.settings.port,
                credentials=credentials,
            )

        connection = pika.BlockingConnection(parameters)
        return connection, connection.channel()

    def _declare_topology(self, channel) -> None:
        channel.exchange_declare(
            exchange=self.settings.exchange,
            exchange_type="topic",
            durable=True,
        )

        channel.queue_declare(queue=self.settings.request_queue, durable=True)
        channel.queue_bind(
            queue=self.settings.request_queue,
            exchange=self.settings.exchange,
            routing_key=SCRAPE_REQUESTED,
        )

    def _basic_properties(self):
        import pika

        return pika.BasicProperties(
            content_type="application/json",
            delivery_mode=2,
        )
