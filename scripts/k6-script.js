import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    ramping: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 10 },
        { duration: "30s", target: 0 }
      ],
      gracefulRampDown: "10s"
    }
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],          // <1% errors
    http_req_duration: ["p(95)<500"]         // p95 < 500ms
  }
};

const BASE_URL = __ENV.BASE_URL || "https://test.k6.io";

export default function () {
  const res = http.get(`${BASE_URL}/`);
  check(res, {
    "status is 200": (r) => r.status === 200
  });
  sleep(1);
}