아이소메트릭 지하철 도면 폴리곤 추출

OpenCV 기반으로 아이소메트릭 2D 지하철 안내도에서 바닥 폴리곤을 추출하는 파이프라인입니다.
현재 버전은 기존 알고리즘을 유지한 상태로 코드만 모듈 단위로 분리했습니다.

현재 기능

- 빨간색 HSV 마커 4개 검출
- 마커 정렬 및 perspective matrix 계산
- 파란색 HSV 마스크 기반 바닥 폴리곤 추출
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
  color_clustering.py     추후 K-Means 색상 추출 기능을 위한 placeholder

설치 방법

가상환경 생성:

  python -m venv venv

가상환경 활성화:

  source venv/bin/activate

의존성 설치:

  pip install -r requirements.txt

기본 실행

  python pipeline/main.py --image test_marker.png

현재 샘플 이미지 기준 기대 출력:

  markers=4, polygons=2

디버그 이미지 저장

  python pipeline/main.py --image test_marker.png --debug

저장되는 파일:

  debug_output/debug_original.png
  debug_output/debug_canvas.png

OpenCV 창으로 확인

--show 옵션은 --debug와 함께 사용합니다.

  python pipeline/main.py --image test_marker.png --debug --show

디버그 저장 폴더 변경

  python pipeline/main.py --image test_marker.png --debug --debug-dir my_debug

문법 검사

  python -m py_compile pipeline/main.py pipeline/marker_detection.py pipeline/polygon_extraction.py pipeline/transform.py pipeline/visualization.py pipeline/export_json.py pipeline/color_clustering.py

주의사항

- 현재는 K-Means 색상 자동 추출을 구현하지 않았습니다.
- 현재는 JSON export를 구현하지 않았습니다.
- 전체 이미지를 warp하지 않고, 기존 방식처럼 폴리곤 꼭짓점 배열만 변환합니다.
- 마커 검출 조건과 폴리곤 추출 조건은 기존 코드와 동일하게 유지했습니다.

원본 데이터 출처

https://data.seoul.go.kr/dataList/OA-11984/S/1/datasetView.do#AXexec
