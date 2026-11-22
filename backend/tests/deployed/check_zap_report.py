#!/usr/bin/env python3
"""Valida el reporte JSON de ZAP y falla ante hallazgos de riesgo alto.

Uso::

    python backend/tests/deployed/check_zap_report.py results/backend/zap-report.json

Por defecto solo los hallazgos **High** bloquean el pipeline. Los Medium se
reportan en el resumen y, si se define ``ZAP_FAIL_ON_MEDIUM=true``, también
hacen fallar la verificación.

``ZAP_IGNORE_ALERTS`` permite una lista separada por comas de nombres de
alertas aceptadas explícitamente (por ejemplo, una regla que no aplica a este
sistema).
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import NoReturn

RISK_NAMES = {
    "3": "High",
    "2": "Medium",
    "1": "Low",
    "0": "Informational",
}


def _fail(message: str) -> NoReturn:
    print(f"[zap] ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def _alerts_from_report(document: dict) -> list[dict]:
    """Acepta tanto el formato ``site`` como una lista directa de alertas."""

    alerts: list[dict] = []
    sites = document.get("site")
    if isinstance(sites, list):
        for site in sites:
            alerts.extend(site.get("alerts", []) or [])
    elif isinstance(document.get("alerts"), list):
        alerts.extend(document["alerts"])
    return alerts


def main(argv: list[str]) -> int:
    report_path = Path(argv[1]) if len(argv) > 1 else Path(
        "results/backend/zap-report.json"
    )

    if not report_path.is_file():
        _fail(f"No existe el reporte de ZAP: {report_path}")

    try:
        document = json.loads(report_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        _fail(f"El reporte de ZAP no es JSON válido: {error}")

    ignore = {
        item.strip().lower()
        for item in os.getenv("ZAP_IGNORE_ALERTS", "").split(",")
        if item.strip()
    }
    fail_on_medium = os.getenv("ZAP_FAIL_ON_MEDIUM", "false").lower() in {
        "1",
        "true",
        "yes",
    }

    counts = {name: 0 for name in RISK_NAMES.values()}
    blocking: list[dict] = []

    for alert in _alerts_from_report(document):
        name = (alert.get("alert") or alert.get("name") or "").strip()
        if name.lower() in ignore:
            continue

        risk_code = str(alert.get("riskcode", "0"))
        risk_name = RISK_NAMES.get(risk_code, f"Unknown({risk_code})")
        counts[risk_name] = counts.get(risk_name, 0) + 1

        if risk_code == "3" or (fail_on_medium and risk_code == "2"):
            blocking.append(
                {
                    "name": name,
                    "risk": risk_name,
                    "count": alert.get("count", len(alert.get("instances", []))),
                    "url": (alert.get("instances") or [{}])[0].get("uri", ""),
                }
            )

    lines = [
        "## Reporte ZAP",
        "",
        f"- High: {counts.get('High', 0)}",
        f"- Medium: {counts.get('Medium', 0)}",
        f"- Low: {counts.get('Low', 0)}",
        f"- Informational: {counts.get('Informational', 0)}",
    ]

    if blocking:
        lines.extend(["", "### Hallazgos bloqueantes", ""])
        for item in blocking:
            lines.append(
                f"- **{item['risk']}** — {item['name']} "
                f"({item['count']} instancia(s)) {item['url']}"
            )

    summary = "\n".join(lines) + "\n"
    print(summary)

    summary_path = os.getenv("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as handle:
            handle.write(summary)

    if blocking:
        _fail(f"ZAP encontró {len(blocking)} alerta(s) bloqueante(s)")

    print("[zap] Sin hallazgos bloqueantes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
