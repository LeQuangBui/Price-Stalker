from urllib.parse import urljoin

import scrapy


class BaseSpider(scrapy.Spider):
    name = "Base"
    url = None
    allowed_domains = []
    start_urls = []
    has_proxy = False

    def __init__(self, url=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if url is not None:
            if url[-1] == '/':
                url = url[:-1]
            self.url = url

    async def start(self):
        yield scrapy.Request(self.url, callback=self.parse)

    def parse(self, response):
        pass

    def normaliseprice(self, text):
        if not text:
            return None
        digits = "".join(ch for ch in text if ch.isdigit())
        return int(digits) if digits else 0

    def normalise_url(self, base_url, value):
        if not value:
            return None
        return urljoin(base_url, value.strip())
