from extractors.scrapy.spiders.huraspider import HuraSpider

class NguyencongpcSpider(HuraSpider):
    name = "nguyencongpc"
    allowed_domains = ["nguyencongpc.vn"]
    start_urls = ["https://nguyencongpc.vn/ajax/get_json.php", "https://nguyencongpc.vn"]

