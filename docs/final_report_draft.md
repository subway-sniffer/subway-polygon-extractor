# 최종 보고서 초안

## 1. 프로젝트 개요

본 프로젝트는 지하철역 내부의 2D 아이소메트릭 안내도를 기반으로 3D 실내 지도와 경로 안내 데이터를 제작하는 시스템을 구현하는 것을 목표로 한다. 기존 지하철 안내도는 이용자가 전체 구조를 빠르게 파악하기에는 적합하지만, 앱이나 3D 엔진에서 직접 활용할 수 있는 구조화된 공간 데이터는 제공하지 않는다. 특히 승강장, 대합실, 계단, 에스컬레이터, 엘리베이터, 개찰구, 출구, 화장실 등 실제 이동에 필요한 요소가 이미지 안에 시각적으로만 존재하므로, 경로 탐색이나 3D 길안내 서비스에 바로 사용할 수 없다.

본 시스템은 이러한 이미지 기반 안내도를 반자동으로 벡터 폴리곤, 시설 객체, 연결 노드, 경로 그래프로 변환한다. 초기 목표는 OpenCV만으로 안내도에서 바닥 폴리곤을 자동 추출하는 것이었으나, 실제 역 안내도는 아이콘, 계단, 색상 노이즈, 원근 왜곡, 층별 위치 오차, 수동 보정 필요성이 존재하였다. 따라서 최종 결과물은 자동 추출 파이프라인과 웹 기반 보정 에디터, 3D export, 경로 서버까지 포함하는 제작 도구 체인으로 확장되었다.

결과적으로 사용자는 역 안내도 이미지를 불러오고, 마커와 색상 클러스터를 기준으로 폴리곤을 추출한 뒤, 웹 에디터에서 필요한 수동 보정을 수행하고, 최종적으로 Blender/Unity에서 사용할 수 있는 `scene_planes.json`, `navigation_graph.json`, 경로 영상 edge 목록, route API용 데이터 패키지를 생성할 수 있다.

## 2. 문제 정의

### 2.1 해결하고자 한 불편함

지하철역 내부 길찾기는 지상 지도 길찾기보다 정보 구조가 복잡하다. 승객은 단순히 현재 위치에서 목적 출구까지의 평면 경로만 필요한 것이 아니라, 다음과 같은 정보를 함께 알아야 한다.

- 어느 호차와 몇 번 문에서 내리면 가까운가
- 계단, 에스컬레이터, 엘리베이터 중 어떤 수단을 이용해야 하는가
- 개찰구를 통과해야 하는가
- 화장실을 들른 뒤 목적지로 갈 수 있는가
- 환승역에서 어느 방향 승강장으로 이동해야 하는가
- 출구까지 실제로 어떤 공간을 지나가는가

하지만 공개 데이터는 대개 역명, 호선, 출구, 빠른 하차 정보 등 텍스트 중심이다. 역 내부 전체 공간의 3D 구조나 이동 가능한 노드 그래프는 충분히 제공되지 않는다. 반대로 지하철 안내도 이미지는 사람이 보기에는 유용하지만, 컴퓨터가 직접 길찾기에 사용하기에는 픽셀 이미지일 뿐이다.

이 프로젝트의 핵심 문제는 “사람이 보는 지하철 안내도 이미지”를 “컴퓨터가 경로 탐색과 3D 시각화에 사용할 수 있는 공간 데이터”로 변환하는 것이다.

### 2.2 왜 중요한가

이 문제가 해결되면 다음과 같은 서비스를 만들 수 있다.

- 승강장 하차 위치 기반의 출구 안내
- 교통약자를 위한 엘리베이터 우선 경로 안내
- 화장실 경유 경로 안내
- 환승역 내부 3D 길안내
- 경로 구간별 영상 또는 3D 애니메이션 안내
- 역별 실내 공간 데이터 제작 자동화

특히 지하철역 내부는 GPS가 잘 동작하지 않고, 층간 이동이 많으며, 이용자의 목적이 매우 구체적이다. 따라서 2D 외부 지도보다 역 내부 구조화 데이터의 필요성이 크다.

## 3. 기술적 난점

### 3.1 아이소메트릭 안내도의 좌표 문제

지하철 안내도는 일반 평면도가 아니라 아이소메트릭 또는 준아이소메트릭 형태로 그려진다. 즉 실제 공간의 x, y, z 정보가 하나의 2D 이미지에 사선으로 투영된다. 이 때문에 이미지의 픽셀 좌표를 그대로 3D 좌표로 사용할 수 없다.

초기에는 빨간색 기준 마커 4개를 찍고 perspective transform을 적용하여 바닥면을 정사영하는 방식을 사용하였다. 이때 전체 이미지를 warp하지 않고, 추출한 폴리곤의 꼭짓점 좌표만 `cv2.perspectiveTransform`으로 변환하여 연산량을 줄였다.

그러나 실제 안내도에서는 층이 다르면 같은 transform을 적용했을 때 위치가 밀리는 문제가 있었다. 이는 층간 깊이가 사선 방향으로 표현되기 때문에 발생하는 전단 오차이다. 이후 웹 에디터에서 layer별 z 값, local shift, local axis correction, alignment 보정을 추가하여 이미지 기반 좌표와 3D export 좌표를 분리해 다룰 수 있도록 하였다.

### 3.2 폴리곤 자동 추출의 한계

OpenCV contour 기반으로 바닥 색상을 추출할 때 다음 문제가 발생하였다.

- 바닥 색상이 역마다 다르다.
- 같은 층의 바닥도 그림자, 투명도, 해상도에 따라 여러 색으로 나뉜다.
- 계단, 에스컬레이터, 아이콘, 텍스트가 바닥을 끊어놓는다.
- 원본 이미지의 압축 품질이 낮아 경계가 흐리다.
- 자동 추출된 폴리곤이 지나치게 복잡하거나 끊긴다.

이를 해결하기 위해 LAB 색공간 기반 K-Means 색상 클러스터링, morphology open/close, cluster별 폴리곤 추출, 아이콘 검출 및 마스킹, 수동 merge/split/simple keep 기능을 단계적으로 추가하였다. 완전 자동화만으로는 품질을 보장하기 어렵기 때문에, 최종적으로는 자동 추출 후 사람이 빠르게 보정하는 반자동 방식이 가장 현실적이라고 판단하였다.

### 3.3 경로 그래프 생성의 어려움

3D 모델을 만드는 것과 실제 길찾기 가능한 그래프를 만드는 것은 별개의 문제이다. 바닥 폴리곤만 있어도 시각화는 가능하지만, 경로 탐색에는 다음 정보가 필요하다.

- 같은 폴리곤 내부에서 이동 가능한 노드
- 계단/에스컬레이터/엘리베이터의 시작점과 도착점
- 개찰구를 통과할 때 public zone과 paid zone 전환
- 출구, 승강장, 화장실 같은 목적지 노드
- 엘리베이터 우선, 화장실 경유 같은 조건부 비용
- 경로 영상 edge와 실제 route segment 매칭

본 프로젝트에서는 Unity의 NavMesh가 실제 세부 이동 경로를 처리한다고 가정하고, 서버는 의미 있는 주요 노드 간 경로를 계산하는 방식으로 설계하였다. 즉 같은 폴리곤 내부의 세부 이동은 3D 엔진이 담당하고, 서버는 승강장, 출구, 계단, 게이트, 화장실 같은 노드 간 최적 경로를 계산한다.

## 4. 시스템 구성

전체 시스템은 크게 네 부분으로 구성된다.

```text
OpenCV 파이프라인
  -> 이미지에서 색상 클러스터와 폴리곤 추출

웹 에디터
  -> 마커, 폴리곤, 시설, 연결부, zone, 보정값 수동 편집

3D Export / Blender Generator
  -> scene_planes.json 기반 3D 바닥/시설 생성

Route Server
  -> navigation_graph.json 기반 앱용 경로 API 제공
```

### 4.1 OpenCV 파이프라인

주요 파일은 `pipeline/` 아래에 분리되어 있다.

```text
pipeline/main.py
pipeline/marker_detection.py
pipeline/color_clustering.py
pipeline/polygon_extraction.py
pipeline/transform.py
pipeline/export_json.py
pipeline/navigation_routing.py
pipeline/route_edge_planner.py
```

파이프라인의 기본 흐름은 다음과 같다.

1. 이미지 로드
2. 마커 검출 또는 수동 마커 로드
3. perspective matrix 계산
4. 마커를 바닥색으로 채운 이미지 생성
5. 아이콘 감지 및 아이콘을 주변 색상으로 마스킹
6. K-Means 색상 클러스터링
7. 사용자가 선택한 cluster 기준 폴리곤 추출
8. 폴리곤 꼭짓점 transform
9. 중간 폴리곤 JSON 저장

마커 검출은 HSV 기반으로 구현하였다. 초기에는 빨간색 마커를 사용했으나 실제 안내도에서 빨간색이 자주 등장하여, 이후 마젠타 마커를 사용할 수 있도록 확장하였다. 마커는 HSV 색상 범위, 면적, 형태 비율을 기준으로 필터링한다.

색상 추출은 하드코딩 HSV 방식에서 LAB 기반 K-Means 방식으로 확장하였다. 흰 배경, 검은 텍스트, 마커 색상은 클러스터링에서 제외하고, 주요 바닥색 cluster만 후보로 추출한다. cluster별 디버그 이미지를 저장하여 사용자가 어떤 cluster를 포함할지 확인할 수 있다.

### 4.2 웹 에디터

자동 추출만으로는 실제 역 전체를 안정적으로 처리하기 어려웠기 때문에 Flask 기반 로컬 웹 에디터를 구현하였다. 주요 파일은 다음과 같다.

```text
editor/app.py
editor/static/editor.js
editor/static/style.css
editor/templates/index.html
editor/geometry.py
editor/export_payload.py
editor/pipeline_runner.py
editor/project_store.py
```

웹 에디터의 핵심 기능은 다음과 같다.

- 이미지 선택 및 크롭
- 3점 또는 4점 manual marker 지정
- 파이프라인 단계별 실행
- cluster 확인 및 include cluster 설정
- 폴리곤 추가, 삭제, 이동, split, hole cut
- 폴리곤 merge 및 simple keep
- 벽, 개찰구, 계단, 에스컬레이터, 엘리베이터, 화장실, 출구, 승강장 점 편집
- paid/public zone 지정
- local shift, local axis correction, alignment correction
- scene preview 및 navigation node 확인
- final polygons, scene planes, navigation graph export
- route package upload

에디터는 완전 자동화가 어려운 부분을 빠르게 수동 보정하기 위한 도구이다. 특히 계단이나 아이콘으로 끊어진 폴리곤, 이미지 해상도 문제, 층별 위치 오차, 개찰구 zone 문제는 사용자의 판단이 필요한 경우가 많다.

### 4.3 Export 데이터

에디터는 최종적으로 다음과 같은 파일을 생성한다.

```text
final_polygons_<image>.json
scene_planes_<image>.json
navigation_graph_<image>.json
route_video_edges_<image>.json
manual_annotations.json
```

`final_polygons`는 편집된 폴리곤과 색상, 구멍, layer, 보정 정보를 저장한다. `scene_planes`는 Blender/Unity에서 사용하기 쉬운 3D 좌표계의 평면, 벽, 연결부, 시설 객체를 저장한다. `navigation_graph`는 경로 탐색용 노드와 edge를 포함한다. `route_video_edges`는 실제 앱에서 경로 구간별 영상 파일을 매칭하기 위한 edge 목록이다.

### 4.4 Route Server

Route Server는 FastAPI 기반으로 구현하였다. 주요 파일은 `route_server/` 아래에 있다.

```text
route_server/app/main.py
route_server/app/indexing.py
route_server/app/storage.py
route_server/app/video_index.py
route_server/app/schemas.py
route_server/app/station_aliases.py
route_server/APP_API.md
```

앱은 서버에 역, 출발지, 목적지, 조건을 보내고, 서버는 경로 segment와 각 segment에서 재생할 video URL을 반환한다.

대표 API 흐름은 다음과 같다.

```text
GET /stations
GET /stations/{station_id}/route-options
POST /route
POST /route/preview
```

`/route-options`는 앱에서 선택 가능한 호선, 방면, 호차, 출구, 시설 정보를 제공한다. `/route`는 실제 경로를 계산하고, `segments` 배열로 각 이동 구간의 `from_type`, `to_type`, `video_url`을 반환한다. `/route/preview`는 같은 요청 형식으로 경로가 이미지 위에 그려진 미리보기 PNG를 반환한다.

경로 조건은 현재 다음을 지원한다.

- 일반 경로
- 엘리베이터 우선 경로
- 남자/여자/공용 화장실 경유
- platform → exit
- exit → platform
- platform → platform
- paid/public zone 전환
- gate 통과 비용 반영

## 5. 구현 내용

### 5.1 마커 기반 좌표 변환

기준점 마커를 이용하여 안내도의 바닥면을 변환한다. 기존에는 직사각형 기반 정렬 공식인 `x+y`, `y-x` 방식이 마름모꼴 도면에서 높이를 0으로 만드는 문제가 있었다. 이를 해결하기 위해 x 최소/최대, y 최소/최대 기준으로 상/하/좌/우를 분류하는 아이소메트릭 전용 정렬 방식을 사용하였다.

전체 이미지를 warp하면 비용이 크고 결과 이미지가 손상될 수 있으므로, 본 프로젝트에서는 폴리곤 꼭짓점 배열에만 perspective transform을 적용한다. 이 방식은 원본 이미지 품질을 유지하면서 3D 좌표로 변환할 수 있고, 많은 폴리곤을 처리할 때도 효율적이다.

### 5.2 K-Means 색상 추출

HSV 범위를 역마다 직접 설정하는 방식은 유지보수가 어렵다. 따라서 LAB 색공간에서 K-Means를 수행하여 이미지의 주요 바닥색을 자동 추출하였다.

구현 시 다음 색상은 cluster 대상에서 제외하였다.

- 흰 배경
- 검은 텍스트
- 마커 색상
- 일부 아이콘/노이즈 색상

각 cluster는 mask와 debug 이미지로 저장된다. 사용자는 웹에서 cluster 결과를 보고 필요한 cluster id를 선택한다. cluster별 morphology open/close 수치를 조정하여 작은 노이즈 제거와 끊어진 면 채우기를 수행할 수 있다.

### 5.3 아이콘 감지와 마스킹

화장실, 에스컬레이터 등 안내도 아이콘은 폴리곤 추출 시 바닥을 끊어놓는 원인이 된다. 이를 완화하기 위해 template matching 기반 아이콘 감지 기능을 추가하였다. 템플릿은 폴더별로 관리하며, 좌우 반전된 아이콘도 감지할 수 있도록 하였다.

감지된 아이콘은 폴리곤 추출 전에 주변 색상 또는 지정 색상으로 채워서 contour가 끊기지 않도록 처리한다. 다만 아이콘을 완전히 자연스럽게 제거하는 것은 이미지 inpainting만으로 한계가 있었기 때문에, 최종적으로는 에디터에서 수동 보정이 가능하도록 설계하였다.

### 5.4 폴리곤 편집

실제 안내도에서는 자동 추출된 폴리곤이 끊기거나 여러 구역이 붙는 경우가 자주 발생하였다. 이를 해결하기 위해 웹 에디터에 다음 기능을 추가하였다.

- vertex 이동
- vertex 삽입
- 폴리곤 추가
- 폴리곤 삭제 및 undo
- 두 vertex를 기준으로 split
- hole cut
- simple keep
- auto merge
- local shift
- shared edge 보정

이 기능들은 모두 원본 폴리곤을 바로 파괴하지 않고, 최종 export 시 편집 결과가 반영되도록 설계하였다. 작업자는 원본 이미지를 배경으로 보면서 폴리곤을 수정할 수 있으므로, 안내도와 3D 모델의 차이를 줄일 수 있다.

### 5.5 시설과 연결부 편집

3D 경로 안내에는 바닥 외에도 시설과 연결부 정보가 필요하다. 에디터에서는 다음 요소를 입력할 수 있다.

- 계단
- 에스컬레이터
- 엘리베이터
- 출구 계단
- 출구 에스컬레이터
- 출구 엘리베이터
- 화장실
- 개찰구
- 승강장 하차 위치
- 지하철 탑승 방향
- 벽

계단과 에스컬레이터는 시작선과 도착 방향을 기반으로 3D asset 배치 정보를 생성한다. 엘리베이터와 화장실은 점과 방향을 기반으로 배치하며, 경로 노드는 실제 asset 중심이 아니라 사용자가 접근할 수 있는 앞쪽 지점에 배치한다. 개찰구는 public/paid 양쪽 노드를 생성하고, 게이트를 통과할 때 반드시 두 노드를 거치도록 처리하였다.

### 5.6 Zone과 경로 탐색

역 내부 경로에서 paid/public zone은 매우 중요하다. 같은 바닥 폴리곤 위에 있어도 개찰구를 통과해야 하는 영역이 다를 수 있기 때문이다. 본 시스템은 paid zone을 수동으로 지정하고, 지정되지 않은 영역은 public으로 간주한다.

경로 탐색에서는 다음 규칙을 적용한다.

- 같은 폴리곤 내부 노드는 이동 가능
- 다른 zone id 사이 이동은 기본적으로 제한
- public/paid 전환은 gate 노드를 통해서만 허용
- 계단, 에스컬레이터, 엘리베이터는 연결 edge가 있으면 층/zone 이동 가능
- 엘리베이터 우선 조건에서는 엘리베이터 비용을 낮추고 계단/에스컬레이터 비용을 높임
- 화장실 경유 조건에서는 시작→화장실→목적지의 합산 비용이 가장 낮은 경로 선택

이 방식은 완전한 NavMesh 경로 계산이 아니라, 앱과 영상 안내에 필요한 의미 단위 경로를 계산하는 데 초점을 맞춘다.

## 6. 결과물

### 6.1 제작 도구

최종적으로 다음 도구를 구현하였다.

- OpenCV 기반 폴리곤 추출 파이프라인
- Flask 기반 로컬 웹 에디터
- Docker 기반 에디터 실행 환경
- Blender scene generator 연동용 JSON export
- FastAPI 기반 경로 서버
- 앱 연동 API 문서
- route preview 이미지 생성 API
- route video edge 생성 도구

### 6.2 예시 역 데이터

작업 과정에서 여러 역을 대상으로 데이터를 구성하였다.

- 서울역
- 총신대입구역
- 상도역
- 고속터미널역
- 여의도역
- 압구정역

각 역에 대해 폴리곤, 시설, navigation graph, route video edges를 생성하고 경로 API 테스트를 수행하였다.

### 6.3 앱 연동 결과

Route Server는 앱에서 다음 방식으로 사용할 수 있다.

```json
{
  "station_id": "서울역",
  "start": {
    "type": "platform",
    "line_id": "1호선",
    "direction": "남영",
    "car": 1
  },
  "goal": {
    "type": "exit",
    "exit_number": "3"
  },
  "route_preference": "elevator",
  "include_toilet": false
}
```

응답은 경로 구간별 segment를 제공한다.

```json
{
  "segments": [
    {
      "from_type": "platform",
      "to_type": "stair",
      "video_url": "videos/서울역/서울역_N0119_N0209.mp4"
    },
    {
      "from_type": "stair",
      "to_type": "gate",
      "video_url": "videos/서울역/서울역_N0208_N0237.mp4"
    }
  ]
}
```

앱은 이 segment 순서대로 영상을 재생하거나, preview image를 받아 경로를 지도 위에 표시할 수 있다.

## 7. 검증

### 7.1 파이프라인 검증

다음 항목을 기준으로 파이프라인을 검증하였다.

- 마커 검출 또는 수동 마커 저장 여부
- K-Means cluster debug 이미지 생성 여부
- 선택 cluster 기준 폴리곤 추출 여부
- transform 후 폴리곤 좌표 저장 여부
- color metadata 저장 여부
- final polygons 재로드 가능 여부
- scene planes export 가능 여부

### 7.2 에디터 검증

에디터에서는 실제 작업 중 발생한 오류를 수정하며 기능을 검증하였다.

- load exported final 후 이전 이미지의 asset이 남는 문제 수정
- hole vertex 이동 시 폴리곤이 사라지는 문제 수정
- gate node의 paid/public 방향 문제 수정
- wall과 asset의 z offset 반영 문제 수정
- route node 표시 및 좌표 확인 기능 추가
- platform point와 exit point의 실제 node 생성 확인

### 7.3 Route Server 검증

서버는 로컬과 상용 서버 모두에서 테스트하였다.

- `/stations`
- `/stations/{station_id}/route-options`
- `/route`
- `/route/preview`

서울역, 총신대입구, 상도, 고속터미널, 여의도, 압구정 등에서 platform→exit, exit→platform, platform→platform 경로를 호출하였다. 또한 route video edge 누락 여부를 확인하고, 필요한 edge만 별도로 추출하는 테스트를 수행하였다.

## 8. 한계와 개선 방향

### 8.1 자동 폴리곤 추출의 한계

현재 시스템은 자동 추출 후 수동 보정을 전제로 한다. 안내도마다 색상과 해상도, 아이콘 배치, 층 표현 방식이 다르기 때문에 완전 자동화는 아직 어렵다. 향후에는 SAM 계열 segmentation 모델이나 사용자 브러시 기반 region pick 기능을 도입하여 수동 보정 시간을 줄일 수 있다.

### 8.2 실제 거리 스케일 문제

현재 좌표는 안내도 이미지 기반 상대 좌표에 가깝다. 일부 구간은 수동 길이 보정과 layer height를 통해 실제 크기에 가깝게 조정할 수 있으나, 역 전체의 절대 실제 치수를 완전히 반영하지는 못한다. 향후 공개 실측 데이터, BIM, CAD, 또는 현장 측정 정보를 결합하면 정확도를 높일 수 있다.

### 8.3 데이터 제작 비용

에디터를 통해 작업 속도는 크게 개선되었지만, 역별로 폴리곤과 시설을 수동 검수해야 한다. 수백 개 역으로 확장하려면 작업 표준화, 품질 검사 도구, 자동 오류 탐지 기능이 필요하다.

### 8.4 경로 영상 제작 비용

경로 안내를 영상 기반으로 제공하면 사용자 이해도는 높아지지만, edge별 영상 생성과 업로드 비용이 발생한다. 이를 줄이기 위해 route video edge를 중복 제거하고, car 단위 대표 노드를 사용하며, 필요한 edge만 추출하는 기능을 구현하였다. 향후에는 Unity에서 실시간 카메라 이동으로 영상을 동적으로 생성하거나, 앱에서 3D 경로를 직접 렌더링하는 방식도 고려할 수 있다.

## 9. 기대 효과

본 프로젝트는 단순한 이미지 처리 실험이 아니라, 실제 앱 서비스와 연결 가능한 실내 길안내 데이터 제작 파이프라인을 구현했다는 점에서 의미가 있다.

기대 효과는 다음과 같다.

- 지하철 안내도 이미지를 3D 공간 데이터로 변환
- 역 내부 경로 탐색을 위한 node/edge graph 생성
- 교통약자와 일반 이용자 모두를 위한 조건부 경로 안내
- Blender/Unity 기반 3D 시각화 가능
- route API와 앱 연동 가능
- 역별 데이터 제작 과정을 도구화하여 반복 작업 가능

## 10. 결론

본 프로젝트는 아이소메트릭 지하철 안내도라는 비정형 이미지 데이터를 출발점으로 하여, 3D 지도와 경로 안내에 필요한 구조화 데이터를 생성하는 시스템을 구현하였다. 초기 OpenCV 기반 폴리곤 추출에서 시작하여, K-Means 색상 추출, 웹 기반 수동 보정, 시설/연결부 annotation, 3D scene export, navigation graph 생성, FastAPI route server까지 확장하였다.

가장 중요한 성과는 완전 자동화가 어려운 현실적인 데이터 제작 문제를 반자동 파이프라인과 에디터로 해결했다는 점이다. 사용자는 자동 추출 결과를 기반으로 필요한 부분만 보정하고, 최종적으로 앱과 3D 엔진에서 사용할 수 있는 JSON 데이터를 생성할 수 있다. 또한 route server를 통해 실제 앱에서 승강장, 출구, 엘리베이터, 화장실 조건을 포함한 경로 요청을 처리할 수 있다.

향후에는 segmentation 모델을 이용한 폴리곤 추출 자동화, 실제 거리 보정, 대량 역 데이터 품질 관리, Unity 실시간 경로 렌더링을 추가하면 더 높은 완성도의 지하철 실내 길안내 서비스로 발전시킬 수 있다.

## 부록 A. 주요 산출 파일

```text
README.md
README_EDITOR.txt
route_server/APP_API.md

pipeline/
editor/
route_server/
blender-map-generator/

examples/
docs/images/
```

## 부록 B. 발표용 핵심 메시지

최종 발표에서는 다음 순서로 설명하는 것이 적절하다.

1. 문제 정의: 지하철 안내도는 사람이 보기 위한 이미지라 앱 경로 탐색에 바로 쓸 수 없다.
2. 시나리오: 승객이 특정 호차에서 내려 출구, 환승, 화장실, 엘리베이터 조건으로 이동한다.
3. 결과 데모: 에디터에서 안내도 이미지를 불러오고, 3D 모델과 경로 API 결과를 보여준다.
4. 기술 난점: 아이소메트릭 좌표 변환, 폴리곤 추출, 층/zone/개찰구, 경로 그래프 생성.
5. 해결 방식: 자동 추출 + 웹 보정 + scene export + route server.
6. 완성도: 실제 여러 역 데이터와 앱 API 호출까지 연결했다.

10분 발표라면 데모는 2~3분이 적당하다. 발표 시간 배분은 다음을 권장한다.

```text
문제 정의 및 시나리오: 2분
시스템 구조와 기술 난점: 3분
데모: 3분
결과와 한계/확장: 2분
```

