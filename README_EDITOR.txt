Subway Polygon Editor 실행 순서
================================

1. 저장소 받기

git clone https://github.com/subway-sniffer/subway-polygon-extractor.git
cd subway-polygon-extractor


2. 가상환경 생성/실행

python3 -m venv ../venv
source ../venv/bin/activate


3. 의존성 설치

python3 -m pip install -r requirements.txt


4. 에디터 실행

python3 editor/app.py \
  --image test1.png \
  --polygons ../test_image_output/test1/output/intermediate_polygons.json \
  --output ../test_image_output/test1/output/manual_annotations.json \
  --final-output ../test_image_output/test1/output/final_polygons.json \
  --plane-output ../test_image_output/test1/output/scene_planes.json \
  --marker-config ../test_image_output/test1/output/marker_config.json \
  --image-root . \
  --project-output-root ../test_image_output/web_projects \
  --port 5050 \
  --invert-x

브라우저에서 아래 주소를 연다.

http://127.0.0.1:5050


4-1. Docker로 에디터 실행

Docker 실행 시에도 아이콘 템플릿은 서버 이미지에 포함된다.
즉 templates/icons 아래의 아이콘 이미지는 컨테이너 내부 /app/templates/icons 에 들어간다.

입력 이미지와 결과 파일은 컨테이너 안에 넣지 않고 볼륨으로 연결한다.
기본 설정은 아래와 같다.

입력 이미지 루트:

./  ->  /data/images

출력 프로젝트 루트:

../test_image_output/web_projects  ->  /data/projects

기본 실행:

docker compose up --build

Docker 설치 직후 permission denied가 나면 현재 터미널에 docker 그룹 권한이 아직 반영되지 않은 상태다.
Ubuntu/WSL 터미널을 완전히 껐다가 다시 열고 실행한다.

바로 테스트해야 하면 아래처럼 실행할 수 있다.

sg docker -c 'docker compose up --build'

브라우저에서 아래 주소를 연다.

http://127.0.0.1:5050

기본 입력 이미지는 컨테이너 기준 /data/images/test1.png 이다.
즉 현재 저장소 루트에 있는 test1.png를 기본으로 연다.

다른 이미지 폴더를 쓰고 싶으면 아래처럼 실행한다.

EDITOR_IMAGE_ROOT=/d/capstone2/station_images \
EDITOR_IMAGE=/data/images/432_총신대입구.png \
EDITOR_OUTPUT_ROOT=/d/capstone2/test_image_output/web_projects \
docker compose up --build

주의:
EDITOR_IMAGE는 호스트 경로가 아니라 컨테이너 내부 경로로 적는다.
EDITOR_IMAGE_ROOT로 연결한 폴더가 컨테이너 내부에서는 /data/images로 보인다.

필요하면 개별 파일 경로도 지정할 수 있다.

EDITOR_POLYGONS=/data/projects/432_총신대입구/intermediate_polygons.json \
EDITOR_ANNOTATIONS=/data/projects/432_총신대입구/manual_annotations.json \
EDITOR_FINAL_OUTPUT=/data/projects/432_총신대입구/final_polygons.json \
EDITOR_PLANE_OUTPUT=/data/projects/432_총신대입구/scene_planes.json \
EDITOR_MARKER_CONFIG=/data/projects/432_총신대입구/marker_config.json \
docker compose up

Docker 이미지에 포함하지 않는 것:

venv
__pycache__
대량 역 안내도 이미지 폴더
Blender/FBX/GLB 파일
debug/output 결과물


4-2. Windows에서 Docker로 실행

Windows에서는 Docker Desktop을 설치하고 실행한 뒤 PowerShell에서 실행한다.
WSL을 쓰는 경우 Docker Desktop Settings -> Resources -> WSL integration에서 Ubuntu 연동을 켠다.

PowerShell에서 저장소로 이동한다.

cd C:\capstone2\test_image

기본 실행:

docker compose up --build

브라우저에서 아래 주소를 연다.

http://localhost:5050

다른 이미지 폴더를 쓰는 예시:

$env:EDITOR_IMAGE_ROOT="C:\capstone2\station_images"
$env:EDITOR_OUTPUT_ROOT="C:\capstone2\test_image_output\web_projects"
$env:EDITOR_IMAGE="/data/images/432_총신대입구.png"
docker compose up --build

중요:
EDITOR_IMAGE_ROOT와 EDITOR_OUTPUT_ROOT는 Windows 실제 경로다.
EDITOR_IMAGE는 컨테이너 내부 경로라서 /data/images/... 형태로 적는다.

WSL Ubuntu 터미널에서 실행한다면 Linux 경로를 쓴다.

cd /d/capstone2/test_image

EDITOR_IMAGE_ROOT=/d/capstone2/station_images \
EDITOR_OUTPUT_ROOT=/d/capstone2/test_image_output/web_projects \
EDITOR_IMAGE=/data/images/432_총신대입구.png \
docker compose up --build


4-3. Docker 폴더 관리 방식

컨테이너 내부 경로는 고정되어 있다.

/app
서버 코드가 들어간다. editor, pipeline, templates/icons 등이 포함된다.

/data/images
입력 이미지 폴더다. docker-compose.yml에서 EDITOR_IMAGE_ROOT를 여기에 연결한다.
기본값은 현재 저장소 루트(.)다.
읽기 전용으로 연결하므로 원본 이미지는 컨테이너가 수정하지 않는다.

/data/projects
작업 결과 폴더다. docker-compose.yml에서 EDITOR_OUTPUT_ROOT를 여기에 연결한다.
기본값은 ../test_image_output/web_projects다.
마커, 아이콘 감지 결과, 클러스터, 폴리곤, 수동 편집, 최종 export가 모두 여기에 저장된다.

이미지별 결과 폴더는 보통 아래처럼 생긴다.

/data/projects/<이미지이름>/

호스트 기준으로는 아래와 같다.

../test_image_output/web_projects/<이미지이름>/

예시:

../test_image_output/web_projects/432_총신대입구/

주요 결과 파일:

marker_config.json
marker_filled.png
icon_matches.json
icon_filled.png
color_clusters.json
intermediate_polygons.json
manual_annotations.json
final_polygons_<이미지이름>.json
scene_planes_<이미지이름>.json
scene_planes_preview.png
navigation_graph.json
assets.json

크롭 이미지와 업로드 이미지는 출력 루트 아래에 따로 저장된다.

../test_image_output/web_projects/_cropped_images/
../test_image_output/web_projects/_uploads/

다른 컴퓨터로 작업을 옮길 때는 원본 이미지와 해당 결과 폴더를 같이 옮긴다.


5. 새 이미지 처리 순서

Load Selected Image
필요하면 Start Crop -> 드래그 후 마우스를 놓으면 자동 적용
Start Manual Marker
마커 4점 클릭
Save Marker
1. Prepare Marker Image
2. Detect Icons
3. Prepare Icon Image
4. Run K-Means
Load Clusters
Include clusters 입력
5. Extract Polygons
수동 편집
Export Final Polygons
필요하면 render scene preview 체크
Export Scene Planes


6. 주요 결과 파일 위치

기본 출력은 parent 폴더의 아래 경로에 저장된다.

../test_image_output/web_projects/<이미지이름>/

주요 파일:

marker_config.json
marker_filled.png
icon_matches.json
icon_filled.png
color_clusters.json
intermediate_polygons.json
manual_annotations.json
final_polygons_<이미지이름>.json
scene_planes_<이미지이름>.json
scene_planes_preview.png
navigation_graph.json
assets.json


7. 기존 작업 이어서 열기

기존 작업을 다른 컴퓨터로 옮길 때는 원본 이미지와 해당 output 폴더를 같이 옮긴다.

에디터에서 Load Exported Final 버튼을 누르면 현재 프로젝트의 final_polygons.json을 작업 세트로 불러온다.
그 옆의 파일 선택 input에서 다른 final_polygons.json 파일을 직접 선택해도 작업 세트로 불러올 수 있다.
