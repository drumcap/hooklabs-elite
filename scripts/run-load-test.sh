#!/bin/bash

# 로드 테스트 실행 스크립트
# 사용법: ./scripts/run-load-test.sh [환경] [시나리오]

set -e

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 환경 변수 설정
ENVIRONMENT=${1:-local}
SCENARIO=${2:-standard}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="./load-test-results/${TIMESTAMP}"

# 환경별 URL 설정
case $ENVIRONMENT in
  local)
    export BASE_URL="http://localhost:3000"
    export CONVEX_URL="http://localhost:3001"
    ;;
  staging)
    export BASE_URL="https://staging.hooklabs-elite.com"
    export CONVEX_URL="https://staging.convex.cloud"
    ;;
  production)
    export BASE_URL="https://hooklabs-elite.com"
    export CONVEX_URL="https://production.convex.cloud"
    echo -e "${RED}⚠️  경고: 프로덕션 환경에서 로드 테스트를 실행하려고 합니다!${NC}"
    read -p "계속하시겠습니까? (y/N): " confirm
    if [[ $confirm != [yY] ]]; then
      echo "테스트 취소됨"
      exit 1
    fi
    ;;
  *)
    echo -e "${RED}알 수 없는 환경: $ENVIRONMENT${NC}"
    exit 1
    ;;
esac

# k6 설치 확인
if ! command -v k6 &> /dev/null; then
  echo -e "${YELLOW}k6가 설치되지 않았습니다. 설치 중...${NC}"
  
  # OS별 설치
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    brew install k6
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    sudo gpg -k
    sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
    echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
    sudo apt-get update
    sudo apt-get install k6
  else
    echo -e "${RED}자동 설치가 지원되지 않는 OS입니다. k6를 수동으로 설치해주세요.${NC}"
    echo "설치 가이드: https://k6.io/docs/getting-started/installation/"
    exit 1
  fi
fi

# 결과 디렉토리 생성
mkdir -p $RESULTS_DIR

echo -e "${GREEN}🚀 로드 테스트 시작${NC}"
echo "환경: $ENVIRONMENT"
echo "시나리오: $SCENARIO"
echo "URL: $BASE_URL"
echo "결과 저장 위치: $RESULTS_DIR"
echo ""

# 시나리오별 테스트 실행
case $SCENARIO in
  standard)
    echo "표준 부하 테스트 실행 중..."
    k6 run \
      --out json=$RESULTS_DIR/results.json \
      --out csv=$RESULTS_DIR/results.csv \
      --summary-export=$RESULTS_DIR/summary.json \
      ./scripts/load-test.k6.js
    ;;
    
  stress)
    echo "스트레스 테스트 실행 중..."
    k6 run \
      --stage "2m:10" \
      --stage "5m:100" \
      --stage "10m:500" \
      --stage "5m:1000" \
      --stage "2m:0" \
      --out json=$RESULTS_DIR/results.json \
      ./scripts/load-test.k6.js
    ;;
    
  spike)
    echo "스파이크 테스트 실행 중..."
    k6 run \
      --stage "1m:10" \
      --stage "30s:500" \
      --stage "1m:10" \
      --out json=$RESULTS_DIR/results.json \
      ./scripts/load-test.k6.js
    ;;
    
  soak)
    echo "소크 테스트 실행 중 (장시간)..."
    k6 run \
      --stage "5m:50" \
      --stage "60m:50" \
      --stage "5m:0" \
      --out json=$RESULTS_DIR/results.json \
      ./scripts/load-test.k6.js
    ;;
    
  *)
    echo -e "${RED}알 수 없는 시나리오: $SCENARIO${NC}"
    echo "사용 가능한 시나리오: standard, stress, spike, soak"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}✅ 로드 테스트 완료!${NC}"

# 결과 분석
echo ""
echo "📊 테스트 결과 분석 중..."

# JSON 결과 파싱 (jq 사용)
if command -v jq &> /dev/null; then
  # 주요 메트릭 추출
  P95_DURATION=$(jq '.metrics.http_req_duration.values."p(95)"' $RESULTS_DIR/summary.json)
  P99_DURATION=$(jq '.metrics.http_req_duration.values."p(99)"' $RESULTS_DIR/summary.json)
  ERROR_RATE=$(jq '.metrics.http_req_failed.values.rate' $RESULTS_DIR/summary.json)
  RPS=$(jq '.metrics.http_reqs.values.rate' $RESULTS_DIR/summary.json)
  
  echo ""
  echo "📈 주요 성능 지표:"
  echo "  • P95 응답 시간: ${P95_DURATION}ms"
  echo "  • P99 응답 시간: ${P99_DURATION}ms"
  echo "  • 에러율: $(echo "scale=2; $ERROR_RATE * 100" | bc)%"
  echo "  • 초당 요청 수: ${RPS}"
  
  # 성능 목표 달성 여부 체크
  echo ""
  echo "🎯 성능 목표 달성 여부:"
  
  if (( $(echo "$P95_DURATION < 500" | bc -l) )); then
    echo -e "  ${GREEN}✓${NC} P95 응답 시간 < 500ms"
  else
    echo -e "  ${RED}✗${NC} P95 응답 시간 > 500ms (목표 미달성)"
  fi
  
  if (( $(echo "$ERROR_RATE < 0.01" | bc -l) )); then
    echo -e "  ${GREEN}✓${NC} 에러율 < 1%"
  else
    echo -e "  ${RED}✗${NC} 에러율 > 1% (목표 미달성)"
  fi
else
  echo -e "${YELLOW}jq가 설치되지 않아 상세 분석을 수행할 수 없습니다.${NC}"
  echo "결과 파일을 직접 확인하세요: $RESULTS_DIR/summary.json"
fi

# HTML 리포트 생성
echo ""
echo "📄 HTML 리포트 생성 중..."
node -e "
const fs = require('fs');
const summary = JSON.parse(fs.readFileSync('$RESULTS_DIR/summary.json'));

const html = \`
<!DOCTYPE html>
<html>
<head>
  <title>Load Test Report - $TIMESTAMP</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 40px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 { color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
    h2 { color: #666; margin-top: 30px; }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .metric-card {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #4CAF50;
    }
    .metric-value {
      font-size: 2em;
      font-weight: bold;
      color: #333;
    }
    .metric-label {
      color: #666;
      margin-top: 5px;
    }
    .pass { color: #4CAF50; }
    .fail { color: #f44336; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  <div class='container'>
    <h1>🚀 Load Test Report</h1>
    <p><strong>환경:</strong> $ENVIRONMENT | <strong>시나리오:</strong> $SCENARIO | <strong>시간:</strong> $TIMESTAMP</p>
    
    <h2>📊 핵심 성능 지표</h2>
    <div class='metric-grid'>
      <div class='metric-card'>
        <div class='metric-value'>\${(summary.metrics.http_req_duration.values['p(95)']).toFixed(0)}ms</div>
        <div class='metric-label'>P95 응답 시간</div>
      </div>
      <div class='metric-card'>
        <div class='metric-value'>\${(summary.metrics.http_req_duration.values['p(99)']).toFixed(0)}ms</div>
        <div class='metric-label'>P99 응답 시간</div>
      </div>
      <div class='metric-card'>
        <div class='metric-value'>\${(summary.metrics.http_req_failed.values.rate * 100).toFixed(2)}%</div>
        <div class='metric-label'>에러율</div>
      </div>
      <div class='metric-card'>
        <div class='metric-value'>\${summary.metrics.http_reqs.values.rate.toFixed(1)}</div>
        <div class='metric-label'>초당 요청 수 (RPS)</div>
      </div>
    </div>
    
    <h2>📈 상세 메트릭</h2>
    <table>
      <tr>
        <th>메트릭</th>
        <th>평균</th>
        <th>최소</th>
        <th>중간값</th>
        <th>최대</th>
        <th>P90</th>
        <th>P95</th>
      </tr>
      <tr>
        <td>응답 시간 (ms)</td>
        <td>\${summary.metrics.http_req_duration.values.avg.toFixed(2)}</td>
        <td>\${summary.metrics.http_req_duration.values.min.toFixed(2)}</td>
        <td>\${summary.metrics.http_req_duration.values.med.toFixed(2)}</td>
        <td>\${summary.metrics.http_req_duration.values.max.toFixed(2)}</td>
        <td>\${summary.metrics.http_req_duration.values['p(90)'].toFixed(2)}</td>
        <td>\${summary.metrics.http_req_duration.values['p(95)'].toFixed(2)}</td>
      </tr>
    </table>
    
    <h2>✅ 성능 목표 달성 여부</h2>
    <ul>
      <li class='\${summary.metrics.http_req_duration.values['p(95)'] < 500 ? 'pass' : 'fail'}'>
        P95 응답 시간 < 500ms: \${summary.metrics.http_req_duration.values['p(95)'] < 500 ? '✓ 달성' : '✗ 미달성'}
      </li>
      <li class='\${summary.metrics.http_req_failed.values.rate < 0.01 ? 'pass' : 'fail'}'>
        에러율 < 1%: \${summary.metrics.http_req_failed.values.rate < 0.01 ? '✓ 달성' : '✗ 미달성'}
      </li>
    </ul>
  </div>
</body>
</html>
\`;

fs.writeFileSync('$RESULTS_DIR/report.html', html);
console.log('HTML 리포트가 생성되었습니다: $RESULTS_DIR/report.html');
"

# 리포트 열기 (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
  open $RESULTS_DIR/report.html
fi

echo ""
echo "📁 모든 결과 파일이 저장되었습니다: $RESULTS_DIR"
echo ""
echo "다음 명령으로 결과를 확인할 수 있습니다:"
echo "  • JSON 결과: cat $RESULTS_DIR/summary.json | jq ."
echo "  • CSV 결과: cat $RESULTS_DIR/results.csv"
echo "  • HTML 리포트: open $RESULTS_DIR/report.html"