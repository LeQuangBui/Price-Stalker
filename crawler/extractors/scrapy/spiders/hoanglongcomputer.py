from extractors.scrapy.spiders.huraspider import HuraSpider


class HoanglongcomputerSpider(HuraSpider):
    name = "hoanglongcomputer"
    allowed_domains = ["hoanglongcomputer.vn"]
    start_urls = ["https://hoanglongcomputer.vn/ajax/get_json.php", "https://hoanglongcomputer.vn"]
