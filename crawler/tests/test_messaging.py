from types import SimpleNamespace

import app.messaging as messaging_module
from app.events import SCRAPE_REQUESTED
from app.messaging import RabbitMessageBus, RabbitSettings


def test_rabbit_settings_defaults_to_scrape_request_queue(monkeypatch):
    monkeypatch.delenv("RABBITMQ_URL", raising=False)
    monkeypatch.delenv("RABBITMQ_HOST", raising=False)
    monkeypatch.delenv("RABBITMQ_PORT", raising=False)
    monkeypatch.delenv("RABBITMQ_USERNAME", raising=False)
    monkeypatch.delenv("RABBITMQ_PASSWORD", raising=False)

    settings = RabbitSettings.from_env()

    assert settings.exchange == "price-stalker"
    assert settings.request_queue == "crawler.scrape.requests"
    assert settings.host == "localhost"
    assert settings.port == 5672


def test_rabbit_settings_reads_environment_overrides(monkeypatch):
    monkeypatch.setenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/%2F")
    monkeypatch.setenv("RABBITMQ_HOST", "rabbitmq")
    monkeypatch.setenv("RABBITMQ_PORT", "5673")
    monkeypatch.setenv("RABBITMQ_USERNAME", "crawler")
    monkeypatch.setenv("RABBITMQ_PASSWORD", "secret")

    settings = RabbitSettings.from_env()

    assert settings.url == "amqp://guest:guest@rabbitmq:5672/%2F"
    assert settings.host == "rabbitmq"
    assert settings.port == 5673
    assert settings.username == "crawler"
    assert settings.password == "secret"


def test_rabbit_settings_reads_request_queue_override(monkeypatch):
    monkeypatch.setenv("RABBITMQ_SCRAPE_REQUEST_QUEUE", "custom.scrape.requests")

    settings = RabbitSettings.from_env()

    assert settings.request_queue == "custom.scrape.requests"


def test_consume_reuses_one_event_loop_for_async_messages(monkeypatch):
    runs = []
    callbacks = []

    class FakeAwaitable:
        def __await__(self):
            if False:
                yield
            return None

    class FakeLoop:
        def __init__(self):
            self.closed = False

        def run_until_complete(self, awaitable):
            runs.append((id(self), awaitable))

        def is_closed(self):
            return self.closed

        def close(self):
            self.closed = True

    class FakeChannel:
        def __init__(self):
            self.acks = []

        def basic_qos(self, prefetch_count):
            self.prefetch_count = prefetch_count

        def basic_consume(self, queue, on_message_callback):
            callbacks.append(on_message_callback)

        def start_consuming(self):
            callbacks[0](
                self,
                SimpleNamespace(routing_key=SCRAPE_REQUESTED, delivery_tag=1),
                None,
                b'{"id": "request-1", "updated": false, "url": "https://gearvn.com/products/mouse"}',
            )
            callbacks[0](
                self,
                SimpleNamespace(routing_key=SCRAPE_REQUESTED, delivery_tag=2),
                None,
                b'{"id": "request-2", "updated": true, "url": "https://kccshop.vn/product", "productId": "product-2"}',
            )

        def basic_ack(self, delivery_tag):
            self.acks.append(delivery_tag)

        def basic_nack(self, delivery_tag, requeue):
            raise AssertionError("unexpected nack")

    fake_loop = FakeLoop()
    channel = FakeChannel()
    settings = RabbitSettings(
        exchange="price-stalker",
        request_queue="crawler.scrape.requests",
        host="localhost",
        port=5672,
        username="guest",
        password="guest",
    )
    bus = RabbitMessageBus(settings)

    monkeypatch.setattr(bus, "_ensure_channel", lambda: channel)
    monkeypatch.setattr(messaging_module.asyncio, "new_event_loop", lambda: fake_loop)
    monkeypatch.setattr(messaging_module.asyncio, "set_event_loop", lambda loop: None)
    monkeypatch.setattr(
        messaging_module.asyncio,
        "run",
        lambda awaitable: (_ for _ in ()).throw(
            AssertionError("asyncio.run should not be used per message")
        ),
    )

    def handler(payload, routing_key):
        return FakeAwaitable()

    bus.consume(handler)

    assert channel.prefetch_count == 1
    assert channel.acks == [1, 2]
    assert [run[0] for run in runs] == [id(fake_loop), id(fake_loop)]
