import scrapy
from urllib.parse import urlencode, urljoin
from extractors.scrapy.items import ProductItem
from extractors.scrapy.spiders.base import BaseSpider


class HuraSpider(BaseSpider):
    custom_settings = {
        'DEFAULT_REQUEST_HEADERS': {
            'Authorization': 'Basic ssaaAS76DAs6faFFghs1'
        }
    }
    name = "hura"

    async def start(self):
        yield scrapy.Request(self.url, callback=self.parse_title)

    def parse(self, response):
        product = response.json().get("list")[0]
        name = product.get("productName")
        sku = product.get("productSKU")
        original_price = product.get("marketPrice")
        price = product.get("price")
        currency = product.get("currency").upper()
        images = product.get("imageCollection")
        image_urls = []
        for image in images:
            image_urls.append(self.normalise_url(self.start_urls[1], image.get("image").get("large")))

        yield ProductItem(
            url=self.url,
            name=name,
            sku=sku,
            original_price=original_price,
            price=price,
            flash_sale=None,
            currency=currency,
            domain=self.allowed_domains[0],
            image_urls=image_urls
        )

    def parse_title(self, response):
        name = response.css("h1.product-name::text").get()
        params = {'action': 'search', 'action_type': 'search', 'q': name, 'limit': '5'}
        url = self.start_urls[0] + '?' + urlencode(params)
        yield scrapy.Request(url, callback=self.parse_id)

    def parse_id(self, response):
        products = response.json() if isinstance(response.json(), list) else response.json().get('list')
        pid = None
        for product in products:
            purl = product.get("url") if product.get("url") else product.get("productUrl")
            if self.start_urls[1] + purl == self.url:
                pid = product.get("id")
        params = {'action': 'product', 'action_type': 'product-list', 'ids': pid}
        url = self.start_urls[0] + '?' + urlencode(params)
        yield scrapy.Request(url, callback=self.parse)