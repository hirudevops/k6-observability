import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomIntBetween } from 'k6';

export let options = {
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // <1% failed requests
  },
  scenarios: {
    ramp_rps: {
      executor: 'ramping-arrival-rate',
      startRate: 5,           // start with 20 RPS
      timeUnit: '1s',          // rate is in requests per second
      preAllocatedVUs: 50,     // initial number of VUs
      maxVUs: 200,             // max VUs if needed
      stages: [
    { target: 5, duration: '10s' },
    { target: 10, duration: '20s' },
    { target: 500, duration: '30s' },
      ],
    },
  },
};


function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function () {
  let offset = randomInt(0, 1000); // Generate random offset
  let limit = randomInt(25,50);
  let url = 'https://web-api.banglalink.net/api/v1/offers-categories';
  let params = {
    headers: {
      'User-Agent': 'BL/500',
      'Accept-Language': 'en',
      'Authorization': 'Bearer on1fd93d36a5e042c3698a5307b617527e',
    },
  };

  let res = http.get(url, params);

  check(res, {
    'is status 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration <= 200,
    'response time < 300ms': (r) => r.timings.duration <= 300,
    'response time < 400ms': (r) => r.timings.duration <= 400,
    'response time < 500ms': (r) => r.timings.duration <= 500
  })
}