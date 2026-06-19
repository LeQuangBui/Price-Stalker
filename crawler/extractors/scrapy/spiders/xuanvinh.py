from extractors.scrapy.spiders.jsonspider import JsonSpider

class XuanvinhSpider(JsonSpider):
    name = "xuanvinh"
    allowed_domains = ["xuanvinh.vn", "product.hstatic.net", "cdn.hstatic.net"]
    start_urls = ["https://xuanvinh.vn"]