from dataclasses import dataclass
from urllib.parse import urlparse


def normalise_domain(url: str) -> str:
    hostname = urlparse(url).hostname
    if not hostname:
        return ""
    return hostname.lower().removeprefix("www.")


@dataclass(frozen=True)
class ExtractorDefinition:
    target: str


EXTRACTOR_REGISTRY: dict[str, ExtractorDefinition] = {
    "cellphones.com.vn": ExtractorDefinition(
        target="extractors.scrapy.spiders.cellphones.CellphonesSpider",
    ),
    "gearvn.com": ExtractorDefinition(
        target="extractors.scrapy.spiders.gearvn.GearvnSpider",
    ),
    "hacom.vn": ExtractorDefinition(
        target="extractors.scrapy.spiders.hacom.HacomSpider",
    ),
    "hoanghapc.vn": ExtractorDefinition(
        target="extractors.scrapy.spiders.hoanghapc.HoanghapcSpider",
    ),
    "hoanglongcomputer.vn": ExtractorDefinition(
        target="extractors.scrapy.spiders.hoanglongcomputer.HoanglongcomputerSpider",
    ),
    "nguyencongpc.vn": ExtractorDefinition(
        target="extractors.scrapy.spiders.nguyencongpc.NguyencongpcSpider",
    ),
    "tinhocngoisao.com": ExtractorDefinition(
        target="extractors.scrapy.spiders.tinhocngoisao.TinhocngoisaoSpider",
    ),
    "ttgshop.vn": ExtractorDefinition(
        target="extractors.scrapy.spiders.ttgshop.TtgshopSpider",
    ),
    "xuanvinh.vn": ExtractorDefinition(
        target="extractors.scrapy.spiders.xuanvinh.XuanvinhSpider",
    ),
    "kccshop.vn": ExtractorDefinition(
        target="extractors.scrapy.spiders.kccshop.KccshopSpider",
    ),
}
