import http from 'k6/http';
import { check } from 'k6';
import { makeToken } from './jwt.js';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const token = makeToken(['stock:manage'], __ENV.JWT_SECRET);
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  const payload = JSON.stringify({
    product_id: 1,
    amount: 1,
    motive: 'test concurrente',
  });
  const res = http.post('https://backend:5000/api/stocks/entrada', payload, { headers });
  check(res, { 'status is 201': (r) => r.status === 201 });
}