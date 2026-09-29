#!/usr/bin/env node
// G3 판정 (design_tokens 파트만): harness/rules.yaml의 design_tokens_allowlist와
// runs/<target_screen>/figma-tokens-used.json(빌더가 기록한 실사용 토큰)을 비교한다.
// policy_violations(개인정보/저작권)는 이 스크립트가 아니라 judge 에이전트가 직접 시각 검토로 판정한다.
// 사용법: node check_g3.js <target_screen>
// 읽기 전용 — 이 스크립트는 어떤 파일도 쓰지 않는다.

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const targetScreen = process.argv[2];
if (!targetScreen) {
  console.log(JSON.stringify({ gate: "G3", check: "design_tokens", result: "ERROR", reason: "target_screen 인자가 필요합니다" }));
  process.exit(1);
}

const repoRoot = path.join(__dirname, "..", "..");
const rulesPath = path.join(repoRoot, "harness", "rules.yaml");
const tokensPath = path.join(repoRoot, "runs", targetScreen, "figma-tokens-used.json");

if (!fs.existsSync(tokensPath)) {
  console.log(JSON.stringify({ gate: "G3", check: "design_tokens", result: "ERROR", reason: `figma-tokens-used.json 없음: ${tokensPath}` }));
  process.exit(1);
}

const rules = yaml.load(fs.readFileSync(rulesPath, "utf-8"));
const allowlist = rules.design_tokens_allowlist || {};
const allowedFlat = new Set([
  ...((allowlist.colors || []).map((t) => `color:${t}`)),
  ...((allowlist.rounded || []).map((t) => `rounded:${t}`)),
  ...((allowlist.typography || []).map((t) => `typography:${t}`)),
]);

const used = JSON.parse(fs.readFileSync(tokensPath, "utf-8")); // 예: ["color:ink", "rounded:md", ...]
const violations = used.filter((t) => !allowedFlat.has(t));

const result = violations.length === 0 ? "PASS" : "FAIL";

console.log(JSON.stringify({
  gate: "G3",
  check: "design_tokens",
  result,
  design_violations: violations,
  used_token_count: used.length,
}));
