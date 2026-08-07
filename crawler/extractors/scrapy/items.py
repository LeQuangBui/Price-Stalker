# Define here the models for your scraped items
#
# See documentation in:
# https://docs.scrapy.org/en/latest/topics/items.html

import scrapy


class ProductItem(scrapy.Item):
    name = scrapy.Field()
    sku = scrapy.Field()
    url = scrapy.Field()
    original_price = scrapy.Field()
    price = scrapy.Field()
    flash_sale = scrapy.Field()
    currency = scrapy.Field()
    domain = scrapy.Field()
    image_urls = scrapy.Field()
    images = scrapy.Field()
