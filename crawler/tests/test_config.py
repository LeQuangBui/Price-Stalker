import importlib
from pathlib import Path


def test_scrapy_settings_import_with_optional_aws_image_env_unset(monkeypatch):
    for name in (
        "AWS_IMAGES_FOLDER_URI",
        "AWS_IMAGES_FOLDER_URL",
        "AWS_KEY_PREFIX",
        "LOCAL_TEMP_FOLDER",
    ):
        monkeypatch.delenv(name, raising=False)

    original_exists = Path.exists

    def exists_without_dotenv(path):
        if path.name == ".env":
            return False
        return original_exists(path)

    monkeypatch.setattr(Path, "exists", exists_without_dotenv)

    import app.config as config
    import extractors.scrapy.settings as scrapy_settings

    importlib.reload(config)
    reloaded_settings = importlib.reload(scrapy_settings)

    assert reloaded_settings.IMAGES_STORE == ""
