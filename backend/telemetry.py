import os
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

import logging
#cambie este import porque un warning de que era obsolote
from pythonjsonlogger.json import JsonFormatter
from flask import request



from routes import _get_current_user

def format_trace_id(tid):
    return format(tid, "032x")

def format_span_id(sid):
    return format(sid, "016x")

def setup_telemetry(app):
    resource = Resource.create({
        "service.name": os.environ.get("OTEL_SERVICE_NAME", "game-store-api"),
        "service.version": "1.0.0",
        "deployment.environment": os.environ.get("FLASK_ENV", "development"),
    })

    endpoint = os.environ.get(
        "OTEL_EXPORTER_OTLP_ENDPOINT",
        "http://alloy:4317",
    )

    provider = TracerProvider(resource=resource)
    provider.add_span_processor(
    BatchSpanProcessor(
        OTLPSpanExporter(endpoint, insecure = True),
        max_queue_size=1024,
        max_export_batch_size=256,
        schedule_delay_millis=2000
    )
    )
    trace.set_tracer_provider(provider)

    FlaskInstrumentor().instrument_app(app)
    SQLAlchemyInstrumentor().instrument()

def setup_logging(app):
    handler = logging.StreamHandler()
    formatter = JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s %(trace_id)s %(span_id)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
    handler.setFormatter(formatter)
    app.logger.addHandler(handler)
    app.logger.setLevel(logging.INFO)

    # También para loggers de SQLAlchemy y werkzeug
    for logger_name in ("sqlalchemy.engine", "werkzeug"):
        log = logging.getLogger(logger_name)
        log.addHandler(handler)
        log.setLevel(logging.WARNING)

    @app.before_request
    def log_request():
        span = trace.get_current_span()
        span_context = span.get_span_context()
        trace_id = format_trace_id(span_context.trace_id) if span_context.is_valid else None
        span_id = format_span_id(span_context.span_id) if span_context.is_valid else None
        user = _get_current_user()

        app.logger.info(
            "Request",
            extra={
                "trace_id": trace_id,
                "span_id": span_id,
                "correlation_id": request.headers.get("X-Correlation-ID"),
                "user": user,
                "endpoint": request.path,
                "method": request.method,
            },
        )