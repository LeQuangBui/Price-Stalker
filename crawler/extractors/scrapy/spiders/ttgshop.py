import scrapy
import re
from urllib.parse import urlencode
from extractors.scrapy.spiders.huraspider import HuraSpider


class TtgshopSpider(HuraSpider):
    name = "ttgshop"
    allowed_domains = ["ttgshop.vn"]
    start_urls = ["https://ttgshop.vn/ajax/get_json.php", "https://ttgshop.vn"]

    def parse_title(self, response):
        name = re.sub(" (Cấu hình gốc)", "", response.css("h1.product-name::text").get())
        params = {'action': 'search', 'action_type': 'search', 'q': name, 'limit': '5'}
        url = self.start_urls[0] + '?' + urlencode(params)
        yield scrapy.Request(url, callback=self.parse_id)
