# Subway Route Server App API

앱에서 지하철역 내부 경로를 요청하고, 경로 구간별 재생할 영상을 받기 위한 API 문서입니다.

현재 테스트 서버:

```text
https://api.busantax.com
```

Swagger 문서:

```text
https://api.busantax.com/docs
```

## 핵심 흐름

앱은 보통 아래 순서로 호출합니다.

```text
1. GET /stations
2. GET /stations/{station_id}/route-options
3. POST /route
4. response.segments[].video_url 순서대로 영상 재생
```

현재 서버에서 `station_id`는 역을 찾는 내부 키입니다. 지금은 역명 기반 업로드를 사용하므로 예시는 `서울역`을 사용합니다.

```text
station_id = 서울역
station_name = 서울역
```

## 1. 서버 상태 확인

```bash
curl https://api.busantax.com/health
```

응답:

```json
{"ok": true}
```

## 2. 역 목록 조회

```bash
curl https://api.busantax.com/stations
```

응답 예시:

```json
[
  {
    "station_id": "서울역",
    "station_name": "서울역",
    "active_version": "v001",
    "line_ids": []
  }
]
```

앱에서는 사용자가 역명을 고르면 해당 항목의 `station_id`를 저장해두고 `/route` 요청에 사용하면 됩니다.

## 3. 경로 선택 옵션 조회

역별로 선택 가능한 승강장, 출구, 시설 목록을 조회합니다.

```bash
curl https://api.busantax.com/stations/%EC%84%9C%EC%9A%B8%EC%97%AD/route-options
```

응답 주요 필드:

```json
{
  "station_id": "서울역",
  "metadata": {
    "station_id": "서울역",
    "station_name": "서울역",
    "version": "v001"
  },
  "platforms": [
    {
      "line_id": "1호선",
      "direction": "남영",
      "platform_id": "platform_003",
      "cars": [1,2,3,4,5,6,7,8,9,10]
    }
  ],
  "exits": [
    {
      "exit_number": "3",
      "type": "exit",
      "node_id": "exit_stair_015_from"
    },
    {
      "exit_number": "3",
      "type": "exit_elevator",
      "node_id": "elevator_point_020_node"
    }
  ],
  "facilities": [
    {
      "type": "toilet",
      "facility_subtype": "female",
      "label": "toilet_005"
    }
  ]
}
```

### platforms

출발지로 사용할 수 있는 승강장 대표 노드 목록입니다.

앱 UI 예:

```text
1호선 / 남영 방면 / 1호차
```

요청에는 아래처럼 들어갑니다.

```json
{
  "type": "platform",
  "line_id": "1호선",
  "direction": "남영",
  "car": 1
}
```

### exits

목적지로 사용할 수 있는 출구 목록입니다.

같은 `exit_number`에 계단 출구와 엘리베이터 출구가 같이 있을 수 있습니다.

```text
type=exit           일반 출구/출구 계단/출구 에스컬레이터
type=exit_elevator  출구 엘리베이터
```

앱에서 그냥 “3번 출구”를 요청하면:

```json
{
  "type": "exit",
  "exit_number": "3"
}
```

기본값은 엘리베이터가 아닌 출구를 우선합니다. 엘리베이터 우선 경로일 때만 `exit_elevator`를 우선합니다.

### facilities

화장실, 엘리베이터, 개찰구 같은 시설 노드입니다.

일반 앱 경로 요청에서는 보통 직접 시설을 목적지로 쓰기보다 `include_toilet` 같은 옵션을 사용합니다.

## 4. 기본 경로 요청

승강장 1호선 남영 방면 1호차에서 3번 출구까지:

```bash
curl -X POST https://api.busantax.com/route \
  -H 'Content-Type: application/json' \
  -d '{
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
    }
  }'
```

응답 예시:

```json
{
  "station_id": "서울역",
  "version": "v001",
  "segments": [
    {
      "index": 1,
      "from_type": "platform",
      "to_type": "stair",
      "video_url": "videos/서울역/서울역_N0119_N0209.mp4"
    },
    {
      "index": 2,
      "from_type": "stair",
      "to_type": "stair",
      "video_url": "videos/서울역/서울역_N0209_N0208.mp4"
    },
    {
      "index": 3,
      "from_type": "stair",
      "to_type": "gate",
      "video_url": "videos/서울역/서울역_N0208_N0237.mp4"
    },
    {
      "index": 4,
      "from_type": "gate",
      "to_type": "exit",
      "video_url": "videos/서울역/서울역_N0237_N0024.mp4"
    }
  ],
  "overlay": {
    "image_url": "https://api.busantax.com/stations/%EC%84%9C%EC%9A%B8%EC%97%AD/image?version=v001",
    "coordinate_space": "source_image",
    "points": [
      [1833.877692, 701.107692],
      [1964.79, 649.2],
      [2068.88, 428.815],
      [2131.215, 414.015],
      [2697.995, 178.89]
    ],
    "missing_node_ids": []
  },
  "debug": {
    "start_node": "platform_003_car_1_door_2",
    "goal_node": "exit_stair_015_from",
    "edge_ids": ["N0119_N0209", "N0209_N0208", "N0208_N0237", "N0237_N0024"],
    "missing_video_edges": []
  }
}
```

앱에서 기본적으로 필요한 것은 `segments`입니다.

```text
segments[].from_type
segments[].to_type
segments[].video_url
```

지도 이미지 위에 경로선을 그릴 때는 `overlay`를 사용합니다.

```text
overlay.image_url          안내도 이미지 URL
overlay.coordinate_space   points 좌표계. 현재 source_image
overlay.points             원본 이미지 픽셀 좌표 경로
overlay.missing_node_ids   source 좌표가 없어 overlay에서 빠진 노드
```

`debug`는 개발/검증용입니다.

## 5. 경로 옵션

### route_preference

이동 수단 우선순위입니다.

```text
none       기본. 계단과 에스컬레이터를 같은 이동 수단 비용으로 처리
elevator   엘리베이터와 에스컬레이터 우선
```

엘리베이터 우선 요청:

```bash
curl -X POST https://api.busantax.com/route \
  -H 'Content-Type: application/json' \
  -d '{
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
    "route_preference": "elevator"
  }'
```

동작:

```text
route_preference=elevator  같은 출구 번호에서 exit_elevator 우선, 이동 중 엘리베이터/에스컬레이터 비용 우대
route_preference=none      같은 출구 번호에서 계단/일반 출구 우선, 계단/에스컬레이터 동일 비용
```

### include_toilet

경로 중간에 화장실을 들르는 최단 경로를 찾습니다.

```bash
curl -X POST https://api.busantax.com/route \
  -H 'Content-Type: application/json' \
  -d '{
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
    "include_toilet": true,
    "toilet_gender": "female"
  }'
```

`toilet_gender` 값:

```text
any
male
female
accessible
```

`both` 화장실은 `male`, `female` 조건에 모두 포함됩니다.

## 6. Endpoint 타입

### platform endpoint

```json
{
  "type": "platform",
  "line_id": "1호선",
  "direction": "남영",
  "car": 1
}
```

`platform_id`를 알고 있으면 더 구체적으로 지정할 수 있습니다.

```json
{
  "type": "platform",
  "platform_id": "platform_003",
  "car": 1
}
```

### exit endpoint

```json
{
  "type": "exit",
  "exit_number": "3"
}
```

### facility endpoint

시설을 직접 목적지로 쓸 때 사용합니다.

```json
{
  "type": "facility",
  "facility_type": "toilet",
  "facility_subtype": "female"
}
```

단, `facility_type`만으로 여러 노드가 매칭되면 서버가 에러를 반환할 수 있습니다. 보통 앱에서는 `include_toilet` 옵션을 사용하는 편이 안전합니다.

### node endpoint

디버그용입니다. 앱 일반 기능에서는 권장하지 않습니다.

```json
{
  "type": "node",
  "node": "N0120"
}
```

또는:

```json
{
  "type": "node",
  "node_id": "platform_003_car_1_door_3"
}
```

## 7. Segment 타입

`segments[].from_type`, `segments[].to_type`에 들어올 수 있는 주요 값:

```text
platform
stair
escalator
elevator
gate
exit
toilet
```

현재 `exit`은 아래를 포함하는 앱용 통합 타입입니다.

```text
출구 계단
출구 에스컬레이터
출구 엘리베이터
일반 출구 점
```

영상 재생 UI에서 출구 이동수단까지 구분해야 하면 추후 `exit_subtype` 또는 `transport_mode`를 segment에 추가할 수 있습니다.

## 8. video_url 규칙

응답의 `video_url`은 해당 segment에서 재생해야 할 영상 경로입니다.

현재 로컬/테스트 응답 예:

```text
videos/서울역/서울역_N0119_N0209.mp4
```

`ROUTE_SERVER_VIDEO_BASE_URL` 환경변수가 설정되면 완전한 R2 URL 형태로 내려갈 수 있습니다.

예:

```text
https://pub-xxxx.r2.dev/videos/서울역/서울역_N0119_N0209.mp4
```

앱 구현 권장:

```text
if video_url is null:
  해당 구간 영상 없음 상태 처리
else:
  base URL 여부를 확인하고 재생
```

## 9. missing_video_edges

`debug.missing_video_edges`는 경로에 필요한 edge가 서버의 `route_video_edges` 계획에 없을 때 나옵니다.

```json
{
  "missing_video_edges": ["N0120_N0209"]
}
```

의미:

```text
이 edge는 현재 route_video_edges 계획에 없음
```

주의:

```text
실제 R2/mp4 파일 존재 여부를 검사하는 값은 아닙니다.
```

실제 영상 파일 업로드 여부는 추후 R2 manifest 또는 HEAD 체크로 별도 관리할 수 있습니다.

## 10. 에러 응답

요청 조건이 현재 역 데이터와 맞지 않으면 400이 반환됩니다.

예:

```json
{
  "detail": "'platform 조건에 맞는 대표 노드가 없습니다.'"
}
```

주요 원인:

```text
line_id가 route-options 값과 다름
direction이 route-options 값과 다름
car가 존재하지 않음
exit_number가 존재하지 않음
station_id가 등록되지 않음
```

해결:

```text
항상 GET /stations/{station_id}/route-options 결과에서 선택지를 만든 뒤 /route에 넣는다.
```

## 11. 앱 통합 체크리스트

앱에서 최소 구현할 것:

```text
1. /stations로 역 목록 가져오기
2. 선택된 station_id로 /route-options 가져오기
3. line_id / direction / car 선택 UI 만들기
4. exit_number 선택 UI 만들기
5. /route 호출
6. segments 순서대로 video_url 재생
7. video_url null이면 안내 또는 fallback 처리
```

선택 구현:

```text
1. route_preference=elevator
2. include_toilet=true
3. toilet_gender=male/female/accessible
4. debug.missing_video_edges 개발자 로그 표시
```
