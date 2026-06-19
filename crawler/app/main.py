from app.messaging import RabbitMessageBus, RabbitSettings
from app.extraction.runner import ScrapyExtractionRunner
from app.worker import ScrapeWorker


def main() -> None:
    bus = RabbitMessageBus(RabbitSettings.from_env())
    worker = ScrapeWorker(ScrapyExtractionRunner(), bus)

    try:
        bus.consume(worker.handle_message)
    finally:
        bus.close()


if __name__ == "__main__":
    main()
