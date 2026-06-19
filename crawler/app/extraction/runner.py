import asyncio
import importlib
import sys
from functools import lru_cache
from typing import Any

from scrapy import signals
from scrapy.crawler import AsyncCrawlerRunner
from scrapy.utils.reactor import (
    install_reactor,
    is_asyncio_reactor_installed,
    is_reactor_installed,
)

from app.extraction.registry import EXTRACTOR_REGISTRY, normalise_domain
from extractors.scrapy import settings as scrapy_project_settings


SCRAPY_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"


def _configure_windows_event_loop_policy() -> None:
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


def _get_twisted_reactor():
    from twisted.internet import reactor

    return reactor


_configure_windows_event_loop_policy()


class ScrapyExtractionRunner:
    async def extract(self, url: str, updated: bool = False) -> list[dict]:
        domain = normalise_domain(url)
        extractor = EXTRACTOR_REGISTRY.get(domain)
        if extractor is None:
            raise ValueError(f"Unsupported domain: {domain or url}")

        return await self._run_scrapy_spider(extractor.target, url, updated)

    async def _run_scrapy_spider(
        self,
        spider_path: str,
        url: str,
        updated: bool,
    ) -> list[dict]:
        self._ensure_scrapy_reactor()
        spider_class = self._load_target(spider_path)
        items: list[dict] = []
        runner = AsyncCrawlerRunner(settings=self._build_scrapy_settings(updated))
        crawler = runner.create_crawler(spider_class)

        def collect_item(item, response, spider) -> None:
            items.append(dict(item))

        crawler.signals.connect(collect_item, signal=signals.item_scraped)
        await runner.crawl(crawler, url=url)
        return items

    @staticmethod
    @lru_cache(maxsize=None)
    def _load_target(target_path: str):
        module_name, class_name = target_path.rsplit(".", 1)
        module = importlib.import_module(module_name)
        return getattr(module, class_name)

    def _ensure_scrapy_reactor(self) -> None:
        try:
            install_reactor(SCRAPY_REACTOR, None)
        except TypeError as exc:
            if "ProactorEventLoop" in str(exc):
                raise RuntimeError(
                    "Scrapy requires a selector event loop on Windows. Start "
                    "the crawler through app.main or configure a selector "
                    "event loop before running the scraper."
                ) from exc
            raise

        if not is_reactor_installed() or not is_asyncio_reactor_installed():
            raise RuntimeError(
                f"Scrapy requires {SCRAPY_REACTOR} to run inside the crawler"
            )
        reactor = _get_twisted_reactor()
        if not reactor.running:
            reactor.startRunning(installSignalHandlers=False)

    def _build_scrapy_settings(self, updated: bool) -> dict[str, Any]:
        settings = {
            name: getattr(scrapy_project_settings, name)
            for name in dir(scrapy_project_settings)
            if name.isupper()
        }
        settings["LOG_ENABLED"] = True
        settings["TWISTED_REACTOR_ENABLED"] = True
        settings["TWISTED_REACTOR"] = SCRAPY_REACTOR
        if updated:
            settings["ITEM_PIPELINES"] = {}
        return settings
