/**
 * Monitoring Service
 * Service de Surveillance
 * 
 * System monitoring with:
 * - Track API calls and response times
 * - Log errors and warnings
 * - Monitor system health
 * - Generate usage reports
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: [],
      errors: [],
      performance: [],
      systemHealth: []
    };
    
    this.aggregatedStats = {
      totalRequests: 0,
      totalErrors: 0,
      avgResponseTime: 0,
      requestsByEndpoint: {},
      requestsByStatus: {},
      errorsByType: {}
    };

    this.maxMetricsSize = 10000;
    this.healthCheckInterval = null;
    
    // Start health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Track API request
   * @param {object} requestInfo - Request information
   */
  trackRequest(requestInfo) {
    const metric = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      method: requestInfo.method,
      endpoint: requestInfo.endpoint,
      statusCode: requestInfo.statusCode,
      responseTime: requestInfo.responseTime,
      userAgent: requestInfo.userAgent,
      ip: requestInfo.ip,
      query: requestInfo.query,
      success: requestInfo.statusCode < 400
    };

    this.metrics.requests.unshift(metric);
    this.trimMetrics('requests');
    this.updateAggregatedStats(metric);

    return metric;
  }

  /**
   * Track error
   * @param {object} errorInfo - Error information
   */
  trackError(errorInfo) {
    const error = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: errorInfo.type || 'UNKNOWN',
      message: errorInfo.message,
      stack: errorInfo.stack,
      endpoint: errorInfo.endpoint,
      method: errorInfo.method,
      statusCode: errorInfo.statusCode,
      userId: errorInfo.userId,
      context: errorInfo.context
    };

    this.metrics.errors.unshift(error);
    this.trimMetrics('errors');
    
    this.aggregatedStats.totalErrors++;
    this.aggregatedStats.errorsByType[error.type] = 
      (this.aggregatedStats.errorsByType[error.type] || 0) + 1;

    // Log critical errors
    if (errorInfo.statusCode >= 500) {
      console.error(`[CRITICAL ERROR] ${error.type}: ${error.message}`);
    }

    return error;
  }

  /**
   * Track performance metric
   * @param {object} perfInfo - Performance information
   */
  trackPerformance(perfInfo) {
    const perf = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      operation: perfInfo.operation,
      duration: perfInfo.duration,
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: os.loadavg()[0],
      details: perfInfo.details
    };

    this.metrics.performance.unshift(perf);
    this.trimMetrics('performance');

    return perf;
  }

  /**
   * Update aggregated statistics
   */
  updateAggregatedStats(metric) {
    this.aggregatedStats.totalRequests++;
    
    // Update by endpoint
    this.aggregatedStats.requestsByEndpoint[metric.endpoint] = 
      (this.aggregatedStats.requestsByEndpoint[metric.endpoint] || 0) + 1;
    
    // Update by status
    const statusGroup = `${Math.floor(metric.statusCode / 100)}xx`;
    this.aggregatedStats.requestsByStatus[statusGroup] = 
      (this.aggregatedStats.requestsByStatus[statusGroup] || 0) + 1;
    
    // Update average response time (rolling average)
    const n = this.aggregatedStats.totalRequests;
    this.aggregatedStats.avgResponseTime = 
      ((this.aggregatedStats.avgResponseTime * (n - 1)) + metric.responseTime) / n;
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    this.healthCheckInterval = setInterval(() => {
      this.recordSystemHealth();
    }, 60000); // Every minute
  }

  /**
   * Record system health
   */
  recordSystemHealth() {
    const health = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usagePercent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
      },
      cpu: {
        loadAvg: os.loadavg(),
        cores: os.cpus().length
      },
      process: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        pid: process.pid
      },
      status: this.determineHealthStatus()
    };

    this.metrics.systemHealth.unshift(health);
    this.trimMetrics('systemHealth', 1440); // Keep 24 hours of minute-by-minute data

    return health;
  }

  /**
   * Determine overall health status
   */
  determineHealthStatus() {
    const memUsage = (os.totalmem() - os.freemem()) / os.totalmem();
    const cpuLoad = os.loadavg()[0] / os.cpus().length;
    const recentErrors = this.metrics.errors.filter(e => 
      new Date(e.timestamp) > new Date(Date.now() - 5 * 60 * 1000)
    ).length;

    if (memUsage > 0.9 || cpuLoad > 0.9 || recentErrors > 10) {
      return 'critical';
    }
    if (memUsage > 0.7 || cpuLoad > 0.7 || recentErrors > 5) {
      return 'warning';
    }
    return 'healthy';
  }

  /**
   * Get current system status
   */
  getSystemStatus() {
    const latestHealth = this.metrics.systemHealth[0] || this.recordSystemHealth();
    const recentRequests = this.metrics.requests.slice(0, 100);
    const recentErrors = this.metrics.errors.slice(0, 20);

    return {
      status: latestHealth.status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: latestHealth.memory,
      cpu: latestHealth.cpu,
      requests: {
        total: this.aggregatedStats.totalRequests,
        recent: recentRequests.length,
        avgResponseTime: this.aggregatedStats.avgResponseTime.toFixed(2) + 'ms'
      },
      errors: {
        total: this.aggregatedStats.totalErrors,
        recent: recentErrors.length,
        byType: this.aggregatedStats.errorsByType
      }
    };
  }

  /**
   * Get API usage statistics
   */
  getAPIUsageStats(options = {}) {
    const { startDate, endDate, endpoint } = options;
    
    let requests = [...this.metrics.requests];
    
    // Filter by date range
    if (startDate) {
      requests = requests.filter(r => new Date(r.timestamp) >= new Date(startDate));
    }
    if (endDate) {
      requests = requests.filter(r => new Date(r.timestamp) <= new Date(endDate));
    }
    if (endpoint) {
      requests = requests.filter(r => r.endpoint.includes(endpoint));
    }

    // Calculate statistics
    const stats = {
      totalRequests: requests.length,
      successfulRequests: requests.filter(r => r.success).length,
      failedRequests: requests.filter(r => !r.success).length,
      avgResponseTime: requests.length > 0 
        ? (requests.reduce((sum, r) => sum + r.responseTime, 0) / requests.length).toFixed(2)
        : 0,
      byEndpoint: {},
      byMethod: {},
      byStatus: {},
      byHour: {},
      responseTimeDistribution: {
        fast: requests.filter(r => r.responseTime < 100).length,
        normal: requests.filter(r => r.responseTime >= 100 && r.responseTime < 500).length,
        slow: requests.filter(r => r.responseTime >= 500 && r.responseTime < 1000).length,
        verySlow: requests.filter(r => r.responseTime >= 1000).length
      }
    };

    // Group by endpoint
    requests.forEach(r => {
      stats.byEndpoint[r.endpoint] = (stats.byEndpoint[r.endpoint] || 0) + 1;
      stats.byMethod[r.method] = (stats.byMethod[r.method] || 0) + 1;
      stats.byStatus[r.statusCode] = (stats.byStatus[r.statusCode] || 0) + 1;
      
      const hour = new Date(r.timestamp).getHours();
      stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
    });

    return stats;
  }

  /**
   * Get error statistics
   */
  getErrorStats(options = {}) {
    const { startDate, endDate, type } = options;
    
    let errors = [...this.metrics.errors];
    
    if (startDate) {
      errors = errors.filter(e => new Date(e.timestamp) >= new Date(startDate));
    }
    if (endDate) {
      errors = errors.filter(e => new Date(e.timestamp) <= new Date(endDate));
    }
    if (type) {
      errors = errors.filter(e => e.type === type);
    }

    return {
      totalErrors: errors.length,
      byType: errors.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {}),
      byEndpoint: errors.reduce((acc, e) => {
        if (e.endpoint) {
          acc[e.endpoint] = (acc[e.endpoint] || 0) + 1;
        }
        return acc;
      }, {}),
      byStatusCode: errors.reduce((acc, e) => {
        if (e.statusCode) {
          acc[e.statusCode] = (acc[e.statusCode] || 0) + 1;
        }
        return acc;
      }, {}),
      recentErrors: errors.slice(0, 10)
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(options = {}) {
    const { operation, limit = 100 } = options;
    
    let perfs = [...this.metrics.performance];
    
    if (operation) {
      perfs = perfs.filter(p => p.operation === operation);
    }

    perfs = perfs.slice(0, limit);

    if (perfs.length === 0) {
      return { message: 'No performance data available' };
    }

    const durations = perfs.map(p => p.duration);
    
    return {
      count: perfs.length,
      avgDuration: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p50: this.percentile(durations, 50),
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99),
      byOperation: perfs.reduce((acc, p) => {
        if (!acc[p.operation]) {
          acc[p.operation] = { count: 0, totalDuration: 0 };
        }
        acc[p.operation].count++;
        acc[p.operation].totalDuration += p.duration;
        return acc;
      }, {})
    };
  }

  /**
   * Calculate percentile
   */
  percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Generate usage report
   */
  generateUsageReport(period = 'day') {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'hour':
        startDate = new Date(now - 60 * 60 * 1000);
        break;
      case 'day':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now - 24 * 60 * 60 * 1000);
    }

    return {
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      apiUsage: this.getAPIUsageStats({ startDate }),
      errors: this.getErrorStats({ startDate }),
      performance: this.getPerformanceMetrics(),
      systemHealth: this.getSystemStatus()
    };
  }

  /**
   * Get recent activity
   */
  getRecentActivity(limit = 50) {
    const requests = this.metrics.requests.slice(0, limit);
    const errors = this.metrics.errors.slice(0, Math.floor(limit / 5));

    const activity = [
      ...requests.map(r => ({
        type: 'request',
        timestamp: r.timestamp,
        details: `${r.method} ${r.endpoint} - ${r.statusCode} (${r.responseTime}ms)`
      })),
      ...errors.map(e => ({
        type: 'error',
        timestamp: e.timestamp,
        details: `${e.type}: ${e.message}`
      }))
    ];

    return activity
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Trim metrics to prevent memory overflow
   */
  trimMetrics(type, maxSize = this.maxMetricsSize) {
    if (this.metrics[type].length > maxSize) {
      this.metrics[type] = this.metrics[type].slice(0, maxSize);
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Export metrics to file
   */
  exportMetrics(type = 'all') {
    const exportDir = path.join(__dirname, '..', 'exports', 'metrics');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `metrics_${type}_${timestamp}.json`;
    const filePath = path.join(exportDir, fileName);

    const data = type === 'all' ? this.metrics : { [type]: this.metrics[type] };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    return { fileName, filePath, size: fs.statSync(filePath).size };
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThanDays = 7) {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    Object.keys(this.metrics).forEach(type => {
      const before = this.metrics[type].length;
      this.metrics[type] = this.metrics[type].filter(m => 
        new Date(m.timestamp) > cutoff
      );
      console.log(`Cleared ${before - this.metrics[type].length} old ${type} metrics`);
    });
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

// Express middleware for request tracking
MonitoringService.middleware = function(monitoringService) {
  return (req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
      monitoringService.trackRequest({
        method: req.method,
        endpoint: req.path,
        statusCode: res.statusCode,
        responseTime: Date.now() - startTime,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        query: req.query
      });
    });

    next();
  };
};

// Export singleton instance
const monitoringService = new MonitoringService();

module.exports = monitoringService;
