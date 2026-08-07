import re
from scrapy.http import JsonRequest
from extractors.scrapy.spiders.base import BaseSpider
from extractors.scrapy.items import ProductItem

class CellphonesSpider(BaseSpider):
    name = "cellphones"
    allowed_domains = ["cellphones.com.vn"]
    base_url = "https://cellphones.com.vn/"
    start_urls = ["https://api.cellphones.com.vn/v2/graphql/query"]

    def parse(self, response):
        images = response.css("div.swiper-slide a.spotlight::attr(href)").getall()
        for image in images:
            image = re.sub(".*https:\/\/cellphones\.com\.vn", "https://cellphones.com.vn/", image)
        query = 'query { products( filter: { static: { province_id:30 url_path: \"' + re.sub(self.base_url, '', self.url) + '\" } }) { filterable {product_id name sku price special_price flash_sale_types } }}'
        yield JsonRequest(
            url=self.start_urls[0],
            data={
                'query': query,
                'attributes': []
            },
            callback=self.parse_data,
            meta={'image_urls': images}
        )

    def parse_data(self, response):
        product = response.json().get("data").get("products")[0].get("filterable")
        name = product.get("name")
        sku = product.get("sku")
        original_price = product.get("price")
        price = product.get("special_price")
        flash_sale = None
        flash_sale_data = product.get("flash_sale_types")
        if flash_sale_data:
            price = flash_sale_data.get("flash_sale_types", {}).get("all", {}).get("price")
            if price and str(price).isnumeric():
                flash_sale = int(price)
        currency = "VND"

        yield ProductItem(
            url=self.url,
            name=name,
            sku=sku,
            original_price=original_price,
            price=price,
            flash_sale=flash_sale,
            currency=currency,
            domain=self.allowed_domains[0],
            image_urls=response.meta.get('image_urls')
        )