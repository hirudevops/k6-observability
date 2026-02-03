const fs = require('fs');
const path = require('path');

const summaryPath = '/reports/summary.json';
const prefix = process.env.REPORT_PREFIX || 'k6-summary';
const waitSeconds = Number(process.env.WAIT_SECONDS || 900);

function pad(n) {
  return String(n).padStart(2, '0');
}

function buildTimestamp(date = new Date()) {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}

function buildHtml(summary) {
  const metrics = summary.metrics || {};
  const getMetric = (key) => metrics[key] || {};
  const getCount = (key) => getMetric(key).count ?? getMetric(key).value ?? 0;
  const getRate = (key) => getMetric(key).rate ?? getMetric(key).value ?? 0;
  const getStat = (key, stat) => getMetric(key)[stat] ?? null;

  const durationKey = metrics['http_req_duration'] ? 'http_req_duration' : 'http_req_duration{expected_response:true}';
  const duration = getMetric(durationKey);
  const totalRequests = getCount('http_reqs');
  const failedRate = getRate('http_req_failed');
  const failedRequests = Math.round(failedRate * totalRequests);
  const passRate = Math.max(0, Math.min(1, 1 - failedRate));

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>k6 Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #333; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin: 20px 0; }
    .metric-box { background: #f9f9f9; padding: 15px; border-left: 4px solid #4CAF50; border-radius: 4px; }
    .metric-label { color: #666; font-size: 12px; text-transform: uppercase; }
    .metric-value { font-size: 24px; font-weight: bold; color: #4CAF50; margin: 8px 0; }
    pre { background: #f0f0f0; padding: 10px; overflow-x: auto; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>k6 Load Test Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    <div class="metrics">
      <div class="metric-box"><div class="metric-label">Total Requests</div><div class="metric-value">${Math.round(totalRequests)}</div></div>
      <div class="metric-box"><div class="metric-label">Failed Requests</div><div class="metric-value">${failedRequests}</div></div>
      <div class="metric-box"><div class="metric-label">Failed Rate (%)</div><div class="metric-value">${(failedRate * 100).toFixed(2)}</div></div>
      <div class="metric-box"><div class="metric-label">Succeeded Rate (%)</div><div class="metric-value">${(passRate * 100).toFixed(2)}</div></div>
      <div class="metric-box"><div class="metric-label">Avg Duration (ms)</div><div class="metric-value">${duration.avg ? Math.round(duration.avg) : 0}</div></div>
      <div class="metric-box"><div class="metric-label">P95 Duration (ms)</div><div class="metric-value">${duration['p(95)'] ? Math.round(duration['p(95)']) : 'N/A'}</div></div>
      <div class="metric-box"><div class="metric-label">P99 Duration (ms)</div><div class="metric-value">${duration['p(99)'] ? Math.round(duration['p(99)']) : 'N/A'}</div></div>
    </div>

    <h2>Pass vs Fail</h2>
    <div class="metrics">
      <div class="metric-box" style="padding: 12px;">
        <div class="metric-label">Pass / Fail Rate</div>
        <div style="height: 14px; background: #eee; border-radius: 8px; overflow: hidden; margin-top: 8px;">
          <div style="height: 100%; width: ${(passRate * 100).toFixed(2)}%; background: #4CAF50; float: left;"></div>
          <div style="height: 100%; width: ${(failedRate * 100).toFixed(2)}%; background: #F44336; float: left;"></div>
        </div>
        <div style="margin-top: 6px; font-size: 12px; color: #666;">
          Pass: ${(passRate * 100).toFixed(2)}% | Fail: ${(failedRate * 100).toFixed(2)}%
        </div>
      </div>
    </div>
    <h2>Summary JSON</h2>
    <pre>${JSON.stringify(summary, null, 2)}</pre>
  </div>
</body>
</html>
  `;
}

function waitForSummary(tries = waitSeconds) {
  if (fs.existsSync(summaryPath)) {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    const html = buildHtml(summary);
    const fileName = `${prefix}-${buildTimestamp()}.html`;
    const outputPath = path.join('/reports', fileName);
    fs.writeFileSync(outputPath, html, 'utf8');
    console.log(`Report written to ${outputPath}`);
    return;
  }

  if (tries <= 0) {
    console.error('summary.json not found in time.');
    process.exit(1);
  }

  setTimeout(() => waitForSummary(tries - 1), 1000);
}

waitForSummary();
