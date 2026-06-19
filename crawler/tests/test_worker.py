import pytest

from app.events import (
    SCRAPE_COMPLETED,
    SCRAPE_FAILED,
    SCRAPE_REQUESTED,
)
from app.extraction.runner import ScrapyExtractionRunner
from app.worker import ScrapeWorker


class FakeRunner:
    def __init__(self, result=None, error=None):
        self.calls = []
        self.result = result if result is not None else [{"name": "Keyboard"}]
        self.error = error

    async def extract(self, url, updated=False):
        self.calls.append((url, updated))
        if self.error:
            raise self.error
        return self.result


class FakePublisher:
    def __init__(self):
        self.events = []

    def publish(self, routing_key, payload):
        self.events.append((routing_key, payload))


@pytest.mark.asyncio
async def test_create_request_publishes_completed_event_with_product():
    runner = FakeRunner(result=[{"name": "Mouse", "price": 100}])
    publisher = FakePublisher()
    worker = ScrapeWorker(runner, publisher)

    await worker.handle_message(
        {
            "id": "11111111-1111-1111-1111-111111111111",
            "updated": False,
            "url": "https://gearvn.com/products/mouse",
        },
        SCRAPE_REQUESTED,
    )

    assert runner.calls == [("https://gearvn.com/products/mouse", False)]
    routing_key, payload = publisher.events[0]
    assert routing_key == SCRAPE_COMPLETED
    assert payload["id"] == "11111111-1111-1111-1111-111111111111"
    assert payload["productId"] is None
    assert payload["product"] == {"name": "Mouse", "price": 100}
    assert payload["completedAt"].endswith("Z")


@pytest.mark.asyncio
async def test_refresh_request_runs_without_image_pipeline():
    runner = FakeRunner()
    publisher = FakePublisher()
    worker = ScrapeWorker(runner, publisher)

    await worker.handle_message(
        {
            "id": "22222222-2222-2222-2222-222222222222",
            "updated": True,
            "url": "https://kccshop.vn/product",
            "productId": "product-9",
        },
        SCRAPE_REQUESTED,
    )

    assert runner.calls == [("https://kccshop.vn/product", True)]
    assert publisher.events[0][0] == SCRAPE_COMPLETED
    assert publisher.events[0][1]["id"] == "22222222-2222-2222-2222-222222222222"
    assert publisher.events[0][1]["productId"] == "product-9"
    assert publisher.events[0][1]["product"] == {"name": "Keyboard"}


@pytest.mark.asyncio
async def test_failed_scrape_publishes_failed_event():
    runner = FakeRunner(error=RuntimeError("blocked"))
    publisher = FakePublisher()
    worker = ScrapeWorker(runner, publisher)

    await worker.handle_message(
        {
            "id": "33333333-3333-3333-3333-333333333333",
            "updated": True,
            "url": "https://kccshop.vn/product",
            "productId": "product-10",
        },
        SCRAPE_REQUESTED,
    )

    assert publisher.events == [
        (
            SCRAPE_FAILED,
            {
                "id": "33333333-3333-3333-3333-333333333333",
                "updated": True,
                "url": "https://kccshop.vn/product",
                "productId": "product-10",
                "error": "blocked",
            },
        )
    ]


@pytest.mark.asyncio
async def test_updated_request_without_product_id_is_reported_as_failed_event():
    runner = FakeRunner()
    publisher = FakePublisher()
    worker = ScrapeWorker(runner, publisher)

    await worker.handle_message(
        {
            "id": "44444444-4444-4444-4444-444444444444",
            "updated": True,
            "url": "https://kccshop.vn/product",
        },
        SCRAPE_REQUESTED,
    )

    assert runner.calls == []
    assert publisher.events == [
        (
            SCRAPE_FAILED,
            {
                "id": "44444444-4444-4444-4444-444444444444",
                "updated": True,
                "url": "https://kccshop.vn/product",
                "productId": None,
                "error": "Updated scrape request missing productId",
            },
        )
    ]


@pytest.mark.asyncio
async def test_missing_url_is_reported_as_failed_event():
    runner = FakeRunner()
    publisher = FakePublisher()
    worker = ScrapeWorker(runner, publisher)

    await worker.handle_message(
        {"id": "55555555-5555-5555-5555-555555555555"},
        SCRAPE_REQUESTED,
    )

    assert runner.calls == []
    assert publisher.events[0][0] == SCRAPE_FAILED
    assert publisher.events[0][1]["error"] == "Scrape request missing url"


def test_production_runner_satisfies_worker_extractor_contract():
    assert hasattr(ScrapyExtractionRunner(), "extract")
