FROM python:3.12-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

COPY crawler/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY crawler/app ./app
COPY crawler/extractors ./extractors
COPY crawler/scrapy.cfg ./scrapy.cfg

CMD ["python", "-m", "app.main"]
