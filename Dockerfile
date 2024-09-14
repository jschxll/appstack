FROM python:3.12

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

RUN apt-get update && apt-get install -y redis-server nginx-core

WORKDIR /app

COPY requirements.txt /app/

RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/
COPY nginx.conf /usr/share/nginx/nginx_new.conf

EXPOSE 80
EXPOSE 6379

CMD ["sh", "-c", "nginx -c /usr/share/nginx/nginx_new.conf && redis-server --daemonize yes && python3 manage.py runserver 0.0.0.0:8000"]