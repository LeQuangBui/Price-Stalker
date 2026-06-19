# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html
import hashlib
import os
from urllib.parse import urlparse

import scrapy
# useful for handling different item types with a single interface
from itemadapter import ItemAdapter
from scrapy.pipelines.images import ImagesPipeline

from app.config import AWS_IMAGES_FOLDER_URL, PROXY_URL


class PriceScrapePipeline:
    def process_item(self, item, spider):
        return item

class CustomS3ImagesPipeline(ImagesPipeline):
    def get_media_requests(self, item, info):
        kwargs = {}
        if info.spider.has_proxy:
            kwargs['meta'] = {'proxy': PROXY_URL}

        for image_url in item["image_urls"]:
            yield scrapy.Request(image_url, **kwargs)

    def file_path(self, request, response=None, info=None, *, item=None):
        image_url_hash = hashlib.shake_256(request.url.encode()).hexdigest(5)
        product_path = item['url'].split("/")[-1]
        path = urlparse(request.url).path
        ext = os.path.splitext(path)[-1].lower()
        image_filename = f"{item['domain']}/{product_path}/{image_url_hash}{ext}"

        return image_filename

class CustomReturnPipeline:
    def process_item(self, item):
        adapter = ItemAdapter(item)
        new_images = []
        for image in adapter['images']:
            new_images.append(AWS_IMAGES_FOLDER_URL + image["path"])

        adapter['images'] = new_images
        return item
