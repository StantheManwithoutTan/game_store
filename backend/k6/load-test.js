import http from 'k6/http';
import { check, sleep } from 'k6';
import { makeToken } from './jwt.js';

export const options = {
  stages: [
    { target: 50, duration: '30s' },   // ramp-up
    { target: 50, duration: '1m' },    // steady
    { target: 0, duration: '30s' },    // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
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