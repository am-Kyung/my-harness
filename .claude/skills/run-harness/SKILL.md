---
name: run-harness
description: 허들링 앱 화면 설계 파이프라인을 실행한다 (레퍼런스 분석 → 화면 설계 → 디자인 제작, 게이트 3개). "OO 화면 설계 시작해줘" 같은 자연어 요청과 uibowl 레퍼런스 링크가 함께 오거나, 사용자가 명시적으로 /run-harness를 요청할 때 사용한다.
---

허들링 앱의 화면 설계 하네스를 실행한다. 판정 기준은 항상 `harness/rules.yaml` + `harness/scripts/*.js`(SSOT)를 따르며, 이 문서나 `harness/guides/figma-design-guide.md`를 임의로 재해석하지 않는다.

## 입력 파싱

- `target_screen`: 화면 이름 (필수)
- `reference_urls`: uibowl 레퍼런스 URL 2~5개 (필수)
- `--fresh`: 있으면 기존 실행 이력을 무시하고 처음부터 시작

트리거 형태 예시는 `harness/defaults.yaml`의 `trigger` 섹션 참고. `target_screen`이나 `reference_urls` 중 하나라도 특정할 수 없으면 실행하지 않고 부족한 값을 되물어본다.

## 0단계 — 재개 여부 확인

`runs/<target_screen>/03-state.json`이 존재하는지 확인한다 (`harness/rules.yaml`의 `resume` 규칙).

- 존재하고 `--fresh` 없음 → `current_stage`부터 이어서 실행
- 존재하지 않거나 `--fresh` 있음 → `runs/<target_screen>/`를 새로 만들고 Stage 1부터 시작

메인 오케스트레이터(이 스킬을 실행하는 나 자신)는 `runs/<target_screen>/`와 `03-state.json` 갱신만 직접 한다. 나머지 산출물은 아래 서브에이전트에 위임한다.

## Stage 1 — 레퍼런스 분석

`researcher` 서브에이전트를 Task 도구로 호출한다 (`target_screen`, `reference_urls` 전달). 결과로 `extracted_insights_count`, `failed_url_count`를 받는다.

**G1 판정**: `judge` 서브에이전트를 호출해 G1을 판정시킨다.

- `PASS` → Stage 2로 진행
- `FAIL` → `retry_count`를 올리고 (`harness/rules.yaml`의 `retry.automatic_gates_max_retries`, 기본 2회) 이하면 Stage 1 재실행, 초과하면 HALT
- `HALT` → 즉시 사람에게 알리고 중단

## Stage 2 — 화면 설계 (3개 서브에이전트 순차 위임)

1. `flow-designer` 서브에이전트 호출 → 정보구조/플로우를 `02-design-doc.md`에 작성
2. `concept-designer` 서브에이전트 호출 → `figma-use`+`figma-generate-design` 스킬로 Figma 키스크린 2~3개(390×844) 제작, `figma-refs.md` 기록
3. `spec-writer` 서브에이전트 호출 → 위 둘을 종합해 `02-design-doc.md` 최종본 완성

**G2 판정 (사람, 유일한 승인 지점)**: 서브에이전트에 위임하지 않고, 이 오케스트레이터가 직접 AskUserQuestion으로 화면 설계 문서·키스크린 요약을 보여주고 승인을 요청한다.

- 승인 → `approved_by`, `approved_at`을 `03-state.json`에 기록하고 Stage 3로 진행
- 반려 → 반려 사유를 기록하고 Stage 2 처음부터 재실행 (재시도 횟수 제한 없음)

## Stage 3 — 디자인 제작

`builder` 서브에이전트를 Task 도구로 호출한다. `figma-use`+`figma-generate-library` 스킬로 토큰/컴포넌트를 제작하고, 실사용 토큰을 `figma-tokens-used.json`에 기록한다.

**G3 판정**: `judge` 서브에이전트를 호출한다 (`harness/scripts/check_g3.js`로 `design_violations` 계산 + Figma 스크린샷 직접 검토로 `policy_violations` 판단).

- `PASS` → 완료 처리
- `FAIL` → `retry_count`를 올리고 2회 이하면 Stage 3 재실행(위반 목록과 함께), 초과하면 HALT

## 완료 보고

`03-state.json`의 상태를 `DONE`으로 기록하고, 터미널에 한 문단으로 요약한다.

```txt
[<target_screen>] 완료 — design 위반 0건, 서비스 규칙 위반 0건, 키스크린 <N>개
런 폴더: runs/<target_screen>/
Figma: <figma_file_url>
```
