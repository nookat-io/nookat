# [TECH-013] Implement monitoring and observability infrastructure

## Overview

Implement comprehensive monitoring and observability infrastructure including application monitoring, performance metrics, structured logging, distributed tracing, and health checks to ensure system reliability and performance.

## Description

The application needs comprehensive monitoring and observability to track performance, detect issues early, and provide insights into system behavior. We need to implement application monitoring, structured logging, metrics collection, distributed tracing, and health checks across both frontend and backend.

## Technical Requirements

### Application Monitoring

- Implement React Profiler and performance metrics
- Add Sentry integration with enhanced breadcrumbs
- Create feature usage tracking and analytics
- Implement user behavior monitoring
- Add performance benchmarking
- Create monitoring dashboards

### Backend Observability

- Implement structured logging with `tracing`
- Add Prometheus metrics for Docker operations
- Implement distributed tracing across Tauri boundaries
- Create log aggregation and filtering
- Add performance profiling
- Implement resource monitoring

### Health Checks and Monitoring

- Docker daemon connectivity monitoring
- Application health endpoints
- Automated recovery mechanisms
- Resource usage monitoring
- Performance threshold alerts
- System status reporting

### Metrics and Analytics

- Performance metrics collection
- Error rate monitoring
- User experience metrics
- Business metrics tracking
- Trend analysis and reporting
- Alerting and notifications

## Acceptance Criteria

### Functional Requirements

- [ ] React Profiler and performance monitoring operational
- [ ] Enhanced Sentry integration working
- [ ] Structured logging system functional
- [ ] Metrics collection and reporting working
- [ ] Health checks and monitoring operational
- [ ] Distributed tracing implemented
- [ ] Monitoring dashboards created

### Non-Functional Requirements

- [ ] Performance monitoring adds <5% overhead
- [ ] Logging latency <100ms
- [ ] Metrics collection <200ms
- [ ] Health check response <500ms
- [ ] Monitoring dashboard loads <2 seconds

### Quality Requirements

- [ ] 100% critical operations monitored
- [ ] All errors properly logged and tracked
- [ ] Performance metrics accurate and reliable
- [ ] Health checks cover all critical services
- [ ] Monitoring provides actionable insights

## Technical Implementation

### Frontend Performance Monitoring

```typescript
// src/lib/performance-monitor.ts
import { Profiler, ProfilerOnRenderCallback } from 'react';
import * as Sentry from '@sentry/react';

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  commitTime: number;
  interactions: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private isEnabled: boolean = process.env.NODE_ENV === 'production';

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }

  onRender: ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
    interactions
  ) => {
    if (!this.isEnabled) return;

    const metric: PerformanceMetrics = {
      componentName: id,
      renderTime: actualDuration,
      commitTime: commitTime - startTime,
      interactions: interactions.length,
      timestamp: Date.now(),
    };

    this.metrics.push(metric);

    // Report slow renders to Sentry
    if (actualDuration > 16) { // 60fps threshold
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `Slow render detected: ${id}`,
        level: 'warning',
        data: {
          component: id,
          renderTime: actualDuration,
          threshold: 16,
        },
      });
    }

    // Send metrics to analytics
    this.sendMetrics(metric);
  };

  private sendMetrics(metric: PerformanceMetrics) {
    // Send to analytics service
    if (window.gtag) {
      window.gtag('event', 'component_render', {
        component_name: metric.componentName,
        render_time: metric.renderTime,
        commit_time: metric.commitTime,
        interactions: metric.interactions,
      });
    }
  }

  getMetrics() {
    return this.metrics;
  }

  getSlowComponents(threshold: number = 16) {
    return this.metrics.filter(m => m.renderTime > threshold);
  }

  clearMetrics() {
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

// HOC for performance monitoring
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  return (props: P) => (
    <Profiler id={componentName} onRender={performanceMonitor.onRender}>
      <Component {...props} />
    </Profiler>
  );
};
```

### Enhanced Sentry Integration

```typescript
// src/lib/sentry-enhanced.ts
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export const initializeSentry = () => {
  Sentry.init({
    dsn: process.env.VITE_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.VITE_APP_VERSION,

    // Performance monitoring
    integrations: [
      new BrowserTracing({
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          history => history.listen
        ),
        tracingOrigins: ['localhost', '127.0.0.1', /^\//],
      }),
    ],

    // Performance sampling
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session tracking
    autoSessionTracking: true,

    // Error sampling
    sampleRate: 1.0,

    // Breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      // Filter out sensitive information
      if (breadcrumb.category === 'http') {
        delete breadcrumb.data?.url;
        delete breadcrumb.data?.method;
      }
      return breadcrumb;
    },

    // Error filtering
    beforeSend(event) {
      // Filter out certain error types
      if (event.exception?.values?.[0]?.type === 'NetworkError') {
        return null;
      }
      return event;
    },
  });
};

// Enhanced error reporting
export const reportError = (
  error: Error,
  context?: Record<string, any>,
  tags?: Record<string, string>
) => {
  Sentry.withScope(scope => {
    if (context) {
      scope.setContext('error_context', context);
    }
    if (tags) {
      Object.entries(tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    Sentry.captureException(error);
  });
};

// Performance monitoring
export const startTransaction = (name: string, operation: string) => {
  return Sentry.startTransaction({
    name,
    op: operation,
  });
};

// User context
export const setUserContext = (user: {
  id: string;
  email?: string;
  username?: string;
}) => {
  Sentry.setUser(user);
};

// Custom breadcrumbs
export const addBreadcrumb = (
  message: string,
  category: string,
  data?: Record<string, any>
) => {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
};
```

### Backend Structured Logging

```rust
// src-tauri/src/logging.rs
use tracing::{info, warn, error, debug, trace};
use tracing_subscriber::{
    fmt::{self, time::UtcTime},
    EnvFilter, Layer,
};
use tracing_appender::rolling::{RollingFileAppender, Rotation};
use std::path::Path;

pub struct LoggingConfig {
    pub log_level: String,
    pub log_file: Option<String>,
    pub enable_console: bool,
    pub enable_file: bool,
}

impl Default for LoggingConfig {
    fn default() -> Self {
        Self {
            log_level: "info".to_string(),
            log_file: None,
            enable_console: true,
            enable_file: false,
        }
    }
}

pub fn initialize_logging(config: LoggingConfig) -> Result<(), Box<dyn std::error::Error>> {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(&config.log_level));

    let mut layers: Vec<Box<dyn Layer<_> + Send + Sync>> = Vec::new();

    // Console logging
    if config.enable_console {
        let console_layer = fmt::layer()
            .with_timer(UtcTime::rfc_3339())
            .with_target(true)
            .with_thread_ids(true)
            .with_thread_names(true)
            .with_file(true)
            .with_line_number(true)
            .with_ansi(true);

        layers.push(Box::new(console_layer));
    }

    // File logging
    if config.enable_file {
        if let Some(log_file) = config.log_file {
            let file_appender = RollingFileAppender::new(
                Rotation::DAILY,
                Path::new(&log_file).parent().unwrap_or(Path::new(".")),
                Path::new(&log_file).file_name().unwrap().to_str().unwrap(),
            );

            let file_layer = fmt::layer()
                .with_timer(UtcTime::rfc_3339())
                .with_target(true)
                .with_thread_ids(true)
                .with_thread_names(true)
                .with_file(true)
                .with_line_number(true)
                .with_ansi(false)
                .with_writer(file_appender);

            layers.push(Box::new(file_layer));
        }
    }

    // Initialize tracing subscriber
    tracing_subscriber::registry()
        .with(env_filter)
        .with(layers)
        .init();

    info!("Logging initialized with level: {}", config.log_level);
    Ok(())
}

// Structured logging macros
#[macro_export]
macro_rules! log_operation {
    ($operation:expr, $($arg:tt)*) => {
        info!(
            operation = $operation,
            $($arg)*
        );
    };
}

#[macro_export]
macro_rules! log_error {
    ($operation:expr, $error:expr, $($arg:tt)*) => {
        error!(
            operation = $operation,
            error = %$error,
            $($arg)*
        );
    };
}

#[macro_export]
macro_rules! log_performance {
    ($operation:expr, $duration:expr, $($arg:tt)*) => {
        info!(
            operation = $operation,
            duration_ms = $duration,
            $($arg)*
        );
    };
}

// Performance monitoring
pub fn measure_operation<T, F>(operation: &str, f: F) -> Result<T, Box<dyn std::error::Error>>
where
    F: FnOnce() -> Result<T, Box<dyn std::error::Error>>,
{
    let start = std::time::Instant::now();

    log_operation!(operation, status = "started");

    let result = f();

    let duration = start.elapsed();
    let duration_ms = duration.as_millis();

    match &result {
        Ok(_) => {
            log_performance!(operation, duration_ms, status = "completed");
        }
        Err(e) => {
            log_error!(operation, e, duration_ms = duration_ms, status = "failed");
        }
    }

    result
}
```

### Health Check System

```rust
// src-tauri/src/health.rs
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{Duration, Instant};
use tokio::time::timeout;

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthStatus {
    pub status: HealthState,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub checks: HashMap<String, HealthCheck>,
    pub version: String,
    pub uptime: Duration,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub enum HealthState {
    Healthy,
    Degraded,
    Unhealthy,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthCheck {
    pub status: HealthState,
    pub message: String,
    pub duration: Duration,
    pub last_check: chrono::DateTime<chrono::Utc>,
    pub error: Option<String>,
}

pub struct HealthChecker {
    start_time: Instant,
    checks: HashMap<String, Box<dyn HealthCheckable>>,
}

impl HealthChecker {
    pub fn new() -> Self {
        Self {
            start_time: Instant::now(),
            checks: HashMap::new(),
        }
    }

    pub fn add_check(&mut self, name: String, check: Box<dyn HealthCheckable>) {
        self.checks.insert(name, check);
    }

    pub async fn run_checks(&self) -> HealthStatus {
        let mut health_checks = HashMap::new();
        let mut overall_status = HealthState::Healthy;

        for (name, check) in &self.checks {
            let check_result = check.run().await;

            if check_result.status == HealthState::Unhealthy {
                overall_status = HealthState::Unhealthy;
            } else if check_result.status == HealthState::Degraded && overall_status == HealthState::Healthy {
                overall_status = HealthState::Degraded;
            }

            health_checks.insert(name.clone(), check_result);
        }

        HealthStatus {
            status: overall_status,
            timestamp: chrono::Utc::now(),
            checks: health_checks,
            version: env!("CARGO_PKG_VERSION").to_string(),
            uptime: self.start_time.elapsed(),
        }
    }
}

#[async_trait::async_trait]
pub trait HealthCheckable: Send + Sync {
    async fn run(&self) -> HealthCheck;
}

// Docker daemon health check
pub struct DockerHealthCheck;

#[async_trait::async_trait]
impl HealthCheckable for DockerHealthCheck {
    async fn run(&self) -> HealthCheck {
        let start = Instant::now();

        // Check Docker daemon connectivity
        let result = timeout(Duration::from_secs(5), check_docker_daemon()).await;

        let duration = start.elapsed();
        let (status, message, error) = match result {
            Ok(Ok(_)) => (HealthState::Healthy, "Docker daemon is accessible", None),
            Ok(Err(e)) => (HealthState::Degraded, "Docker daemon check failed", Some(e.to_string())),
            Err(_) => (HealthState::Unhealthy, "Docker daemon check timeout", Some("Timeout".to_string())),
        };

        HealthCheck {
            status,
            message: message.to_string(),
            duration,
            last_check: chrono::Utc::now(),
            error,
        }
    }
}

async fn check_docker_daemon() -> Result<(), Box<dyn std::error::Error>> {
    // Implement Docker daemon connectivity check
    // This would use the bollard crate to check Docker API
    Ok(())
}

// System resource health check
pub struct SystemResourceCheck;

#[async_trait::async_trait]
impl HealthCheckable for SystemResourceCheck {
    async fn run(&self) -> HealthCheck {
        let start = Instant::now();

        // Check system resources (CPU, memory, disk)
        let (status, message, error) = check_system_resources().await;

        let duration = start.elapsed();

        HealthCheck {
            status,
            message: message.to_string(),
            duration,
            last_check: chrono::Utc::now(),
            error,
        }
    }
}

async fn check_system_resources() -> (HealthState, &'static str, Option<String>) {
    // Implement system resource checks
    // This would check CPU usage, memory usage, disk space, etc.
    (HealthState::Healthy, "System resources are normal", None)
}
```

### Metrics Collection

```rust
// src-tauri/src/metrics.rs
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use std::time::{Duration, Instant};

#[derive(Debug, Clone)]
pub struct Metric {
    pub name: String,
    pub value: f64,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub labels: HashMap<String, String>,
}

#[derive(Debug, Clone)]
pub struct Counter {
    pub name: String,
    pub value: u64,
    pub labels: HashMap<String, String>,
}

#[derive(Debug, Clone)]
pub struct Histogram {
    pub name: String,
    pub buckets: Vec<f64>,
    pub counts: Vec<u64>,
    pub sum: f64,
    pub count: u64,
    pub labels: HashMap<String, String>,
}

pub struct MetricsCollector {
    metrics: Arc<RwLock<Vec<Metric>>>,
    counters: Arc<RwLock<HashMap<String, Counter>>>,
    histograms: Arc<RwLock<HashMap<String, Histogram>>>,
}

impl MetricsCollector {
    pub fn new() -> Self {
        Self {
            metrics: Arc::new(RwLock::new(Vec::new())),
            counters: Arc::new(RwLock::new(HashMap::new())),
            histograms: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn record_gauge(&self, name: &str, value: f64, labels: HashMap<String, String>) {
        let metric = Metric {
            name: name.to_string(),
            value,
            timestamp: chrono::Utc::now(),
            labels,
        };

        let mut metrics = self.metrics.write().await;
        metrics.push(metric);

        // Keep only last 1000 metrics
        if metrics.len() > 1000 {
            metrics.drain(0..metrics.len() - 1000);
        }
    }

    pub async fn increment_counter(&self, name: &str, labels: HashMap<String, String>) {
        let mut counters = self.counters.write().await;
        let key = format!("{}:{}", name, serde_json::to_string(&labels).unwrap());

        counters.entry(key).and_modify(|c| c.value += 1).or_insert(Counter {
            name: name.to_string(),
            value: 1,
            labels,
        });
    }

    pub async fn record_histogram(&self, name: &str, value: f64, labels: HashMap<String, String>) {
        let mut histograms = self.histograms.write().await;
        let key = format!("{}:{}", name, serde_json::to_string(&labels).unwrap());

        let histogram = histograms.entry(key.clone()).or_insert_with(|| Histogram {
            name: name.to_string(),
            buckets: vec![0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0],
            counts: vec![0; 8],
            sum: 0.0,
            count: 0,
            labels,
        });

        histogram.sum += value;
        histogram.count += 1;

        // Update bucket counts
        for (i, bucket) in histogram.buckets.iter().enumerate() {
            if value <= *bucket {
                histogram.counts[i] += 1;
                break;
            }
        }
    }

    pub async fn get_metrics(&self) -> Vec<Metric> {
        let metrics = self.metrics.read().await;
        metrics.clone()
    }

    pub async fn get_counters(&self) -> Vec<Counter> {
        let counters = self.counters.read().await;
        counters.values().cloned().collect()
    }

    pub async fn get_histograms(&self) -> Vec<Histogram> {
        let histograms = self.histograms.read().await;
        histograms.values().cloned().collect()
    }

    pub async fn export_prometheus(&self) -> String {
        let mut output = String::new();

        // Export counters
        let counters = self.counters.read().await;
        for counter in counters.values() {
            let labels = counter.labels.iter()
                .map(|(k, v)| format!("{}=\"{}\"", k, v))
                .collect::<Vec<_>>()
                .join(",");

            if !labels.is_empty() {
                output.push_str(&format!("{}_total{{{}}} {}\n", counter.name, labels, counter.value));
            } else {
                output.push_str(&format!("{}_total {}\n", counter.name, counter.value));
            }
        }

        // Export histograms
        let histograms = self.histograms.read().await;
        for histogram in histograms.values() {
            let labels = histogram.labels.iter()
                .map(|(k, v)| format!("{}=\"{}\"", k, v))
                .collect::<Vec<_>>()
                .join(",");

            let label_suffix = if !labels.is_empty() { format!("{{{}}}", labels) } else { String::new() };

            output.push_str(&format!("{}_sum{} {}\n", histogram.name, label_suffix, histogram.sum));
            output.push_str(&format!("{}_count{} {}\n", histogram.name, label_suffix, histogram.count));

            for (i, bucket) in histogram.buckets.iter().enumerate() {
                output.push_str(&format!("{}_bucket{}le=\"{}\" {}\n",
                    histogram.name, label_suffix, bucket, histogram.counts[i]));
            }
        }

        output
    }
}

// Global metrics collector
lazy_static::lazy_static! {
    pub static ref METRICS: MetricsCollector = MetricsCollector::new();
}

// Convenience macros for metrics
#[macro_export]
macro_rules! record_gauge {
    ($name:expr, $value:expr) => {
        $crate::metrics::METRICS.record_gauge($name, $value, HashMap::new()).await;
    };

    ($name:expr, $value:expr, $labels:expr) => {
        $crate::metrics::METRICS.record_gauge($name, $value, $labels).await;
    };
}

#[macro_export]
macro_rules! increment_counter {
    ($name:expr) => {
        $crate::metrics::METRICS.increment_counter($name, HashMap::new()).await;
    };

    ($name:expr, $labels:expr) => {
        $crate::metrics::METRICS.increment_counter($name, $labels).await;
    };
}

#[macro_export]
macro_rules! record_histogram {
    ($name:expr, $value:expr) => {
        $crate::metrics::METRICS.record_histogram($name, $value, HashMap::new()).await;
    };

    ($name:expr, $value:expr, $labels:expr) => {
        $crate::metrics::METRICS.record_histogram($name, $value, $labels).await;
    };
}
```

## Dependencies

- React Profiler for performance monitoring
- Enhanced Sentry integration
- Tracing for structured logging
- Metrics collection system
- Health check framework
- Monitoring dashboards

## Definition of Done

- [ ] React Profiler and performance monitoring operational
- [ ] Enhanced Sentry integration working
- [ ] Structured logging system functional
- [ ] Metrics collection and reporting working
- [ ] Health checks and monitoring operational
- [ ] Distributed tracing implemented
- [ ] Monitoring dashboards created
- [ ] Team training on monitoring tools completed

## Notes

- Implement monitoring incrementally starting with critical metrics
- Focus on actionable insights rather than just data collection
- Consider implementing alerting and notification systems
- Establish monitoring and observability guidelines for the team
- Monitor the monitoring system itself for reliability
