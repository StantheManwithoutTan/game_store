#!/usr/bin/env python3
"""Resume los resultados de la verificación del ambiente.

Se ejecuta en el job ``report`` después de descargar los artefactos. Lee los
JUnit XML de ``results/backend`` y ``results/frontend``, escribe una tabla en
``$GITHUB_STEP_SUMMARY`` y falla si algún reporte contiene fallos o errores.

Uso::

    python backend/tests/deployed/summarize_results.py results
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from xml.etree import ElementTree


def _junit_summary(path: Path) -> dict:
    """Cuenta testcases y estados de un archivo JUnit."""

    root = ElementTree.parse(path).getroot()
    total = failures = errors = skipped = 0
    duration = 0.0

    for testcase in root.iter("testcase"):
        total += 1
        try:
            duration += float(testcase.get("time", "0") or 0)
        except ValueError:
            pass

        if testcase.find("failure") is not None:
            failures += 1
        elif testcase.find("error") is not None:
            errors += 1
        elif testcase.find("skipped") is not None:
            skipped += 1

    # Algunos reporters escriben los totales solo en el testsuite.
    if total == 0:
        suites = list(root.iter("testsuite"))
        total = sum(int(suite.get("tests", "0") or 0) for suite in suites)
        failures = sum(int(suite.get("failures", "0") or 0) for suite in suites)
        errors = sum(int(suite.get("errors", "0") or 0) for suite in suites)
        skipped = sum(int(suite.get("skipped", "0") or 0) for suite in suites)

    return {
        "file": path.name,
        "tests": total,
        "failures": failures,
        "errors": errors,
        "skipped": skipped,
        "duration": duration,
        "ok": failures == 0 and errors == 0,
    }


def _zap_summary(path: Path) -> dict | None:
    """Resume el reporte JSON de ZAP si existe."""

    if not path.is_file():
        return None

    try:
        document = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {"file": path.name, "error": "JSON inválido"}

    counts = {"High": 0, "Medium": 0, "Low": 0, "Informational": 0}
    risk_names = {"3": "High", "2": "Medium", "1": "Low", "0": "Informational"}

    sites = document.get("site", [])
    alerts = []
    if isinstance(sites, list):
        for site in sites:
            alerts.extend(site.get("alerts", []) or [])
    elif isinstance(document.get("alerts"), list):
        alerts = document["alerts"]

    for alert in alerts:
        name = risk_names.get(str(alert.get("riskcode", "0")), "Informational")
        counts[name] += 1

    return {"file": path.name, **counts}


def main(argv: list[str]) -> int:
    results_root = Path(argv[1]) if len(argv) > 1 else Path("results")

    junit_files = sorted(results_root.glob("backend/*.xml")) + sorted(
        results_root.glob("frontend/*.xml")
    )
    # Excluir reportes que no sean JUnit (por ejemplo, un XML de ZAP).
    junit_files = [
        path
        for path in junit_files
        if path.name.endswith("-junit.xml") or path.name == "junit.xml"
    ]

    summaries: list[dict] = []
    for path in junit_files:
        try:
            summaries.append(_junit_summary(path))
        except ElementTree.ParseError as error:
            summaries.append(
                {
                    "file": path.name,
                    "tests": 0,
                    "failures": 0,
                    "errors": 1,
                    "skipped": 0,
                    "duration": 0.0,
                    "ok": False,
                    "parse_error": str(error),
                }
            )

    zap = _zap_summary(results_root / "backend" / "zap-report.json")

    lines = ["## Verificación del ambiente", ""]

    if summaries:
        lines.extend(
            [
                "| Reporte | Tests | Fallos | Errores | Omitidos | Duración | Estado |",
                "|---|---:|---:|---:|---:|---:|---|",
            ]
        )
        for item in summaries:
            state = "✅ OK" if item["ok"] else "❌ FALLÓ"
            lines.append(
                f"| {item['file']} | {item['tests']} | {item['failures']} | "
                f"{item['errors']} | {item['skipped']} | "
                f"{item['duration']:.1f}s | {state} |"
            )
    else:
        lines.append("⚠️ No se encontraron reportes JUnit.")

    if zap:
        lines.extend(
            [
                "",
                "### ZAP",
                "",
                f"- High: {zap.get('High', 0)}",
                f"- Medium: {zap.get('Medium', 0)}",
                f"- Low: {zap.get('Low', 0)}",
                f"- Informational: {zap.get('Informational', 0)}",
            ]
        )

    observability = results_root / "backend" / "observability.txt"
    if observability.is_file():
        lines.extend(
            [
                "",
                "### Observabilidad",
                "",
                f"Archivo `{observability.name}` descargado "
                f"({observability.stat().st_size} bytes).",
            ]
        )

    markdown = "\n".join(lines) + "\n"
    print(markdown)

    summary_path = os.getenv("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as handle:
            handle.write(markdown)

    failed = [item for item in summaries if not item["ok"]]
    if failed:
        print(
            f"[report] {len(failed)} reporte(s) con fallos: "
            + ", ".join(item["file"] for item in failed),
            file=sys.stderr,
        )
        return 1

    if not summaries:
        print("[report] No hay reportes JUnit para resumir (modo smoke).", file=sys.stderr)
        # En modo smoke no hay reportes JUnit; no es error.
        return 0

    print("[report] Todos los reportes JUnit están en verde.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
