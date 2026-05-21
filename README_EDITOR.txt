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


5. 새 이미지 처리 순서

Load Selected Image
필요하면 Start Crop -> 드래그 -> Apply Crop
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
final_polygons.json
scene_planes.json
scene_planes_preview.png
navigation_graph.json
assets.json


7. 기존 작업 이어서 열기

기존 작업을 다른 컴퓨터로 옮길 때는 원본 이미지와 해당 output 폴더를 같이 옮긴다.

에디터에서 Load Exported Final 버튼을 누르면 현재 프로젝트의 final_polygons.json을 작업 세트로 불러온다.
그 옆의 파일 선택 input에서 다른 final_polygons.json 파일을 직접 선택해도 작업 세트로 불러올 수 있다.

