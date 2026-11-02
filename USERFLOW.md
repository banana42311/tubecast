# Tubecast — unified mobile-web flow

Updated 2026-11-02. This document describes the implemented mobile web flow. The public build uses the Hermes contract fixture until `config.js.apiBase` is set.

## Entry points

- `index.html`: network overview, slide 0 of the same pager used by line details.
- `line.html?line=district`: line detail within that pager. Left/right swipe or accessible page controls move between the overview and 12 lines.
- `map.html`: shared station, disruption and journey hub.
- `lines.html`: the only all-lines directory. Map's bottom-right stack button opens this page. A row opens `line.html?line=…`; the map button returns to the corresponding map.
- `station.html` and `route.html`: compatibility entry points that redirect into the map hub, retaining supplied station/from/to arguments. They no longer run separate, inconsistent UI implementations.
- `about.html`: data explanation. `components.html` is a legacy design reference outside the product flow.

## Preserved design

The original overview layout, radial risk diagram (`assets/ring.svg`), background and watch cards are restored without changing their markup. All lines keeps the original horizontal tracks, station beads, pulse rings and directional glow. Only directory row spacing and height are reduced; offscreen rows pause their animations. The map retains pulse rings and animated disruption paths, using the corrected station anchors.

## Overview / line scrolling

The large heading is a separate presentation layer. It fades over the first 64 layout pixels of scrolling. The compact heading crossfades from 28 to 76 pixels and stays at a fixed position. The content viewport begins exactly beneath the compact summary, so cards cannot pass through its number/status line. Scrolling back restores the large heading.

Only the current slide and its immediate neighbours remain mounted (maximum three). Leaving a slide preserves its scroll position; inactive slides are inert and their animations are paused. Long jumps use a brief crossfade. The overview ring segments and named line buttons both open the matching slide.

## Shared delay language

| Element | Meaning |
| --- | --- |
| Line colour | Identity of the service |
| Filled point | Delay at this station now |
| Dashed ring with a quiet pulse | New delay predicted within 30 minutes |
| Amber / red | Minor / severe |
| Dashed path and arrowhead | Direction in which a delay may spread |
| White station outline | Selected station, not a delay |

`js/state-model.js` maps Hermes rows by `naptan`, line and direction; `js/flow-data.js` presents that one state to line details, the directory and map. Empty `apiBase` loads `data/state.sample.json` and shows `예시 데이터`. Counts on a line are unique station names, not directions. The 30-minute total includes current and newly predicted stations.

`js/station-catalog.js` maps names to explicit schematic anchors and represented line memberships. The map no longer places rings using viewport-specific Central coordinates or a generic nearest label. A disruption marker is anchored to the correct affected line sample. The original ring/glow primitives remain in each view; explicit anchors correct the map placement.

## Map → station → journey

1. Search or tap a station. Its represented lines remain bright; the surrounding network recedes.
2. The station sheet separates **current delay**, **predicted delay**, and **line-wide status**. Current rows show usual versus observed gaps; predictions show probability, risk and signal without claiming causality.
3. `Find an alternative` / `To here` remains visible at the sheet bottom. Station content scrolls independently.
4. Select the missing endpoint using search, quick suggestions or the map. Swap endpoints or edit either field.
5. Preview TfL Journey Planner options. Tubecast scores each option with current minor/severe delays, high-risk predictions and closures, then compares the adjusted arrival. `Recommended now` can differ from the provider's `Usual route`.
6. Tap an option, then `Choose this route`. A selected-journey summary and ordered line legs appear. `Change route` restores options; `Done` returns to the map.
7. The selected option and confirmation state are encoded in the URL. Browser Back restores the previous sheet/selection; reload restores the chosen route.

A route with no result has a disabled confirmation button and an edit action. Unknown route deep links open the picker. The selected TfL option can be handed to Google Maps with ordered interchange/station waypoints.

## Mobile web behaviour

No fake iOS status bar or Safari address bar is shown. The shell follows the visible viewport height, safe-area insets, rotation and browser/keyboard resize events. The previous 600px minimum viewport height is removed. Search fields keep an effective 16px font size on narrow phones to avoid focus zoom. Sheet drag gestures are limited to their handle/header; content retains native vertical scrolling. Reduced motion stops forecast pulses.

## Validation and limits

- `tests/browser.html`: 56 checks covering delay anchors, directional path availability, shared counts, six representative routes, closed-line exclusion, invalid/same endpoints, and Bow Road/Bethnal Green membership.
- All runtime JavaScript parses via `node --check`.
- Browser interaction checks: map → lines → District; station → endpoint search → route; alternative route → choose → browser Back; confirmed route reload; scroll-collapse boundary; pager's maximum three mounted pages.
- Inspected 320×568, 390×740 and 430×780 viewports. On 320px, the collapsed header bottom and scroll viewport top both measured 60.72 screen pixels; large heading opacity was 0 and compact heading opacity was 1.
- A local desktop browser measured roughly 16–19ms to construct the 4,373-node graph and at most 1ms for the six representative route queries. These are observations, not mobile performance or FPS guarantees.
- Actual Safari/Chrome mobile devices, touch pinch, browser toolbar transitions, onscreen keyboards and accessibility screen readers still need physical-device testing.
- The supplied map is a schematic subset. Station identities/memberships here describe that drawing and must be replaced with verified TfL IDs, topology and interchange details before real journey planning. Some real-world branches are absent. Timings, arrivals, disruptions and probabilities remain examples.
