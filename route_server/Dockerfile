FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt ./requirements.txt
COPY route_server/requirements.txt ./route_server/requirements.txt
RUN python -m pip install --no-cache-dir -r route_server/requirements.txt

COPY pipeline ./pipeline
COPY route_server ./route_server

ENV ROUTE_SERVER_DATA_ROOT=/data/route_server
EXPOSE 8080

CMD ["uvicorn", "route_server.app.main:app", "--host", "0.0.0.0", "--port", "8080"]
