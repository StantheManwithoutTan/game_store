{
  "annotations": {
    "list": [
      {
        "builtIn": 1,
        "datasource": {
          "type": "grafana",
          "uid": "-- Grafana --"
        },
        "enable": true,
        "hide": true,
        "iconColor": "rgba(0, 211, 255, 1)",
        "name": "Annotations & Alerts",
        "type": "dashboard"
      }
    ]
  },
  "description": "Resultados de pruebas de carga de k6 enviados a Prometheus mediante Remote Write.",
  "editable": true,
  "fiscalYearStartMonth": 0,
  "graphTooltip": 1,
  "id": null,
  "links": [],
  "liveNow": false,
  "panels": [
    {
      "datasource": {
        "type": "prometheus",
        "uid": "prometheus-metrics-backend"
      },
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "thresholds"
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": null
              }
            ]
          },
          "unit": "none",
          "decimals": 0
        },
        "overrides": []
      },
      "gridPos": {
        "h": 5,
        "w": 6,
        "x": 0,
        "y": 0
      },
      "id": 1,
      "options": {
        "colorMode": "value",
        "graphMode": "area",
        "justifyMode": "auto",
        "orientation": "auto",
        "reduceOptions": {
          "calcs": [
            "lastNotNull"
          ],
          "fields": "",
          "values": false
        },
        "showPercentChange": false,
        "textMode": "auto",
        "wideLayout": true
      },
      "targets": [
        {
          "datasource": {
            "type": "prometheus",
            "uid": "prometheus-metrics-backend"
          },
          "editorMode": "code",
          "expr": "sum(k6_http_reqs_total{testid=~\"$testid\"})",
          "instant": true,
          "legendFormat": "__auto",
          "range": false,
          "refId": "A"
        }
      ],
      "title": "Solicitudes HTTP",
      "type": "stat"
    },
    {
      "datasource": {
        "type": "prometheus",
        "uid": "prometheus-metrics-backend"
      },
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "thresholds"
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": null
              },
              {
                "color": "yellow",
                "value": 1
              },
              {
                "color": "red",
                "value": 10
              }
            ]
          },
          "unit": "none",
          "decimals": 0
        },
        "overrides": []
      },
      "gridPos": {
        "h": 5,
        "w": 6,
        "x": 6,
        "y": 0
      },
      "id": 2,
      "options": {
        "colorMode": "value",
        "graphMode": "area",
        "justifyMode": "auto",
        "orientation": "auto",
        "reduceOptions": {
          "calcs": [
            "lastNotNull"
          ],
          "fields": "",
          "values": false
        },
        "showPercentChange": false,
        "textMode": "auto",
        "wideLayout": true
      },
      "targets": [
        {
          "datasource": {
            "type": "prometheus",
            "uid": "prometheus-metrics-backend"
          },
          "editorMode": "code",
          "expr": "sum(k6_http_reqs_total{testid=~\"$testid\", expected_response=\"false\"})",
          "instant": true,
          "legendFormat": "__auto",
          "range": false,
          "refId": "A"
        }
      ],
      "title": "Solicitudes fallidas",
      "type": "stat"
    },
    {
      "datasource": {
        "type": "prometheus",
        "uid": "prometheus-metrics-backend"
      },
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "thresholds"
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": null
              },
              {
                "color": "yellow",
                "value": 1
              },
              {
                "color": "red",
                "value": 5
              }
            ]
          },
          "unit": "percent",
          "decimals": 2
        },
        "overrides": []
      },
      "gridPos": {
        "h": 5,
        "w": 6,
        "x": 12,
        "y": 0
      },
      "id": 3,
      "options": {
        "colorMode": "value",
        "graphMode": "area",
        "justifyMode": "auto",
        "orientation": "auto",
        "reduceOptions": {
          "calcs": [
            "lastNotNull"
          ],
          "fields": "",
          "values": false
        },
        "showPercentChange": false,
        "textMode": "auto",
        "wideLayout": true
      },
      "targets": [
        {
          "datasource": {
            "type": "prometheus",
            "uid": "prometheus-metrics-backend"
          },
          "editorMode": "code",
          "expr": "avg(k6_http_req_failed_rate{testid=~\"$testid\"}) * 100",
          "instant": true,
          "legendFormat": "__auto",
          "range": false,
          "refId": "A"
        }
      ],
      "title": "Tasa de fallos",
      "type": "stat"
    },
    {
      "datasource": {
        "type": "prometheus",
        "uid": "prometheus-metrics-backend"
      },
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "thresholds"
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": null
              },
              {
                "color": "yellow",
                "value": 0.5
              },
              {
                "color": "red",
                "value": 1
              }
            ]
          },
          "unit": "s",
          "decimals": 3
        },
        "overrides": []
      },
      "gridPos": {
        "h": 5,
        "w": 6,
        "x": 18,
        "y": 0
      },
      "id": 4,
      "options": {
        "colorMode": "value",
        "graphMode": "area",
        "justifyMode": "auto",
        "orientation": "auto",
        "reduceOptions": {
          "calcs": [
            "lastNotNull"
          ],
          "fields": "",
          "values": false
        },
        "showPercentChange": false,
        "textMode": "auto",
        "wideLayout": true
      },
      "targets": [
        {
          "datasource": {
            "type": "prometheus",
            "uid": "prometheus-metrics-backend"
          },
          "editorMode": "code",
          "expr": "avg(k6_http_req_duration_p95{testid=~\"$testid\"})",
          "instant": true,
          "legendFormat": "__auto",
          "range": false,
          "refId": "A"
        }
      ],
      "title": "Latencia P95",
      "type": "stat"
    },
    {
      "datasource": {
        "type": "prometheus",
        "uid": "prometheus-metrics-backend"
      },
      "description": "",
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisBorderShow": false,
            "axisCenteredZero": false,
            "axisColorMode": "text",
            "axisLabel": "",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "drawStyle": "line",
            "fillOpacity": 10,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "insertNulls": false,
            "lineInterpolation": "linear",
            "lineWidth": 2,
            "pointSize": 4,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "never",
            "spanNulls": false,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "off"
            }
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": null
              }
            ]
          }
        },
        "overrides": []
      },
      "gridPos": {
        "h": 9,
        "w": 12,
        "x": 0,
        "y": 5
      },
      "id": 5,
      "options": {
        "legend": {
          "calcs": [
            "lastNotNull"
          ],
          "displayMode": "table",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "mode": "multi",
          "sort": "desc"
        }
      },
      "targets": [
        {
          "datasource": {
            "type": "prometheus",
            "uid": "prometheus-metrics-backend"
          },
          "editorMode": "code",
          "expr": "sum(k6_vus{testid=~\"$testid\"})",
          "instant": false,
          "legendFormat": "VUs",
          "range": true,
          "refId": "A"
        },
        {
          "datasource": {
            "type": "prometheus",
            "uid": "prometheus-metrics-backend"
          },
          "editorMode": "code",
          "expr": "sum(rate(k6_iterations_total{testid=~\"$testid\"}[$__rate_interval]))",
          "instant": false,
          "legendFormat": "Iteraciones/s",
          "range": true,
          "refId": "B"
        }
      ],
      "title": "Usuarios virtuales e iteraciones",
      "type": "timeseries"
    },
    {
      "datasource": {
        "type": "prometheus",
        "uid": "prometheus-metrics-backend"
      },
      "description": "",
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisBorderShow": false,
            "axisCenteredZero": false,
            "axisColorMode": "text",
            "axisLabel": "",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "drawStyle": "line",
            "fillOpacity": 10,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "insertNulls": false,
            "lineInterpolation": "linear",
            "lineWidth": 2,
            "pointSize": 4,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "never",
            "spanNulls": false,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "off"
            }
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": null
              }
            ]
          },
          "unit": "reqps"
        },
        "overrides": []
      },
      "gridPos": {
        "h": 9,
        "w": 12,
        "x": 12,
        "y": 5
      },
      "id": 6,
      "options": {
        "legend": {
          "calcs": [
            "lastNotNull"
          ],
          "displayMode": "table",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "mode": "multi",
          "sort": "desc"
        }
      },
      "targets": [
        {
          "datasource": {
            "type": "prometheus",
            "uid": "prometheus-metrics-backend"
          },
          "editorMode": "code",
          "expr": "sum(rate(k6_http_reqs_total{testid=~\"$testid\"}[$__rate_interval]))",
          "instant": false,
          "legendFormat": "HTTP req/s",
          "range": true,
          "refId": "A"
        },
        {
          "datasource": {
            "type": "prometheus",
            "uid": "prometheus-metrics-backend"
          },
          "editorMode": "code",
          "expr": "sum(rate(k6_http_reqs_total{testid=~\"$testid\", expected_response=\"false\"}[$__rate_interval]))",
          "instant": false,
          "legendFormat": "Fallidas/s",
          "range": true,
          "refId": "B"
        }
      ],
      "title": "Solicitudes por segundo",
      "type": "timeseries"
    },
    {
      "datasource": {
        "type": "prometheus",
        "uid": "prometheus-metrics-backend"
      },
      "description": "Los percentiles se generan mediante K6_PROMETHEUS_RW_TREND_STATS.",
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisBorderShow": false,
            "axisCenteredZero": false,
            "axisColorMode": "text",
            "axisLabel": "",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "drawStyle": "line",
            "fillOpacity": 10,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "insertNulls": false,
            "lineInterpolation": "linear",
            "lineWidth": 2,
            "pointSize": 4,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "never",
            "spanNulls": false,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "off"
            }
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": null
              }
            ]
          },
          "unit": "s"
        },
        "overrides": []
      },
      "gridPos": {
        "h": 10,
        "w": 24,
        "x": 0,
        "y": 14
      },
      "id": 7,
      "options": {
        "legend": {
          "calcs": [
            "lastNotNull"
          ],
          "displayMode": "table",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "mode": "multi",
          "sort": "desc"
        }
      },
      "targets": [
        {
          "datasource": {
            "type": "prometheus",
            "uid": "prometheus-metrics-backend"
          },
          "editorMode": "code",
          "expr": "avg(k6_http_req_duration_p50{testid=~\"$testid\"})",
          "instant": false,
          "legendFormat": "P50",
          "range": true,
          "refId": "A"
        },
        {
          "datasource": {
            "type": "prometheus",
            "uid": "prometheus-metrics-backend"
          },
          "editorMode": "code",
          "expr": "avg(k6_http_req_duration_p90{testid=~\"$testid\"})",
          "instant": false,
          "legendFormat": "P90",
          "range": true,
          "refId": "B"
        },
        {
          "datasource": {
            "type": "prometheus",
            "uid": "prometheus-metrics-backend"
          },
          "editorMode": "code",
          "expr": "avg(k6_http_req_duration_p95{testid=~\"$testid\"})",
          "instant": false,
          "legendFormat": "P95",
          "range": true,
          "refId": "C"
        },
        {
          "datasource": {
            "type": "prometheus",
            "uid": "prometheus-metrics-backend"
          },
          "editorMode": "code",
          "expr": "avg(k6_http_req_duration_p99{testid=~\"$testid\"})",
          "instant": false,
          "legendFormat": "P99",
          "range": true,
          "refId": "D"
        }
      ],
      "title": "Percentiles de latencia HTTP",
      "type": "timeseries"
    }
  ],
  "refresh": "5s",
  "schemaVersion": 39,
  "tags": [
    "game-store",
    "k6",
    "prometheus",
    "performance"
  ],
  "templating": {
    "list": [
      {
        "allValue": ".*",
        "current": {
          "selected": true,
          "text": "All",
          "value": "$__all"
        },
        "datasource": {
          "type": "prometheus",
          "uid": "prometheus-metrics-backend"
        },
        "definition": "label_values(k6_http_reqs_total, testid)",
        "hide": 0,
        "includeAll": true,
        "label": "Prueba k6",
        "multi": true,
        "name": "testid",
        "options": [],
        "query": {
          "query": "label_values(k6_http_reqs_total, testid)",
          "refId": "StandardVariableQuery"
        },
        "refresh": 1,
        "regex": "",
        "skipUrlSync": false,
        "sort": 1,
        "type": "query"
      }
    ]
  },
  "time": {
    "from": "now-15m",
    "to": "now"
  },
  "timepicker": {},
  "timezone": "browser",
  "title": "k6 - Game Store",
  "uid": "game-store-k6",
  "version": 1,
  "weekStart": ""
}