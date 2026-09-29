# CLAUDE.md — 허들링 앱 화면 설계 하네스

이 프로젝트에는 화면 설계 작업을 자동화하는 하네스가 있다. 아래 조건에 해당하면 이 파이프라인을 따른다.

## 트리거 조건

- `/run-harness "<target_screen>" <url1> <url2> ...` 형태의 요청
- 자연어로 "OO 화면 설계 시작해줘" + uibowl 레퍼런스 링크가 함께 옴
- 둘 다 `target_screen`과 `reference_urls`(2~5개)를 특정할 수 있어야 트리거한다. 하나라도 없으면 되물어본다.

실행은 `run-harness` 스킬(`.claude/skills/run-harness/SKILL.md`)이 담당한다.

## 단계·게이트 요약

```
Stage 1 레퍼런스 분석 (researcher)
  → G1(자동, judge)
Stage 2 화면 설계 (flow-designer → concept-designer → spec-writer)
  → G2(사람 승인, 유일한 승인 지점 — 오케스트레이터가 직접 진행)
Stage 3 디자인 제작 (builder)
  → G3(자동, judge — 디자인 토큰 + 서비스 규칙 위반)
```

- 게이트가 막히면 막힌 단계로 되돌아간다 (앞 단계로 거슬러가지 않음)
- 자동 게이트(G1·G3)는 최대 2회 재시도 후 HALT, 사람 게이트(G2)는 재시도 없이 즉시 대기

## 판정 기준 (SSOT)

모든 게이트 통과 조건과 완료 기준은 **`harness/rules.yaml`** + **`harness/defaults.yaml`** + **`harness/scripts/check_g1.js`/`check_g3.js`**만 본다. 다른 문서를 임의로 재해석하지 않는다.

배경 설명: `harness/guides/figma-design-guide.md`

## 에이전트 구성

| 에이전트 | 역할 | 편집 권한 |
|---|---|---|
| `researcher` | Stage 1 레퍼런스 분석 | `runs/<target_screen>/`만 |
| `flow-designer` | Stage 2 정보구조/플로우 | `runs/<target_screen>/`만 |
| `concept-designer` | Stage 2 Figma 키스크린 | `runs/<target_screen>/` + 지정 Figma 파일 |
| `spec-writer` | Stage 2 설계문서 최종 정리 | `runs/<target_screen>/`만 |
| `builder` | Stage 3 토큰/컴포넌트 제작 | `runs/<target_screen>/` + 지정 Figma 파일 |
| `judge` | G1/G3 판정 | **읽기 전용, 파일 쓰기 불가** |

`docs/`, `harness/*.md`, `harness/rules.yaml`, `harness/defaults.yaml`, `.claude/`는 파이프라인 실행 중 어떤 에이전트도 쓰지 않는다 — 규칙 수정은 사람이 리뷰 절차(`harness/guides/figma-design-guide.md` 검증과 리뷰)를 통해서만 한다.

## 산출물 위치

`runs/<target_screen>/` (프로젝트 최상위, `harness/` 밖)
