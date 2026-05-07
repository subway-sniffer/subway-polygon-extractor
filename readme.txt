아이소메트릭 지하철 도면 폴리곤 추출

OpenCV 기반으로 아이소메트릭 2D 지하철 안내도에서 바닥 폴리곤을 추출하는 파이프라인입니다.
현재 버전은 기존 알고리즘을 유지한 상태로 코드만 모듈 단위로 분리했습니다.

현재 기능

- 빨간색 HSV 마커 4개 검출
- 마커 정렬 및 perspective matrix 계산
- 파란색 HSV 마스크 기반 바닥 폴리곤 추출
- LAB 색공간 K-Means 기반 색상 cluster 추출
- 전체 이미지 warp 없이 폴리곤 꼭짓점만 perspectiveTransform 적용
- 변환된 폴리곤 auto-centering
- 원본 디버그 이미지와 변환 결과 캔버스 저장

프로젝트 구조

pipeline/
  main.py                 실행 진입점, argparse 처리
  marker_detection.py     빨간 마커 검출, 마커 정렬, perspective matrix 계산
  polygon_extraction.py   HSV 마스크 생성, contour 필터링, approxPolyDP
  transform.py            폴리곤 꼭짓점 변환, auto-centering, canvas size 계산
  visualization.py        디버그 이미지 생성, 저장, 선택적 화면 표시
  export_json.py          추후 JSON 저장 기능을 위한 placeholder
  color_clustering.py     K-Means 색상 cluster 추출

설치 방법

가상환경 생성:

  python -m venv venv

가상환경 활성화:

  source venv/bin/activate

의존성 설치:

  pip install -r requirements.txt

기본 실행

  python pipeline/main.py --image test_marker.png

HSV 모드 실행

  python pipeline/main.py --image test_marker.png --mode hsv

K-Means 모드 실행

  python pipeline/main.py --image test_marker.png --mode kmeans --kmeans-k 6

선택한 cluster만 폴리곤 추출에 사용

cluster id는 1부터 시작합니다. 여러 개를 사용할 때는 쉼표로 입력합니다.

  python pipeline/main.py --image test_marker.png --mode kmeans --kmeans-k 6 --include-clusters 1,3,5

K-Means cluster별 morphology 설정

노이즈가 많은 도면을 기준으로 기본값은 open_kernel=3, close_kernel=5입니다.
이 값은 cluster별 mask에 적용되고 ../test_image_output/output/color_clusters.json에도 cluster별로 저장됩니다.

open_kernel은 작은 흰색 노이즈를 제거하는 MORPH_OPEN 커널 크기입니다.
텍스트 조각, 아이콘 조각, 작은 오검출 영역을 줄일 때 사용합니다.

close_kernel은 작은 검은 구멍을 메우고 끊긴 흰색 영역을 연결하는 MORPH_CLOSE 커널 크기입니다.
바닥면 내부가 듬성듬성 비어 있거나 하나의 면이 여러 조각으로 끊길 때 사용합니다.

커널 크기는 보통 홀수로 사용합니다.

  0: 적용 안 함
  3: 약하게 보정
  5: 기본 보정
  7: 강하게 보정

짝수를 입력하면 코드에서 다음 홀수로 보정합니다.

  python pipeline/main.py --image test_marker.png --mode kmeans --open-kernel 3 --close-kernel 5

값을 0으로 주면 해당 연산을 적용하지 않습니다.

  python pipeline/main.py --image test_marker.png --mode kmeans --open-kernel 0 --close-kernel 5

저장되는 K-Means 색상 메타데이터 예:

  {
    "id": 1,
    "selected": true,
    "morphology": {
      "open_kernel": 3,
      "close_kernel": 5
    }
  }

최종 floor_polygons.json의 extraction 필드에도 morphology 설정이 저장됩니다.

색상 및 폴리곤 JSON 저장

기본 저장 폴더는 프로젝트 parent 디렉터리의 ../test_image_output/output/입니다.
산출물을 프로젝트 내부에 두지 않아 Codex가 파일 탐색할 때 불필요한 결과 파일을 덜 읽게 하기 위한 구조입니다.

HSV 모드 실행 시:

  ../test_image_output/output/extraction_colors.json
  ../test_image_output/output/floor_polygons.json

K-Means 모드 실행 시:

  ../test_image_output/output/color_clusters.json
  ../test_image_output/output/floor_polygons.json

floor_polygons.json은 3D 변환에서 색상/재질을 유지할 수 있도록 색상별 그룹을 따로 저장합니다.
선택 cluster를 하나로 합친 mask에서 폴리곤을 뽑지 않고, cluster별 mask에서 각각 폴리곤을 추출합니다.

주요 필드:

  extraction     추출 조건과 재현 메타데이터
  polygons       전체 폴리곤을 한 배열로 모은 호환용 flat list
  color_groups   색상/cluster별 폴리곤 그룹

K-Means color_groups 예:

  {
    "type": "kmeans_cluster",
    "cluster_id": 1,
    "color_space": "lab",
    "center": [179.09, 124.97, 132.31],
    "polygon_count": 6,
    "polygons": [...]
  }

현재 샘플에서 --include-clusters 1,3을 사용하면 cluster 1과 cluster 3이 별도 그룹으로 저장됩니다.

저장 폴더를 바꾸려면 --output-dir 옵션을 사용합니다.

  python pipeline/main.py --image test_marker.png --mode hsv --output-dir my_output

HSV 색상 범위 설정 파일

  config/color_ranges.json

다른 색상 범위를 선택하려면 --color-range 옵션을 사용합니다.

  python pipeline/main.py --image test_marker.png --mode hsv --color-range floor_blue

저장된 color_clusters.json 재실행 시험

저장된 K-Means cluster center와 selected 값을 다시 읽어서 폴리곤을 뽑는 시험 코드는
별도 파일로 분리했습니다.

  tests/test_replay_color_clusters.py

시험에서는 기본적으로 K-Means cluster 수를 4로 사용합니다.

  ../venv/bin/python tests/test_replay_color_clusters.py --image test_marker.png

시험 코드도 기본 morphology 값으로 open_kernel=3, close_kernel=5를 사용합니다.
다른 값을 시험하려면 옵션으로 지정합니다.

  ../venv/bin/python tests/test_replay_color_clusters.py --image test_marker.png --open-kernel 0 --close-kernel 7

기본 선택 cluster는 1,3입니다. 바꾸려면 --include-clusters 옵션을 사용합니다.

  ../venv/bin/python tests/test_replay_color_clusters.py --image test_marker.png --include-clusters 1,2

cluster별 폴리곤 이미지를 같이 저장하려면 --save-cluster-polygons 옵션을 사용합니다.

  ../venv/bin/python tests/test_replay_color_clusters.py --image test_marker.png --save-cluster-polygons

정사영과 auto-centering이 끝난 색상별 폴리곤을 해당 cluster 색으로 채운 이미지로 저장하려면
--save-centered-color-polygons 옵션을 사용합니다.

  ../venv/bin/python tests/test_replay_color_clusters.py --image test_marker.png --save-centered-color-polygons

저장 위치:

  ../test_image_output/tests/output_replay_k4/centered_color_polygons/

생성 파일 예:

  cluster_01_centered_filled.png
  cluster_03_centered_filled.png

epsilon_ratio 비교 시험

폴리곤 단순화 정도를 비교하려면 별도 sweep 테스트를 사용합니다.
기본값은 0.001, 0.003, 0.005, 0.01입니다.

  ../venv/bin/python tests/test_epsilon_sweep.py --image test_marker.png

다른 값을 비교하려면 --ratios 옵션을 사용합니다.

  ../venv/bin/python tests/test_epsilon_sweep.py --image test_marker.png --ratios 0.002,0.004,0.006

시험 결과는 ratio별 폴더에 따로 저장됩니다.

  ../test_image_output/tests/output_epsilon_sweep/epsilon_0_001/floor_polygons.json
  ../test_image_output/tests/output_epsilon_sweep/epsilon_0_003/floor_polygons.json
  ../test_image_output/tests/output_epsilon_sweep/epsilon_0_005/floor_polygons.json
  ../test_image_output/tests/output_epsilon_sweep/epsilon_0_01/floor_polygons.json
  ../test_image_output/tests/output_epsilon_sweep/summary.json

각 ratio 폴더에는 edge_counts.json과 polygon_canvas.png도 저장됩니다.

시험 결과 파일:

  ../test_image_output/tests/output_replay_k4/color_clusters.json
  ../test_image_output/tests/output_replay_k4/floor_polygons_from_clusters.json

cluster별 폴리곤 이미지 저장 옵션을 사용하면 다음 폴더에 이미지가 생성됩니다.

  ../test_image_output/tests/output_replay_k4/cluster_polygons/

파일명에는 selected/unselected 상태가 포함됩니다.

  cluster_01_selected_polygons.png
  cluster_02_unselected_polygons.png

현재 샘플 이미지 기준 시험 출력 예:

  kmeans_k=4
  morphology={'open_kernel': 3, 'close_kernel': 5}
  selected_clusters=[1, 3]
  markers=4, polygons=8

K-Means 색상별 저장 기준에서는 같은 조건에서 flat polygons=8입니다.

  cluster 1: polygons=6
  cluster 3: polygons=2

현재 샘플 이미지 기준 기대 출력:

  markers=4, polygons=2

디버그 이미지 저장

  python pipeline/main.py --image test_marker.png --debug

저장되는 파일:

  ../test_image_output/output/debug/debug_original.png
  ../test_image_output/output/debug/debug_canvas.png

K-Means 모드에서 --debug를 사용하면 cluster별 debug 이미지도 저장됩니다.

  ../test_image_output/output/debug/clusters/cluster_01_mask.png
  ../test_image_output/output/debug/clusters/cluster_01_result.png

OpenCV 창으로 확인

--show 옵션은 --debug와 함께 사용합니다.

  python pipeline/main.py --image test_marker.png --debug --show

디버그 저장 폴더 변경

기본값은 <output-dir>/debug입니다. 직접 바꾸려면 --debug-dir 옵션을 사용합니다.

  python pipeline/main.py --image test_marker.png --debug --debug-dir my_debug

문법 검사

  python -m py_compile pipeline/main.py pipeline/marker_detection.py pipeline/polygon_extraction.py pipeline/transform.py pipeline/visualization.py pipeline/export_json.py pipeline/color_clustering.py

주의사항

- 현재는 JSON export를 구현하지 않았습니다.
- 전체 이미지를 warp하지 않고, 기존 방식처럼 폴리곤 꼭짓점 배열만 변환합니다.
- 마커 검출 조건과 폴리곤 추출 조건은 기존 코드와 동일하게 유지했습니다.
- K-Means는 흰 배경, 검은 텍스트, 빨간 마커 픽셀을 제외하고 수행합니다.

원본 데이터 출처

https://data.seoul.go.kr/dataList/OA-11984/S/1/datasetView.do#AXexec
