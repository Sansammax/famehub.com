# FameHub Platform Monitoring & Observability Reference

FameHub includes built-in telemetry using **Prometheus** metrics scraping and a pre-configured **Grafana** dashboard.

## Metrics Endpoint
The Express server exposes a scrape endpoint at `/metrics`. This endpoint lists:
- **Default metrics**: CPU consumption, event loop lag, memory leaks, garbage collection intervals, and heap states.
- **Custom HTTP metrics**: Total HTTP requests (`http_requests_total`), request duration histograms (`http_request_duration_seconds`).
- **Live web connections**: Active socket connections gauge (`websocket_active_connections`).
- **Downstream dependencies connectivity**: Health indicators representing Database, Redis cache, and Kafka brokers (`database_up`, `redis_up`, `kafka_up`).

## Setup Prometheus and Grafana

To visualize metrics, deploy a Prometheus and Grafana stack:

### 1. Configure Prometheus Scraping Target
Create a `prometheus.yml` configuration:
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'famehub-lms'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['backend:5000']
```

### 2. Import the Grafana Dashboard
1. Open Grafana in your browser.
2. Navigate to **Dashboards** -> **Import**.
3. Copy and paste the contents of `monitoring/grafana-dashboard.json`.
4. Select your Prometheus data source.
5. The dashboard will populate charts displaying HTTP request rates, database/cache availability, and live active classrooms.
