import re
import scrapy
from extractors.scrapy.spiders.jsonspider import JsonSpider


class GearvnSpider(JsonSpider):
    name = "gearvn"
    coupon_url = "https://cdp-embed-worker.cloud-gearvn.workers.dev/v1/js/coupons"
    allowed_domains = ["gearvn.com", "cloud-gearvn.workers.dev", "product.hstatic.net", "cdn.hstatic.net"]
    start_urls = ["https://gearvn.com"]

    def parse(self, response):
        data = super().parse(response)
        yield scrapy.Request(self.coupon_url + "?sku=" + data["sku"], callback=self.get_flash_sale, cb_kwargs={'data': data})

    def get_flash_sale(self, response, data):
        match = re.search(
            r'<span class="[^"]*-voucher-discount-value">([^><]*)</span>',
            response.text,
        )
        data['flash_sale'] = self.normaliseprice(match.group(1)) if match else None
        yield data
