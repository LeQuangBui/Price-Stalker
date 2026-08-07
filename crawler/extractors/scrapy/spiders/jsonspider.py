import scrapy
from extractors.scrapy.items import ProductItem
from extractors.scrapy.spiders.base import BaseSpider


class JsonSpider(BaseSpider):
    name = "json"

    async def start(self):
        yield scrapy.Request(self.url + ".json", callback=self.parse)

    def parse(self, response):
        product = response.json().get("product")
        name = product.get("title")
        variants = product.get("variants")
        images = product.get("images")
        sku = variants[0].get("sku")
        original_price = float(variants[0].get("compare_at_price"))
        price = float(variants[0].get("price"))
        currency = "VND"
        image_urls = []
        for image in images:
            image_urls.append(image.get("src"))

        if len(variants) > 1:
            print(variants)
            for variant in variants:
                original_price = max(float(original_price), float(variant.get("compare_at_price")))
                price = max(float(price), float(variant.get("price")))

        data = ProductItem(
            url=self.url,
            name=name,
            sku=sku,
            original_price=None if original_price == 0 else original_price,
            price=None if price == 0 else price,
            flash_sale=None,
            currency=currency,
            domain=self.allowed_domains[0],
            image_urls=image_urls
        )

        return data
