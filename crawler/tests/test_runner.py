from types import SimpleNamespace

import pytest

import app.extraction.runner as runner_module
from app.extraction.runner import ScrapyExtractionRunner


def test_configure_windows_event_loop_policy_uses_selector_policy(monkeypatch):
    calls = []

    monkeypatch.setattr(
        runner_module,
        "sys",
        SimpleNamespace(platform="win32"),
        raising=False,
    )
    monkeypatch.setattr(
        runner_module.asyncio,
        "WindowsSelectorEventLoopPolicy",
        lambda: "selector-policy",
        raising=False,
    )
    monkeypatch.setattr(
        runner_module.asyncio,
        "set_event_loop_policy",
        lambda policy: calls.append(policy),
    )

    configure_policy = getattr(
        runner_module,
        "_configure_windows_event_loop_policy",
        None,
    )
    assert configure_policy is not None
    configure_policy()

    assert calls == ["selector-policy"]


def test_ensure_scrapy_reactor_installs_and_starts_reactor(monkeypatch):
    calls = []
    fake_reactor = SimpleNamespace(
        running=False,
        startRunning=lambda installSignalHandlers: calls.append(
            ("start", installSignalHandlers)
        ),
    )

    monkeypatch.setattr(
        runner_module,
        "install_reactor",
        lambda reactor_path, event_loop_path: calls.append(
            ("install", reactor_path, event_loop_path)
        ),
    )
    monkeypatch.setattr(runner_module, "is_reactor_installed", lambda: True)
    monkeypatch.setattr(runner_module, "is_asyncio_reactor_installed", lambda: True)
    monkeypatch.setattr(
        runner_module,
        "_get_twisted_reactor",
        lambda: fake_reactor,
        raising=False,
    )

    ScrapyExtractionRunner()._ensure_scrapy_reactor()

    assert calls == [
        ("install", runner_module.SCRAPY_REACTOR, None),
        ("start", False),
    ]


def test_ensure_scrapy_reactor_reports_proactor_loop(monkeypatch):
    def fail_to_install(reactor_path, event_loop_path):
        raise TypeError(
            "ProactorEventLoop is not supported, got: "
            "<ProactorEventLoop running=True closed=False debug=False>"
        )

    monkeypatch.setattr(runner_module, "install_reactor", fail_to_install)

    with pytest.raises(RuntimeError, match="selector event loop"):
        ScrapyExtractionRunner()._ensure_scrapy_reactor()


def test_load_target_caches_imported_spider_class(monkeypatch):
    class FakeSpider:
        pass

    imports = []
    fake_module = SimpleNamespace(FakeSpider=FakeSpider)

    ScrapyExtractionRunner._load_target.cache_clear()
    monkeypatch.setattr(
        runner_module.importlib,
        "import_module",
        lambda module_name: imports.append(module_name) or fake_module,
    )

    assert ScrapyExtractionRunner._load_target("package.fake.FakeSpider") is FakeSpider
    assert ScrapyExtractionRunner._load_target("package.fake.FakeSpider") is FakeSpider
    assert imports == ["package.fake"]
    ScrapyExtractionRunner._load_target.cache_clear()


@pytest.mark.asyncio
async def test_run_scrapy_spider_ensures_reactor_before_crawling(monkeypatch):
    events = []
    runner = ScrapyExtractionRunner()

    class FakeSignals:
        def connect(self, handler, signal):
            events.append(("connect", signal))

    class FakeCrawler:
        signals = FakeSignals()

    class FakeAsyncCrawlerRunner:
        def __init__(self, settings):
            events.append("runner_init")

        def create_crawler(self, spider_class):
            events.append("create_crawler")
            return FakeCrawler()

        async def crawl(self, crawler, url):
            events.append(("crawl", url))

    monkeypatch.setattr(runner, "_load_target", lambda spider_path: object)
    monkeypatch.setattr(
        runner,
        "_ensure_scrapy_reactor",
        lambda: events.append("ensure_reactor"),
        raising=False,
    )
    monkeypatch.setattr(runner_module, "AsyncCrawlerRunner", FakeAsyncCrawlerRunner)

    await runner._run_scrapy_spider(
        "extractors.scrapy.spiders.fake.FakeSpider",
        "https://example.com",
        True,
    )

    assert events[:2] == ["ensure_reactor", "runner_init"]
