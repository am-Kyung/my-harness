#!/usr/bin/env node
// G1 판정: harness/rules.yaml의 gates.G1 조건을 결정론적으로 계산한다.
// 사용법: node check_g1.js <target_screen>
// 읽기 전용 — 이 스크립트는 어떤 파일도 쓰지 않는다.

const fs = require("fs");
const path = require("path");

const targetScreen = process.argv[2];
if (!targetScreen) {
  console.log(JSON.stringify({ gate: "G1", result: "ERROR", reason: "target_screen 인자가 필요합니다" }));
  process.exit(1);
}

const repoRoot = path.join(__dirname, "..", "..");
const statePath = path.join(repoRoot, "runs", targetScreen, "03-state.json");

if (!fs.existsSync(statePath)) {
  console.log(JSON.stringify({ gate: "G1", result: "ERROR", reason: `state.json 없음: ${statePath}` }));
  process.exit(1);
}

const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
const refCount = Array.isArray(state.reference_urls) ? state.reference_urls.length : 0;
const failedCount = state.failed_url_count || 0;
const insightsCount = state.extracted_insights_count || 0;

let result, reason;
if (refCount === 0) {
  result = "ERROR";
  reason = "reference_urls가 state.json에 없습니다";
} else if (failedCount === refCount) {
  result = "HALT";
  reason = "모든 레퍼런스 URL에 접근할 수 없습니다";
} else if (insightsCount >= refCount - failedCount) {
  result = "PASS";
  reason = "조건 충족";
} else {
  result = "FAIL";
  reason = `extracted_insights_count(${insightsCount}) < 필요치(${refCount - failedCount})`;
}

console.log(JSON.stringify({ gate: "G1", result, reason, extracted_insights_count: insightsCount, reference_url_count: refCount, failed_url_count: failedCount }));
