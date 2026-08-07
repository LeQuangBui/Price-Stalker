# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html
import hashlib
import os
import re
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
    # Cap how many images we download per product so a hostile/misbehaving page that lists
    # hundreds of <img>/JSON image entries can't blow up bandwidth, storage, or run time.
    MAX_IMAGES_PER_PRODUCT = 10
    # Per-image download ceiling (bytes). Scrapy enforces download_maxsize per request, so an
    # oversized image is aborted mid-download instead of being fully buffered. Conservative
    # (10 MiB) — comfortably above any real product photo.
    MAX_IMAGE_BYTES = 10 * 1024 * 1024

    def get_media_requests(self, item, info):
        meta = {'download_maxsize': self.MAX_IMAGE_BYTES}
        if info.spider.has_proxy:
            meta['proxy'] = PROXY_URL

        count = 0
        for image_url in item["image_urls"]:
            if count >= self.MAX_IMAGES_PER_PRODUCT:
                break
            # Only follow real http(s) image URLs. Skip data:/file:/ftp:/blank entries so the
            # pipeline can't be pointed at the local filesystem or other schemes.
            if not image_url or not isinstance(image_url, str):
                continue
            if not image_url.lower().startswith(("http://", "https://")):
                continue
            yield scrapy.Request(image_url, meta=dict(meta))
            count += 1

    def file_path(self, request, response=None, info=None, *, item=None):
        image_url_hash = hashlib.shake_256(request.url.encode()).hexdigest(5)
        # Derive the product slug from the URL PATH (drops any query string / fragment) and
        # restrict it to URL/key-safe chars, so a retailer URL like ".../p?id=5" can't inject
        # a "?" into the object key or the public image URL (a "?" would truncate the path the
        # Worker forwards to S4, 404-ing the image).
        slug = urlparse(item['url']).path.rstrip("/").split("/")[-1]
        product_path = re.sub(r"[^A-Za-z0-9._-]", "-", slug) or "product"
        path = urlparse(request.url).path
        ext = os.path.splitext(path)[-1].lower()
        image_filename = f"{item['domain']}/{product_path}/{image_url_hash}{ext}"

        return image_filename

class CustomReturnPipeline:
    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        images = adapter.get('images') or []
        image_urls = adapter.get('image_urls') or []
        # Scrapy's ImagesPipeline keeps only SUCCESSFULLY downloaded images, so a count
        # shortfall means the S3 pipeline is disabled (local dev) OR some/all downloads failed
        # in prod. Warn on ANY shortfall so a partial failure isn't silent. Keep raw image_urls.
        if len(images) < len(image_urls):
            spider.logger.warning(
                "Stored %d/%d images for %s (S3 pipeline disabled, or %d image "
                "download/upload(s) failed).",
                len(images), len(image_urls), adapter.get('url'), len(image_urls) - len(images),
            )
        if not images:
            return item

        adapter['images'] = [AWS_IMAGES_FOLDER_URL + image["path"] for image in images]
        return item
