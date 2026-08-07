from app.extraction.registry import EXTRACTOR_REGISTRY, normalise_domain


def test_normalise_domain_lowercases_and_removes_www_prefix():
    assert normalise_domain("https://WWW.GearVN.com/products/mouse") == "gearvn.com"


def test_normalise_domain_returns_empty_string_for_invalid_url():
    assert normalise_domain("not-a-url") == ""


def test_registry_contains_scrapy_extractors():
    assert EXTRACTOR_REGISTRY["gearvn.com"].target == "extractors.scrapy.spiders.gearvn.GearvnSpider"
    assert EXTRACTOR_REGISTRY["kccshop.vn"].target == "extractors.scrapy.spiders.kccshop.KccshopSpider"


def test_registry_entries_are_direct_scrapy_targets():
    assert all(definition.target.startswith("extractors.scrapy.") for definition in EXTRACTOR_REGISTRY.values())
