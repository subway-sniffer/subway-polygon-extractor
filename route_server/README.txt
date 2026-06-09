Subway Route Server
===================

목표
----
Editor에서 만든 navigation_graph.json, route_video_edges.json을 별도 Python 서버에 등록하고,
앱 요청을 실제 node route와 R2 영상 URL 목록으로 변환한다.

폴더 구조
---------
route_server/
  app/
    main.py          FastAPI 엔드포인트
    db.py            SQLite index schema/connection
    importer.py      JSON 저장 후 DB index 생성
    storage.py       역별 JSON 파일 저장소
    indexing.py      호선/방면/호차/출구 입력을 node로 변환
    video_index.py   route edge를 영상 파일명/URL로 변환
  scripts/
    import_station.py
  data/              로컬 역 데이터 저장 위치

저장 구조
---------
큰 JSON은 파일로 저장하고, SQLite는 검색용 index만 담당한다.

route_server/data/
  index.sqlite
  stations/
    133/
      v001/
        metadata.json
        navigation_graph.json
        route_video_edges.json
        scene_planes.json

SQLite 주요 테이블:

stations
station_versions
platform_nodes
exit_nodes
facility_nodes
video_edges

설치
----
프로젝트 루트에서 실행한다.

python3 -m venv ../venv
source ../venv/bin/activate
python3 -m pip install -r route_server/requirements.txt

서버 실행
---------
python3 -m uvicorn route_server.app.main:app --host 0.0.0.0 --port 8080

환경변수
--------
ROUTE_SERVER_DATA_ROOT
  역별 JSON 저장 루트. 기본값: route_server/data

ROUTE_SERVER_VIDEO_BASE_URL
  R2 public/custom domain base URL.
  예: https://videos.example.com

ROUTE_SERVER_ADMIN_TOKEN
  설정하면 admin import API 호출 시 X-Admin-Token 헤더가 필요하다.

역 데이터 import
----------------
Editor에서 export한 navigation_graph와 route_video_edges를 등록한다.
import하면 JSON 파일 저장과 SQLite index 생성이 함께 실행된다.

python3 route_server/scripts/import_station.py \
  --station-id 133 \
  --station-name 서울역 \
  --line-id 1 \
  --line-id 4 \
  --version v001 \
  --navigation-graph ../test_image_output/web_projects/133_서울역_crop/navigation_graph_133_서울역_crop.json \
  --route-video-edges ../test_image_output/web_projects/133_서울역_crop/route_video_edges_133_서울역_crop.json \
  --scene-planes ../test_image_output/web_projects/133_서울역_crop/scene_planes_133_서울역_crop.json

API 예시
--------
역 목록:

curl http://127.0.0.1:8080/stations

앱에서 선택 가능한 옵션:

curl http://127.0.0.1:8080/stations/133/route-options

경로 요청:

curl -X POST http://127.0.0.1:8080/route \
  -H "Content-Type: application/json" \
  -d '{
    "station_id": "133",
    "start": {
      "type": "platform",
      "line_id": "1호선",
      "direction": "남영",
      "car": 3
    },
    "goal": {
      "type": "exit",
      "exit_number": "4"
    },
    "route_preference": "none"
  }'

화장실 경유 경로:

curl -X POST http://127.0.0.1:8080/route \
  -H "Content-Type: application/json" \
  -d '{
    "station_id": "133",
    "start": {
      "type": "platform",
      "line_id": "1호선",
      "direction": "남영",
      "car": 3
    },
    "goal": {
      "type": "exit",
      "exit_number": "4"
    },
    "include_toilet": true,
    "toilet_gender": "female",
    "route_preference": "none"
  }'

응답에는 앱용 segments와 디버그용 debug가 포함된다.

segments 예:

{
  "segments": [
    {
      "index": 1,
      "from_type": "platform",
      "to_type": "stair",
      "video_url": "https://pub-xxxx.r2.dev/stations/133/v001/videos/서울역_N0127_N0209.mp4"
    }
  ],
  "debug": {
    "node_path": ["platform_003_car_3_door_2", "stair_019_to"],
    "edge_ids": ["N0127_N0209"],
    "missing_video_edges": []
  }
}

앱은 기본적으로 segments[].from_type, segments[].to_type, segments[].video_url만 사용하면 된다.
debug는 개발/검증용이다.
video_url은 ROUTE_SERVER_VIDEO_BASE_URL이 있으면 R2 URL 형태로 만들어진다.

Docker 실행
-----------
cd route_server
ROUTE_SERVER_VIDEO_BASE_URL=https://videos.example.com docker compose up --build

개발 메모
---------
- 경로 계산은 사용자 요청 1개에 대해서만 수행한다.
- 전체 platform-car/exit 조합 edge planner는 Editor나 빌드 단계에서 미리 실행한다.
- route_video_edges.json은 영상 촬영/렌더링 목록이자 서버의 edge->video index다.
- 여러 역을 다루기 위해 모든 DB index는 station_id + version 기준으로 저장한다.
- navigation_graph.json과 route_video_edges.json이 서로 다른 시점의 파일이면 missing_video_edges가 생길 수 있다.
  Editor에서 Build Route Video Edges를 다시 실행한 뒤 같은 version으로 재import해야 한다.

빠른 테스트 순서
---------------
1. Editor에서 Export Scene Planes와 Build Route Video Edges를 실행한다.
2. import_station.py로 역 패키지를 등록한다.
3. 서버를 실행한다.
4. /stations로 역 목록을 확인한다.
5. /stations/{station_id}/route-options로 앱 선택지를 확인한다.
6. /route로 일반 경로와 화장실 경유 경로를 각각 확인한다.
