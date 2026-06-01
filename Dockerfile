FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        libgl1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN python -m pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /data/images /data/projects

EXPOSE 5050

CMD ["python", "editor/app.py", \
     "--image", "/data/images/test1.png", \
     "--polygons", "/data/projects/test1/intermediate_polygons.json", \
     "--output", "/data/projects/test1/manual_annotations.json", \
     "--final-output", "/data/projects/test1/final_polygons.json", \
     "--plane-output", "/data/projects/test1/scene_planes.json", \
     "--marker-config", "/data/projects/test1/marker_config.json", \
     "--image-root", "/data/images", \
     "--project-output-root", "/data/projects", \
     "--allow-missing-image", \
     "--host", "0.0.0.0", \
     "--port", "5050", \
     "--invert-x"]
