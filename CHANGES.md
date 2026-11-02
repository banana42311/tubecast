# 2026-11-02 — Hermes 상태 계약·지연 반영 경로 추천

## 임시 최종 배포 안정화

- 원인: 경로 점수가 역 이름만 비교하고 방향이 없을 때 반대 방향 행까지 읽었습니다. 수정: NaPTAN·정규화 별칭을 우선 사용하고 정확한 방향 또는 `Both directions`만 계산하며, 열차가 예측 시작 전에 통과하면 해당 예측을 제외합니다.
- 원인: 촬영 데모는 Stratford → White City 한 방향만 저장돼 역방향 전환 시 네트워크를 호출했습니다. 수정: 같은 TfL fixture에서 정차역·방향·시각을 결정적으로 뒤집어 양방향 모두 오프라인으로 동작하게 했습니다.
- 원인: 경로 순위가 갱신되면 숫자 `opt`가 다른 여정을 가리킬 수 있고, 지연 추가 시간은 분 수에만 반영돼 도착 시각과 어긋났습니다. 수정: 정차 패턴 기반 `routeId`를 URL에 보존하고 상태 갱신 때 원본 후보를 재평가하며, 조정 도착 시각과 TfL 예정 시각을 함께 표시합니다.
- 원인: Google Maps URL은 특정 노선을 강제할 수 없는데도 기존 안내 문구가 선택 노선을 유지한다고 표현했습니다. 수정: 환승 다리별 링크는 유지하되 Google이 서비스를 다시 계산한다는 범위를 명확히 표시합니다.
- 원인: 전역 역 검색은 구두점 비교와 현재 페이지 노선 fallback을 사용해 `St. Paul's` 검색과 Abbey Wood 노선 표시가 틀렸습니다. 수정: 구두점·발음기호·`&`를 공통 정규화하고 실제 StationCatalog/TfL 노선 소속만 표시·전달합니다.
- 원인: iPhone 키보드가 열린 전역 검색에는 visual viewport 전용 배치가 없어 결과와 하단 컨트롤이 겹쳤습니다. 수정: 검색창·결과 높이를 현재 viewport에 고정하고 검색 중 겹치는 하단·지도 컨트롤을 숨기며, From/To 입력의 키보드 Enter 선택도 지원합니다.
- 원인: 촬영용 1·2·3 단계와 `record`/`demoZoom` 분기가 최종 데모와 함께 남아 있었습니다. 수정: `?demo=commute`의 최종 상태 하나만 유지하고 사용하지 않는 줌 캡처와 분기를 제거했으며 JSON/브라우저 bundle 일치 검사를 추가했습니다.
- 원인: 콘솔의 잘못된 From/To 입력은 아무 반응이 없고 `Edit journey`가 복제 패널만 닫았습니다. 수정: 필드별 오류를 표시하고 실제 모바일 지도 상태에도 편집 동작을 전달합니다.
- 변경된 모바일·콘솔 자산은 `20261102-final2`로 캐시를 갱신했습니다. motion/release/state/demo/search/journey/route-risk/schematic 및 브라우저 흐름 검사를 배포 전 실행합니다.

- `data/state.sample.json`을 Hermes `/api/state` 계약의 개발 fixture로 추가했습니다. `config.js`의 `apiBase`만 지정하면 같은 화면 매핑이 실제 API를 읽습니다.
- 모든 화면이 `naptan` 우선의 공통 역×노선×방향 상태를 사용합니다. 현재 지연과 30분 예측은 동시에 유지하며, `low`/결측 행은 지연으로 만들지 않습니다. 노선의 0·10·20·30·60분 칸도 응답 값을 그대로 사용합니다.
- 응답은 60초마다 확인하고 마지막 정상값을 저장합니다. 503, 3분을 넘긴 `as_of`, `sources.stale`에서는 캐시를 유지하며 `업데이트 지연 · hh:mm 기준`을 표시합니다. 이름 매칭 실패는 한 번의 묶음 경고로 출력합니다.
- 역 시트에 방향별 `Usual 3 min → now 12 min`과 30분 예측 확률·신호를 표시합니다. 환승 노선 버튼을 바꿔도 같은 공통 상태를 조회합니다.
- 경로 후보는 TfL Journey Planner 결과만 사용합니다. 후보별 현재/예측 지연 역, 최악 단계, 추정 추가 시간을 계산해 조정 도착 시간이 빠른 순으로 정렬하고 `Recommended now`/`Usual route`를 구분합니다.
- `route.html`과 `station.html`은 계속 지도 시트로 리다이렉트합니다. 역·노선 지연 화면의 대체 경로 진입과 선택 경로의 Google Maps 전달을 유지했습니다.
- `tests/state.cjs`와 `tests/route-risk.cjs`에 공통 수치, 오래된 응답/503 캐시, 위험 점수 정렬, 미매칭 경고 검사를 추가했습니다. 기존 motion/release/journey/schematic 및 브라우저 회귀 검사도 통과했습니다.

## 경로 결과와 Google Maps 전달 보완

- 같은 정차역·노선을 쓰는 후속 TfL 결과는 `Alternative`가 아니라 `Later departure`로 표시합니다. 다른 노선 조합일 때만 `Alternative route`를 사용합니다.
- Google Maps 버튼은 경로 후보를 읽는 동안 제거하고 `Choose this route` 이후의 확정 화면에만 표시합니다.
- 직통 경로의 일반 정차역을 Google 경유지로 넘기던 오류를 제거했습니다. 직통은 출발·도착만 전달하고, 환승 경로는 실제 환승역만 최대 3개까지 전달합니다.
- Google Maps가 URL을 바탕으로 자체 대중교통 경로를 다시 계산한다는 점을 버튼 설명에 표시했습니다. Tubecast의 지연 반영 점수와 선택 결과는 Tubecast 화면에 유지됩니다.
- 현재 지연 역 2개와 예측 고위험 역 2개가 후보 점수에 반영되는 fixture 검증, 후속 출발편 라벨, 직통/환승 Google URL, 선택 전후 버튼 노출을 회귀 검사에 추가했습니다.

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

## Map clarity and three-second splash
- Onboarding now contains only the supplied Tubecast artwork, recoloured to the shared amber (#FFA12B), and enters Overview after three seconds.
- Restored inline SVG in the zoomable map to avoid bitmap scaling; removed legacy station ticks and projected display markers onto line segments.
- Replaced moving dashes with a short, fading directional light. Removed the Central summary and placed time filters and severity scale on one row.
- Moved the line-page backdrop outside the card scroll viewport, removed the opaque header cover, and prevented focus scrolling from shifting the fixed header.
- 26 interaction checks, motion tests and static release checks pass. Device-specific Safari rendering and gesture feel still need physical-device review.
# 2026-11-02 — Deterministic commute recording scenario

- **Cause:** the local fixture arrived after page modules had already built their view models, so a first visit could flash old data and reload. `?demo=commute` now selects an inline copy of `data/demo/commute.json` before `FlowData` is created; steps 1/2/3 persist in the tab and 0 resets to step 1.
- **Cause:** a line-level `Minor Delays` notice was overwritten as `Good service` when no station row was active. Line notices and station-level counts now remain separate, including the 08:40 zero-station stage.
- **Cause:** route risk added every station in one propagating delay as an independent delay. It now groups correlated station×line×direction evidence, producing a 13-minute estimate for the affected Central route instead of 35 minutes.
- The fixed, offline Journey Planner fixture offers Central direct and a walk-free Elizabeth→Central change at Bond Street. The recommendation skips the Mile End–Bank forecast and Google Maps receives Bond Street as the interchange.
- Liverpool Street’s station sheet opens this fixed comparison through **See a way around**. Search mode uses the visual viewport, opens the sheet fully and focuses without scrolling the page.
- Route loading has a skeleton; selection fits and draws the route, runs a single journey dot and pulses Bond Street. Direction-specific delay markers sit on the corresponding side of the line and forecast rings fade in in order.
- `tests/demo.cjs` verifies all three stage counts, the walk-free line sequence, the recommendation order and the expected 8–15 minute Central impact.

## Route map motion and label stability

- **Cause:** route mode kept every intermediate station label and left the background labels faintly visible, so names competed with the highlighted route. It now hides background names and retains only the endpoint pills, the interchange and a matching affected station when one lies on the chosen leg.
- **Cause:** retained route labels all used one fixed upper-right offset, which could put text directly on a diagonal line. The label pass now samples the drawn route and tries four pixel-aligned positions outside both route and occupied-label bounds.
- **Cause:** forecast severity was derived from the probability tier even when it was the same minor incident moving along one direction, so propagated rings could turn red. Propagated stations now retain the current incident severity while the ring still communicates that they are forecast.
- Labels remain in a screen-space HTML layer while the vector network zooms underneath. The world and label canvas commit in the same animation frame, camera translations snap to device pixels and route mode avoids per-pointer layout reads.
- 390×844 route screenshots at 1×, 2× and 4× are stored in `exports/`. Browser checks report native-size label text at zoom 1/3/6, stable visibility during camera movement and complete access to all 299 stations and the outer map boundary.

## iPhone route search and route framing

- **Cause:** iOS moves the visual viewport when its keyboard opens, while the fixed 390px canvas stayed attached to the layout viewport. The phone canvas now follows `visualViewport.offsetTop`, detects keyboard height changes and gives station search an opaque, nearly full-height focused sheet.
- **Cause:** an empty destination query rendered the first 24 alphabetical stations, making the useful field and results harder to reach on a phone. Search now starts with eight useful suggestions and keeps its title, input and map-return action above the scrolling results.
- **Cause:** route mode retained the global station search and used overview-sized camera padding with a low zoom cap. Route planning now hides overview controls and fits the selected geometry into the actual space above the sheet with tighter padding and a higher short-route zoom cap.

## Phone recording snapshot

- **Cause:** the staged demo opened on a near-empty state and required a control that was not appropriate for a phone recording. The recording URL now opens one complete snapshot immediately and shows no Example badge or stage control.
- The snapshot contains seven current delayed stations across Central, Northern, Jubilee and District: five minor and two severe. Seven additional stations carry 30-minute predictions across those lines and Victoria.
- Central now shows two current westbound delays at Mile End and Bethnal Green, followed by prediction rings at Liverpool Street and Bank. The Stratford → White City recommendation still compares the affected Central route with the walk-free Elizabeth → Central change at Bond Street.
- **Cause:** after choosing `From`, the replacement `To` input used a normal focus call while Safari was also moving its visual viewport. Both route fields now use scroll-preventing focus, and the focused search sheet reflows immediately to the keyboard viewport instead of replaying its bottom-sheet spring.
- **Cause:** after both endpoints were selected, the route action sat below search suggestions inside a compact sheet, so the delay-aware comparison never started and the map showed only two tiny endpoints. The picker now puts a visible comparison action directly below the fields, calls out the Central delay in the recording scenario, and frames a dimmed Central/Elizabeth corridor before loading the recommended route.
- **Cause:** the ready-to-search map highlighted both complete lines, which left the actual Stratford → Bond Street → White City corridor looking like a small part of the network. The ready state now draws only the proposed Elizabeth/Central corridor at full width, keeps its interchange visible, and suppresses unrelated labels and delay markers.
- **Cause:** the phone recording still needed an extra “Search stations instead” tap, and a pager-updated `data-href` could lose the demo query before opening the map. Recording mode now opens the From search and keyboard directly from `Plan a route`, preserves `demo=commute&record=1` across dynamically changed links, and keeps the offline Stratford → White City detour available throughout one continuous take.
- **Cause:** the pager click handler could run before its asynchronous link observer had restored `record=1`, so an immediate tap on Map sometimes entered the normal picker. The click handler now applies the demo URL contract synchronously before every chrome navigation.
- **Cause:** Google Maps does not support waypoints for transit directions, so its single handoff link discarded Bond Street and recalculated the Central direct route. Multi-line recommendations now hand off one Google Maps link per selected leg, preserving Stratford → Bond Street and Bond Street → White City as two explicit steps.
- **Cause:** direction status markers were deliberately shifted 5.5px perpendicular to the track and interchange markers inherited the station's first-line coordinate. Status dots, selection rings, route endpoints and touch targets now use the exact sampled anchor of the line they represent; direction remains visible through the line-flow animation.

## Desktop console uses the mobile product components

- **Cause:** the first console implementation independently redrew the network, forecasts, ring summary and route cards, so its design and numbers could drift from the mobile product. The console is now a layout shell around the real `map.html` runtime, the overview ring markup and the map route sheet.
- The map iframe runs `map-page.js` and `flow-map.js` with the shared commute state. Its console-only host mode changes container sizing and hides phone chrome while preserving the mobile page selectors and behavior.
- The desktop time control calls the map forecast state at Now, +10, +20 and +30 minutes. Current points remain visible while the app's three-part prediction rings and flowing direction light follow each station's onset time.
- Delays, forecast rows and TfL status use the app's `station-status-row`, `delay-dot` and `fl-row` components. The right panel mounts the same ring SVG and legend as Overview.
- Route checking opens the app's ranked route sheet in the right panel, relays option and confirmation actions to the real map state, and retains the two-leg Google Maps handoff for the recommended Stratford → Bond Street → White City journey.
