# 2026-11-01 — 모바일 웹 흐름·디자인 개선

## 수정 범위

기존 `tubecast` 폴더를 직접 수정했습니다. 핵심 진입점은 `index.html`, `line.html`, `map.html`, `lines.html`입니다. 예전 `station.html`, `route.html` 주소도 지도 허브로 연결됩니다. 별도 프레임워크나 빌드 의존성은 추가하지 않았습니다.

## 디자인 보존 — 사용자 피드백 반영

- `index.html`의 원본 메인 배치와 원형 데이터 다이어그램을 복원했습니다. `assets/ring.svg`, 원본 overview의 배경·본문 마크업을 그대로 유지합니다.
- All lines 및 지도에서 기존 현재 역의 글로우, 예측 링의 맥박, 노선 방향 애니메이션을 복원했습니다.
- All lines는 기존 가로 역 트랙을 유지하며 한 방향 행은 약 96px, 두 방향 행은 약 150px, 정상 행은 46px로 압축했습니다(390px 설계 좌표 기준).
- 메인 다이어그램은 원본 예시 스냅샷입니다. 원본 디자인을 보존하기 위해 해당 숫자와 SVG 데이터는 재작성하지 않았습니다. 노선 상세·목록·지도는 공통 예시 데이터를 사용합니다.

## 이번 변경

1. 큰 지연 숫자는 스크롤 초반에 사라지고 작은 제목·숫자·상태로 교체됩니다. 콘텐츠는 고정 요약 하단에서 잘리므로 상단을 뚫고 올라오지 않습니다.
2. 역의 현재 상태, 역의 예측, 노선 전체 상태를 구분했습니다. 채움=현재, 점선 링=예측, 색=심각도, 화살표=예측 전파 방향으로 통일했습니다.
3. 지도 우측 하단 목록 → 전체 노선 → 노선 상세 → 지도 순환을 연결했습니다. 중복 목록 오버레이를 제거했습니다.
4. 지도 링의 별도 화면 좌표, 이중 중심 보정, 가까운 라벨을 잘못 역으로 선택하는 방식을 제거했습니다. 명시적 역 좌표·노선 소속을 사용합니다.
5. 경로 미리보기에서 배경 노선을 투명화하고 선택 구간만 강조합니다. 경로 확정, 선택 완료, 경로 변경, 출발/도착 수정, 브라우저 뒤로가기 복원까지 연결했습니다.
6. 하단 시트 버튼을 고정하고 내부 콘텐츠는 스크롤되도록 했습니다. 가짜 브라우저 UI를 제거하고 실제 viewport/safe area/키보드 크기 변화에 대응합니다.
7. 노선 상세·목록·지도의 표시 수치·역 목록을 공통 예시 데이터로 묶었습니다. 정상/지연 상태가 화면마다 다르던 문제와 역 수에 방향 수가 섞이던 문제를 줄였습니다.
8. 데이터 설명 페이지를 추가하고, 실제 연동이 없는 데이터의 `Live`/`from TfL` 표현을 핵심 화면에서 예시 데이터로 정정했습니다.

## 성능 작업

- 현재·앞·뒤 최대 3개 페이지만 유지. 떠난 페이지의 리스너와 로딩 타이머 해제.
- 비활성 페이지 및 숨긴 문서의 반복 애니메이션 중단.
- 지도 팬 이동에서는 위치만 변경. 확대율 전용 속성은 확대율이 바뀔 때만 갱신.
- 전체 SVG에 적용하던 채도/밝기 필터 대신 투명도 사용.
- 기존 링·방향 글로우 애니메이션은 유지하며 화면 밖 목록 행만 일시 정지.
- 경로 선을 순차적으로 그리며 강제 레이아웃을 읽던 작업 제거.
- 역 목록 탐색을 노드별 인덱스로 바꿔 경로 해석 시 모든 역을 반복 탐색하지 않도록 수정.
- 시트 콘텐츠 교체, 데모 새로고침, 딥링크의 인위적 대기 제거. 카메라·시트 스프링 응답 축소.

현재 로컬 검사 결과: 56/56 통과, JS 문법 검사 통과. 4,373개 노드의 그래프 생성은 약 16–19ms, 대표 경로 6개 조회는 각각 1ms 이내였습니다. 이전 버전 대비 FPS나 휴대폰 성능 향상률을 측정한 수치는 아닙니다.

## 실행

이 폴더에서 다음 명령을 실행한 뒤 `http://localhost:8765/index.html`을 여세요.

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

브라우저 회귀 검사는 `http://localhost:8765/tests/browser.html`입니다. 전체 흐름은 `USERFLOW.md`에 있습니다.

## 남은 배포 전 작업

실제 TfL 데이터와 공식 역 ID·연결 그래프 연동, 예측값 검증, 실제 기기의 Safari/Chrome 키보드·주소창·핀치 검증이 필요합니다. 현재 노선도는 일부 구간을 단순화한 도식이며 경로 시간은 예시 계산입니다. `js/route-page.js`, `js/station-page.js`, 관련 옛 CSS는 참조용으로 남아 있지만 핵심 페이지에서 로드하지 않습니다.

참고: 첨부 Apple Design SKILL.md, 화면 녹화의 조기 헤더 전환, [Weather-App-React](https://github.com/ParasJagdale/Weather-App-React)의 상태 배경·카드 재질·즉각적인 피드백 구성. 기존 문서의 목록 오버레이 및 경로 배경을 항상 선명하게 유지하라는 설명은 이번 사용자 요청에 맞춰 변경했습니다.

## 링 통일 및 60분 회복 표현

- All lines의 별도 bead 마커를 Central 상세 예측 카드와 같은 현재 점·방사형 글로우·예측 점선 링 구성으로 통일했습니다. 점 크기 12px, 글로우 28px, 예측 맥박 1.4초를 동일하게 적용했습니다. 방향 글로우는 유지하고 밝기만 낮췄습니다.
- Central의 60분 Good 예시는 지연 0개로 표시합니다. 해당 역 5개의 막대는 마지막 약 10분 구간에서 기존 Good 색상으로 은은하게 전환됩니다. 예측 시작 시각이 달라도 녹색 전환의 시간 위치는 같습니다.
- 기존 메인 다이어그램과 압축된 All lines 행 높이는 유지했습니다. 두 화면의 계산된 CSS 값 및 다섯 역의 그라디언트를 브라우저에서 확인했고, 수정 JS 문법 검사를 통과했습니다.

## 메인 Lines to watch 카드 통일

- 원형 다이어그램 아래 목록에도 Lines 페이지와 동일한 카드 렌더러·스타일을 적용했습니다. 역명은 위, 방향은 아래이며 현재 점·예측 링·글로우·96/150px 행 높이를 공유합니다. 기존 네 노선 구성은 유지합니다.
- 해당 카드의 숫자와 역 상태도 공통 예시 데이터를 사용합니다. 원형 SVG와 메인 상단 배치는 변경하지 않았습니다.
- 브라우저에서 카드 높이, 링·방향 애니메이션, Central 상세로의 페이지 내 이동을 확인했습니다.

## 모바일 반응 속도·홈 화면 웹앱

하단 패널을 168px/인접 점 7개로 압축하고 화면 아래로 내렸습니다. 페이지 전환의 대기와 긴 스프링을 줄이고, 정적 지도 이미지 캐시·미리 계산한 경로 좌표·지도 파일 미리 읽기를 적용했습니다. 링·방향 글로우와 원형 다이어그램은 유지합니다. manifest와 iPhone/Android 아이콘을 추가해 같은 링크를 홈 화면 웹앱으로 열 수 있습니다. 성능 수치, 검증 범위와 전달 방법은 `DELIVERY.md`를 참고하세요.

## Unified overview, map clarity and journey flow
- Overview retains the radial diagram and includes all 12 compact line cards, station search and a shared amber-to-red severity key. `lines.html` redirects to the integrated list.
- Map stations use one consistent centre, aggregating delay markers by station/time window. Forecast direction uses travelling light without arrowheads; pan momentum is shorter and critically damped.
- Interchange line buttons update the station panel in place, including line-wide context and example arrivals.
- Bottom pager supports scrubbing; content swipes accept shorter movement while leaving browser edge gestures alone.
- Route picker opens compact, keeps its state when lowered, and hides the line summary/key. Search is an explicit expansion. Selected journeys list schematic stops and named interchanges.
- First-visit onboarding uses the supplied SVG, with sequential ring illumination, glow and reduced-motion support.
- Added `tests/ux.html` for 19 interaction regressions; physical iPhone Safari gesture feel remains a device check.
