from extractors.scrapy.spiders.base import BaseSpider
from extractors.scrapy.items import ProductItem

class HacomSpider(BaseSpider):
    name = "hacom"
    allowed_domains = ["hacom.vn", "hanoicomputercdn.com"]
    start_urls = []

    def parse(self, response):
        name = response.css("header.product-header h1::text").get()
        sku = response.css("span[itemprop=\"sku\"]::text").get()
        original_price = self.normaliseprice(response.css("section.product-pricing del.font-medium::text").get())
        price = self.normaliseprice(response.css("section.product-pricing p.font-bold::text").get())
        flash_sale = self.normaliseprice(response.css("section.product-pricing span.font-bold::text").get())
        currency = "VND"
        image_urls = response.css("section.product-media div.swiper-wrapper img::attr(src)").getall()

        yield ProductItem(
            url=self.url,
            name=name,
            sku=sku,
            original_price=original_price,
            price=price,
            flash_sale=flash_sale,
            currency=currency,
            domain=self.allowed_domains[0],
            image_urls=image_urls
        )

