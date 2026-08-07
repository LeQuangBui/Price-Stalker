from urllib.parse import urljoin

import scrapy

from app.config import PROXY_URL
from extractors.scrapy.items import ProductItem
from extractors.scrapy.spiders.base import BaseSpider


class KccshopSpider(BaseSpider):
    name = "kccshop"
    allowed_domains = ["kccshop.vn"]
    base_url = "https://kccshop.vn"
    start_urls = []
    has_proxy = True

    async def start(self):
        yield scrapy.Request(
            self.url,
            meta={'proxy': PROXY_URL},
            callback=self.parse
        )

    def parse(self, response):
        name = response.css("b.bk-product-name::text").get()
        original_price = self.normaliseprice(response.css("div.detail-n-old-price span::text").get())
        price = self.normaliseprice(response.css("div.detail-n-price span::text").get())
        image_urls = response.css("div.product-images img::attr(src)").getall()
        temp_urls  = []
        for url in image_urls:
            temp_urls.append(urljoin(self.base_url, url))

        yield ProductItem(
            url=self.url,
            name=name,
            sku=None,
            original_price=original_price,
            price=price,
            flash_sale=None,
            currency="VND",
            domain=self.allowed_domains[0],
            image_urls=temp_urls
        )
