from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Protocol

from app.events import (
    SCRAPE_COMPLETED,
    SCRAPE_FAILED,
)


class Extractor(Protocol):
    async def extract(self, url: str, updated: bool = False) -> list[dict]:
        pass


class Publisher(Protocol):
    def publish(self, routing_key: str, payload: dict[str, Any]) -> None:
        pass


@dataclass(frozen=True)
class ScrapeRequest:
    id: str
    updated: bool
    url: str
    product_id: str | None = None


class ScrapeWorker:
    def __init__(self, runner: Extractor, publisher: Publisher):
        self.runner = runner
        self.publisher = publisher

    async def handle_message(
        self,
        payload: Mapping[str, Any],
        _routing_key: str,
    ) -> None:
        try:
            request = self._parse_request(payload)
            products = await self.runner.extract(
                request.url,
                updated=request.updated,
            )
            if not products:
                raise ValueError("Scrape returned no product")
        except Exception as exc:
            self.publisher.publish(
                SCRAPE_FAILED,
                self._failure_payload(payload, str(exc)),
            )
            return

        self.publisher.publish(
            SCRAPE_COMPLETED,
            {
                "id": request.id,
                "productId": request.product_id,
                "product": products[0],
                "completedAt": self._completed_at(),
            },
        )

    def _parse_request(
        self,
        payload: Mapping[str, Any],
    ) -> ScrapeRequest:
        request_id = payload.get("id")
        if not request_id:
            raise ValueError("Scrape request missing id")

        url = payload.get("url")
        if not url:
            raise ValueError("Scrape request missing url")

        updated = self._is_updated(payload.get("updated"))
        product_id = payload.get("productId")
        if updated and not product_id:
            raise ValueError("Updated scrape request missing productId")

        return ScrapeRequest(
            id=str(request_id),
            updated=updated,
            url=str(url),
            product_id=str(product_id) if product_id is not None else None,
        )

    def _failure_payload(
        self,
        payload: Mapping[str, Any],
        error: str,
    ) -> dict[str, Any]:
        return {
            "id": payload.get("id"),
            "updated": self._is_updated(payload.get("updated")),
            "url": payload.get("url"),
            "productId": payload.get("productId"),
            "error": error,
        }

    def _is_updated(self, value: Any) -> bool:
        if isinstance(value, str):
            return value.strip().lower() == "true"
        return bool(value)

    def _completed_at(self) -> str:
        return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
