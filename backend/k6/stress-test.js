import http from 'k6/http';
import { check, sleep } from 'k6';
import { makeToken } from './jwt.js';

export const options = {
  stages: [
    { target: 50, duration: '1m' },
    { target: 100, duration: '1m' },
    { target: 200, duration: '2m' },
    { target: 0, duration: '1m' },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
    const token = makeToken(['product:view'], __ENV.JWT_SECRET);
    const headers = { Authorization: `Bearer ${token}` };
    const res = http.get('http://backend:5000/api/products/', { headers });
    check(res, {
        'status is 200': (r) => r.status === 200,
        'duration < 500ms': (r) => r.timings.duration < 500,
    });
    sleep(1);
}