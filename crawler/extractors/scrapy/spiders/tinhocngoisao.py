from extractors.scrapy.spiders.jsonspider import JsonSpider

class TinhocngoisaoSpider(JsonSpider):
    name = "tinhocngoisao"
    allowed_domains = ["tinhocngoisao.com", "product.hstatic.net", "cdn.hstatic.net"]
    start_urls = []