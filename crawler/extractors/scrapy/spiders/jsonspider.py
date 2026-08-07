from urllib.parse import urlsplit, urlunsplit

import scrapy
from extractors.scrapy.items import ProductItem
from extractors.scrapy.spiders.base import BaseSpider


class JsonSpider(BaseSpider):
    name = "json"

    def _json_url(self):
        # Shopify exposes a product's JSON at "<product-path>.json". Build it safely:
        # strip any query string / fragment and don't double-append ".json" to a URL that
        # already targets the JSON endpoint or carries a path suffix. Blindly doing
        # self.url + ".json" breaks for "/products/x?variant=1" (-> "/products/x?variant=1.json").
        parts = urlsplit(self.url)
        path = parts.path.rstrip("/")
        if not path.endswith(".json"):
            path = path + ".json"
        # Drop query + fragment; the JSON endpoint takes neither.
        return urlunsplit((parts.scheme, parts.netloc, path, "", ""))

    @staticmethod
    def _to_price(value):
        # Shopify variants may omit compare_at_price (no sale) -> None, or send "" / a string.
        # Return None on anything non-numeric instead of crashing the whole extraction.
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    async def start(self):
        yield scrapy.Request(self._json_url(), callback=self.parse)

    def parse(self, response):
        product = response.json().get("product")
        if not product:
            # A non-Shopify page (or an error body) won't have a "product" object; bail out
            # gracefully instead of raising AttributeError on None.get(...).
            return None

        name = product.get("title")
        variants = product.get("variants") or []
        images = product.get("images") or []

        sku = variants[0].get("sku") if variants else None

        image_urls = []
        for image in images:
            src = image.get("src")
            if src:
                image_urls.append(src)

        # Track the cheapest variant a shopper could actually buy, and use THAT SAME variant's own
        # compare_at_price as the "original" — do NOT pair the min price of one variant with the min
        # compare_at_price of a different variant (they can come from different SKUs). compare_at_price
        # is absent for variants not on sale, so it stays None for the chosen variant in that case.
        price = None
        original_price = None
        for variant in variants:
            v_price = self._to_price(variant.get("price"))
            if v_price is None:
                continue
            if price is None or v_price < price:
                price = v_price
                original_price = self._to_price(variant.get("compare_at_price"))

        data = ProductItem(
            url=self.url,
            name=name,
            sku=sku,
            original_price=None if original_price == 0 else original_price,
            price=None if price == 0 else price,
            flash_sale=None,
            currency="VND",
            domain=self.allowed_domains[0],
            image_urls=image_urls
        )

        return data
