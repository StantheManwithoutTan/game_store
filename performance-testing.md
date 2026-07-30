## Performance Testing Results

# Schemathesis

Correr dentro de docker container (para probar con db y carga real):
- docker exec -it devcontainer-backend-1 pytest tests/test_contract.py -v

tests/test_contract.py::test_api_schema[GET /api/games/] PASSED                                                                                                    [  5%]
tests/test_contract.py::test_api_schema[POST /api/games/] PASSED                                                                                                   [ 11%]
tests/test_contract.py::test_api_schema[GET /api/games/{game_id}] PASSED                                                                                           [ 16%]
tests/test_contract.py::test_api_schema[PUT /api/games/{game_id}] PASSED                                                                                           [ 22%]
tests/test_contract.py::test_api_schema[DELETE /api/games/{game_id}] PASSED                                                                                        [ 27%]
tests/test_contract.py::test_api_schema[GET /api/products/] PASSED                                                                                                 [ 33%]
tests/test_contract.py::test_api_schema[POST /api/products/] PASSED                                                                                                [ 38%]
tests/test_contract.py::test_api_schema[GET /api/products/{product_id}] PASSED                                                                                     [ 44%]
tests/test_contract.py::test_api_schema[PUT /api/products/{product_id}] PASSED                                                                                     [ 50%]
tests/test_contract.py::test_api_schema[DELETE /api/products/{product_id}] PASSED                                                                                  [ 55%]
tests/test_contract.py::test_api_schema[POST /api/stocks/entrada] PASSED                                                                                           [ 61%]
tests/test_contract.py::test_api_schema[POST /api/stocks/salida] PASSED                                                                                            [ 66%]
tests/test_contract.py::test_api_schema[POST /api/stocks/ajuste] PASSED                                                                                            [ 72%]
tests/test_contract.py::test_api_schema[GET /api/stocks/historial] PASSED                                                                                          [ 77%]
tests/test_contract.py::test_api_schema[GET /api/stocks/criticos] PASSED                                                                                           [ 83%]
tests/test_contract.py::test_api_schema[GET /api/reports/] PASSED                                                                                                  [ 88%]
tests/test_contract.py::test_api_schema[GET /api/audit/] PASSED                                                                                                    [ 94%]
tests/test_contract.py::test_api_schema[GET /api/users/] PASSED        


### K6


### Load Test (GET /api/products, 50 VUs, 2 min)
- p50: ~20ms
- p95: ~40ms
- p99: ~60ms  (k6 no mostró p99; toca calcular con --summary-trend-stats)
- Error rate: 0%
- Throughput: ~37 req/s
- Criterio aceptación: p95 < 500ms — CUMPLE


Comando dentro de .devcontainer:

    docker compose run --rm k6 run /scripts/load-test.js `
    --out html=/results/k6-load-report.html `
    --summary-trend-stats="avg,min,med,max,p(50),p(90),p(95),p(99)"

docker compose run --rm k6 run /scripts/load-test.js `
  --out json=/results/k6-load.json `
  --summary-trend-stats="avg,min,med,max,p(50),p(90),p(95),p(99)"


### Stress Test (GET /api/products, 0→200 VUs, 5 min)
- p50: ~20ms
- p95: ~59ms
- Error rate: 0%
- Throughput: ~97 req/s (tras optimizar)
- Punto de quiebre: Rate limiter (10000/hora) → primer cuello de botella
- Criterio aceptación: p95 < 1000ms — CUMPLE

Comando dentro de .devcontainer:

    docker compose run --rm k6 run /scripts/stress-test.js `
    --out json=/results/k6-stress.json `
    --summary-trend-stats="avg,min,med,max,p(50),p(90),p(95),p(99)"


### Concurrent Stock Test (POST /api/stocks/entrada, 10 VUs, 30s)
## 3. Concurrent Stock Test — `POST /api/stocks/entrada`
**Config:** 10 VUs simultáneos, 30s

| Métrica | Valor | Criterio | ¿Cumple? |
|---------|-------|----------|----------|
| p50 | 51ms | — | — |
| p95 | **121ms** | — | Si |
| p99 | **199ms** | — | Si |
| Error rate | 0.00% | **0%** | Si |
| Throughput | **155 req/s** | — | — |
| Status 201 | 100% | **100%** | Si |

Comando dentro de .devcontainer:

    docker compose run --rm k6 run /scripts/concurrent-stock-test.js `
    --out json=/results/k6-concurrent-report.json `
    --summary-trend-stats="avg,min,med,max,p(50),p(90),p(95),p(99)"


| Condición | Load Test | Stress Test | Concurrent Stock |
|-----------|-----------|-------------|------------------|
| p95 < 500ms | 30ms | 59ms | 121ms |
| Error rate < 1% | 0% | 0% | 0% |
| Sin data races | N/A | N/A | 4658/4658 OK |

### Bottlenecks Identificados
1. **Rate Limiter (10000/hora)**: Bloqueaba ~86% de requests en stress test.
   - Solución: Deshabilitado para pruebas de performance.
2. **Gunicorn 1 worker**: p95 subía a 1.72s con 200 VUs.
   - Solución: Cambiado a `--workers 4 --threads 2`. p95 bajó a 59ms.