# 허들링 앱 화면 설계 하네스 — 배경 가이드

> 실제 판정 기준(SSOT)은 `harness/rules.yaml` + `harness/defaults.yaml` + `harness/scripts/*.js`다. 이 문서는 왜 그렇게 정했는지 배경을 설명하는 참고 문서다.

## 목적 (무엇이 매번 달라지나 / 사용자 / 완료 기준)

- 가변 입력: `target_screen`(화면 이름 1개), `reference_urls`(uibowl 레퍼런스 2~5개). 나머지는 고정 — PRD 매칭 섹션은 `target_screen`으로 자동 탐색, `docs/design.md` 토큰은 전체 고정 적용.
- 실행 주체: 디자이너 1인이 새 화면 설계 착수 시점마다 수동 트리거. G2(내부 관계자 협의)는 하네스가 대신할 수 없는 사람 개입 지점.
- 완료 기준: `design 위반 0건 AND policy 위반 0건 AND 키스크린 2개 이상` (`harness/rules.yaml`의 `completion` 항목과 동일).

## 파이프라인 구조

원본: `docs/story-work.md`의 3단계 흐름 (레퍼런스 분석 → G1 → 화면 설계 → G2 → 디자인 제작 → G3).

| 단계 | 입력 | 출력 | 담당 에이전트 |
|---|---|---|---|
| Stage 1 레퍼런스 분석 | `reference_urls` | 반영 포인트 | `researcher` |
| Stage 2 화면 설계 | 반영 포인트 + PRD 매칭 섹션 | 화면 설계 문서 + Figma 키스크린 | `flow-designer` → `concept-designer` → `spec-writer` |
| Stage 3 디자인 제작 | G2 승인된 컨셉 시안 | 디자인 토큰/컴포넌트/화면 디자인 | `builder` |

되돌아가는 지점: 게이트가 막히면 막힌 단계 자체로 되돌아간다 (더 앞 단계로 거슬러가지 않음). G1 FAIL→Stage1, G2 REJECT→Stage2, G3 FAIL→Stage3.

## 산출물

```txt
runs/<target_screen>/
├── 01-insights.md            # researcher
├── 02-design-doc.md          # flow-designer → spec-writer
├── figma-refs.md              # concept-designer / builder
├── figma-tokens-used.json    # builder (judge의 G3 스크립트 입력값)
└── 03-state.json             # 오케스트레이터(run-harness 스킬)가 관리
```

재개(resume): `03-state.json`이 있으면 `current_stage`부터 자동 이어감. 처음부터 다시 하려면 `--fresh`.

## 게이트

- **G1** (자동, `harness/scripts/check_g1.js`): 레퍼런스 URL별 반영 포인트 추출 여부
- **G2** (사람, 유일한 승인 지점): 화면 설계 문서 + 키스크린 승인. 오케스트레이터가 AskUserQuestion으로 직접 진행, 서브에이전트에 위임하지 않음
- **G3** (자동, `harness/scripts/check_g3.js` + `judge`의 시각 검토): 디자인 토큰 준수(스크립트) + 서비스 규칙 위반(사람 개입 없이 `judge`가 Figma 스크린샷을 직접 봐서 판단)

★ G3의 `policy_violations`는 `docs/story-service.md`의 "어기면 안 되는 것" 규칙 1(개인정보·고객정보·회사기밀·타인의 저작물 금지)을 화면 설계 산출물에도 적용한 것이다. 이 화면 설계 파이프라인 자체는 판매 자산 검수와 무관하지만, 게이트 설계상 서비스 차원의 금지 규칙을 최소 1개는 걸리게 해야 한다는 요구사항(R5)을 이렇게 연결했다.

## 역할 분리

- 실행 에이전트(`researcher`/`flow-designer`/`concept-designer`/`spec-writer`/`builder`)는 각자 `runs/<target_screen>/`와 지정 Figma 파일만 쓴다. `docs/`, `harness/*.md`, `harness/rules.yaml`, `.claude/`는 건드리지 않는다.
- `judge`는 읽기 전용이다 — Write/Edit 도구 자체가 없다. G1/G3 스크립트를 Bash로 실행하고, PASS/FAIL/HALT만 반환한다. 산출물을 만든 쪽이 자기 산출물을 스스로 통과시키는 이해충돌을 막기 위한 설계다.
- 자연어 트리거: `.claude/skills/run-harness/SKILL.md`의 description이 "화면 설계 시작해줘 + 레퍼런스 링크" 패턴을 인식해 자동 트리거된다.

## 오케스트레이터 (CLAUDE.md)

CLAUDE.md는 트리거 조건 + 단계/게이트 요약 + SSOT 경로(`harness/rules.yaml`)만 가볍게 담고, 세부 판정식은 이 문서와 `harness/rules.yaml`/`scripts/`로 위임한다. 실제 실행 절차는 `.claude/skills/run-harness/SKILL.md`가 담당한다.

## 검증과 리뷰

- 검증: 실제 화면 1개(예: PRD 6-3 "스킬 라이브러리")로 `run-harness`를 처음부터 끝까지 실행, 목업 없이. G3까지 `DONE` 도달하면 1차 검증 완료.
- 리뷰: 정기 주기 없음. 파이프라인이 HALT되거나 판정이 직관과 다를 때마다 즉시 `harness/rules.yaml`/`scripts/`/이 가이드를 리뷰하고 수정한다. 수정 시 파일 상단에 `> 최종 수정: <날짜> — <이유>` 한 줄만 남긴다.
