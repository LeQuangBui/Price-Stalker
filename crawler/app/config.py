from __future__ import annotations

import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
ENV_FILE = BASE_DIR / ".env"


def load_dotenv() -> None:
    if not ENV_FILE.exists():
        return

    for raw_line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_dotenv()


RABBITMQ_URL = os.getenv("RABBITMQ_URL")
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", "5672"))
RABBITMQ_USERNAME = os.getenv("RABBITMQ_USERNAME", "guest")
RABBITMQ_PASSWORD = os.getenv("RABBITMQ_PASSWORD", "guest")

AWS_REGION = os.getenv("AWS_REGION")
AWS_ENDPOINT_URL = os.getenv("AWS_ENDPOINT_URL", "")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")
AWS_IMAGES_FOLDER_URI = os.getenv("AWS_IMAGES_FOLDER_URI", "")
AWS_IMAGES_FOLDER_URL = os.getenv("AWS_IMAGES_FOLDER_URL", "")
PROXY_URL = os.getenv("PROXY_URL", "")
LOCAL_TEMP_FOLDER = os.getenv("LOCAL_TEMP_FOLDER", "/tmp")
AWS_KEY_PREFIX = os.getenv("AWS_KEY_PREFIX", "")

# Drift guard: the public image URL's path prefix must match the key prefix the images
# pipeline writes under (IMAGES_STORE = AWS_IMAGES_FOLDER_URI + AWS_KEY_PREFIX), or every
# stored image URL 404s. They are independent env vars, so warn loudly on mismatch.
if AWS_IMAGES_FOLDER_URL and AWS_KEY_PREFIX:
    if not AWS_IMAGES_FOLDER_URL.rstrip("/").endswith(AWS_KEY_PREFIX.rstrip("/")):
        import sys
        print(
            f"WARNING: AWS_IMAGES_FOLDER_URL ({AWS_IMAGES_FOLDER_URL!r}) does not end with "
            f"AWS_KEY_PREFIX ({AWS_KEY_PREFIX!r}); stored image URLs may not resolve to the "
            f"uploaded object keys.",
            file=sys.stderr,
        )
