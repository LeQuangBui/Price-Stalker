import scrapy
from urllib.parse import urlencode
from extractors.scrapy.spiders.huraspider import HuraSpider


class HoanghapcSpider(HuraSpider):
    name = "hoanghapc"
    allowed_domains = ["hoanghapc.vn", "hoanghapccdn.com"]
    start_urls = ["https://hoanghapc.vn/ajax/get_json.php", "https://hoanghapc.vn"]

    def parse_title(self, response):
        name = response.css("div.pd-info-container h1::text").get()
        params = {'action': 'search', 'action_type': 'search', 'q': name, 'limit': '5'}
        url = self.start_urls[0] + '?' + urlencode(params)
        yield scrapy.Request(url, callback=self.parse_id)
