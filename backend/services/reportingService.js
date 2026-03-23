/**
 * Reporting Service
 * Service de Rapports
 * 
 * Generate detailed reports with:
 * - PDF reports with charts
 * - Excel reports with multiple sheets
 * - Summary statistics
 * - Custom report templates
 * - Scheduled report generation
 */

const fs = require('fs');
const path = require('path');

class ReportingService {
  constructor() {
    this.templates = new Map();
    this.scheduledReports = new Map();
    this.reportsDir = path.join(__dirname, '..', 'exports', 'reports');
    
    // Ensure reports directory exists
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }

    // Load default templates
    this.loadDefaultTemplates();
  }

  /**
   * Report types
   */
  static REPORT_TYPES = {
    BATCH_SUMMARY: 'batch_summary',
    SEARCH_HISTORY: 'search_history',
    STATISTICS: 'statistics',
    CUSTOM: 'custom'
  };

  /**
   * Load default report templates
   */
  loadDefaultTemplates() {
    this.templates.set('batch_summary', {
      id: 'batch_summary',
      name: { en: 'Batch Processing Summary', fr: 'Résumé du Traitement par Lots' },
      sections: ['overview', 'statistics', 'results', 'map'],
      fields: ['villageName', 'latitude', 'longitude', 'confidence', 'source', 'formattedAddress'],
      charts: ['confidence_distribution', 'source_breakdown'],
      options: {
        includeMap: true,
        includeStatistics: true,
        includeCharts: true
      }
    });

    this.templates.set('search_history', {
      id: 'search_history',
      name: { en: 'Search History Report', fr: 'Rapport d\'Historique de Recherche' },
      sections: ['overview', 'trends', 'top_searches', 'statistics'],
      fields: ['query', 'timestamp', 'found', 'confidence', 'type', 'countryCode'],
      charts: ['daily_trends', 'success_rate', 'country_distribution'],
      options: {
        dateRange: true,
        groupBy: 'day'
      }
    });

    this.templates.set('statistics', {
      id: 'statistics',
      name: { en: 'Statistics Report', fr: 'Rapport Statistique' },
      sections: ['summary', 'trends', 'performance', 'recommendations'],
      charts: ['all'],
      options: {
        includeAIInsights: true
      }
    });
  }

  /**
   * Generate report
   * @param {string} type - Report type
   * @param {object} data - Report data
   * @param {object} options - Report options
   * @param {string} format - Output format (pdf, excel, json)
   * @returns {object} Generated report info
   */
  async generateReport(type, data, options = {}, format = 'json') {
    const template = this.templates.get(type) || this.templates.get('custom');
    const reportId = this.generateReportId();
    const timestamp = new Date().toISOString();

    const report = {
      id: reportId,
      type,
      template: template.id,
      generatedAt: timestamp,
      format,
      options,
      data: this.processReportData(data, template, options)
    };

    // Generate output based on format
    let output;
    switch (format) {
      case 'pdf':
        output = await this.generatePDFReport(report);
        break;
      case 'excel':
        output = await this.generateExcelReport(report);
        break;
      case 'csv':
        output = await this.generateCSVReport(report);
        break;
      case 'json':
      default:
        output = await this.generateJSONReport(report);
    }

    return {
      reportId,
      type,
      format,
      generatedAt: timestamp,
      ...output
    };
  }

  /**
   * Process report data based on template
   */
  processReportData(data, template, options) {
    const processed = {
      summary: this.generateSummary(data),
      statistics: this.calculateStatistics(data),
      charts: this.prepareChartData(data, template.charts),
      details: this.filterFields(data, template.fields, options)
    };

    return processed;
  }

  /**
   * Generate summary section
   */
  generateSummary(data) {
    if (Array.isArray(data)) {
      const total = data.length;
      const found = data.filter(item => item.found !== false && item.latitude).length;
      const avgConfidence = data.reduce((sum, item) => sum + (item.confidence || 0), 0) / total;

      return {
        totalRecords: total,
        successfulResults: found,
        failedResults: total - found,
        successRate: ((found / total) * 100).toFixed(2) + '%',
        averageConfidence: (avgConfidence * 100).toFixed(2) + '%'
      };
    }

    return data.summary || {};
  }

  /**
   * Calculate statistics
   */
  calculateStatistics(data) {
    if (!Array.isArray(data)) return {};

    const stats = {
      byConfidence: {
        high: data.filter(item => item.confidence >= 0.8).length,
        medium: data.filter(item => item.confidence >= 0.5 && item.confidence < 0.8).length,
        low: data.filter(item => item.confidence < 0.5).length
      },
      bySource: {},
      byCountry: {},
      byType: {}
    };

    data.forEach(item => {
      // By source
      const source = item.source || 'unknown';
      stats.bySource[source] = (stats.bySource[source] || 0) + 1;

      // By country
      if (item.countryCode || item.filters?.countryCode) {
        const country = item.countryCode || item.filters?.countryCode;
        stats.byCountry[country] = (stats.byCountry[country] || 0) + 1;
      }

      // By type
      const type = item.type || 'single';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Prepare chart data
   */
  prepareChartData(data, chartTypes) {
    if (!Array.isArray(data)) return {};

    const charts = {};

    if (chartTypes.includes('confidence_distribution') || chartTypes.includes('all')) {
      charts.confidenceDistribution = {
        type: 'pie',
        labels: ['High (>80%)', 'Medium (50-80%)', 'Low (<50%)'],
        data: [
          data.filter(item => item.confidence >= 0.8).length,
          data.filter(item => item.confidence >= 0.5 && item.confidence < 0.8).length,
          data.filter(item => item.confidence < 0.5).length
        ],
        colors: ['#4caf50', '#ff9800', '#f44336']
      };
    }

    if (chartTypes.includes('source_breakdown') || chartTypes.includes('all')) {
      const sources = {};
      data.forEach(item => {
        const source = item.source || 'unknown';
        sources[source] = (sources[source] || 0) + 1;
      });

      charts.sourceBreakdown = {
        type: 'bar',
        labels: Object.keys(sources),
        data: Object.values(sources)
      };
    }

    if (chartTypes.includes('daily_trends') || chartTypes.includes('all')) {
      const daily = {};
      data.forEach(item => {
        if (item.timestamp) {
          const date = new Date(item.timestamp).toLocaleDateString();
          daily[date] = (daily[date] || 0) + 1;
        }
      });

      charts.dailyTrends = {
        type: 'line',
        labels: Object.keys(daily),
        data: Object.values(daily)
      };
    }

    return charts;
  }

  /**
   * Filter fields based on template
   */
  filterFields(data, fields, options) {
    if (!Array.isArray(data)) return data;

    const selectedFields = options.fields || fields;
    
    return data.map(item => {
      const filtered = {};
      selectedFields.forEach(field => {
        if (item[field] !== undefined) {
          filtered[field] = item[field];
        }
      });
      return filtered;
    });
  }

  /**
   * Generate JSON report
   */
  async generateJSONReport(report) {
    const fileName = `report_${report.id}.json`;
    const filePath = path.join(this.reportsDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));

    return {
      fileName,
      filePath,
      content: report
    };
  }

  /**
   * Generate CSV report
   */
  async generateCSVReport(report) {
    const fileName = `report_${report.id}.csv`;
    const filePath = path.join(this.reportsDir, fileName);
    
    const details = report.data.details || [];
    if (details.length === 0) {
      return { fileName, filePath, content: '' };
    }

    const headers = Object.keys(details[0]);
    const rows = [
      headers.join(','),
      ...details.map(item => 
        headers.map(h => {
          const value = item[h];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value ?? '';
        }).join(',')
      )
    ];

    const content = rows.join('\n');
    fs.writeFileSync(filePath, content);

    return { fileName, filePath, content };
  }

  /**
   * Generate Excel report (simplified - creates CSV with .xlsx extension)
   * For full Excel support, integrate with xlsx library
   */
  async generateExcelReport(report) {
    const fileName = `report_${report.id}.xlsx`;
    const filePath = path.join(this.reportsDir, fileName);
    
    // Create multi-sheet structure as JSON (for xlsx library integration)
    const workbook = {
      sheets: [
        {
          name: 'Summary',
          data: [
            ['Report Summary'],
            ['Generated At', report.generatedAt],
            ['Total Records', report.data.summary.totalRecords],
            ['Success Rate', report.data.summary.successRate],
            ['Average Confidence', report.data.summary.averageConfidence]
          ]
        },
        {
          name: 'Statistics',
          data: this.statisticsToRows(report.data.statistics)
        },
        {
          name: 'Details',
          data: this.detailsToRows(report.data.details)
        }
      ]
    };

    // For now, save as JSON (integrate xlsx library for actual Excel)
    fs.writeFileSync(filePath + '.json', JSON.stringify(workbook, null, 2));

    return {
      fileName,
      filePath: filePath + '.json',
      content: workbook,
      note: 'Excel generation requires xlsx library integration'
    };
  }

  /**
   * Generate PDF report (simplified - creates HTML for PDF conversion)
   * For full PDF support, integrate with puppeteer or pdfkit
   */
  async generatePDFReport(report) {
    const fileName = `report_${report.id}.html`;
    const filePath = path.join(this.reportsDir, fileName);
    
    const html = this.generateHTMLReport(report);
    fs.writeFileSync(filePath, html);

    return {
      fileName,
      filePath,
      content: html,
      note: 'PDF generation requires puppeteer integration. HTML version provided.'
    };
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(report) {
    const { summary, statistics, charts, details } = report.data;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Geocoding Report - ${report.id}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #1a1a2e; border-bottom: 2px solid #ff6b35; padding-bottom: 10px; }
    h2 { color: #333; margin-top: 30px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .summary-card { background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; }
    .summary-value { font-size: 2rem; font-weight: bold; color: #ff6b35; }
    .summary-label { color: #666; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: 600; }
    .chart-placeholder { background: #f9f9f9; padding: 40px; text-align: center; border-radius: 8px; color: #999; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>🌍 Geocoding Report</h1>
  <p>Generated: ${report.generatedAt}</p>
  <p>Report ID: ${report.id}</p>

  <h2>Summary</h2>
  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-value">${summary.totalRecords || 0}</div>
      <div class="summary-label">Total Records</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${summary.successfulResults || 0}</div>
      <div class="summary-label">Successful</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${summary.successRate || '0%'}</div>
      <div class="summary-label">Success Rate</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${summary.averageConfidence || '0%'}</div>
      <div class="summary-label">Avg Confidence</div>
    </div>
  </div>

  <h2>Statistics</h2>
  <h3>By Confidence Level</h3>
  <table>
    <tr><th>Level</th><th>Count</th></tr>
    <tr><td>High (>80%)</td><td>${statistics.byConfidence?.high || 0}</td></tr>
    <tr><td>Medium (50-80%)</td><td>${statistics.byConfidence?.medium || 0}</td></tr>
    <tr><td>Low (<50%)</td><td>${statistics.byConfidence?.low || 0}</td></tr>
  </table>

  ${Object.keys(statistics.bySource || {}).length > 0 ? `
  <h3>By Source</h3>
  <table>
    <tr><th>Source</th><th>Count</th></tr>
    ${Object.entries(statistics.bySource).map(([source, count]) => 
      `<tr><td>${source}</td><td>${count}</td></tr>`
    ).join('')}
  </table>
  ` : ''}

  <h2>Results</h2>
  ${details && details.length > 0 ? `
  <table>
    <tr>${Object.keys(details[0]).map(key => `<th>${key}</th>`).join('')}</tr>
    ${details.slice(0, 100).map(item => 
      `<tr>${Object.values(item).map(val => `<td>${val ?? ''}</td>`).join('')}</tr>`
    ).join('')}
  </table>
  ${details.length > 100 ? `<p><em>Showing first 100 of ${details.length} results</em></p>` : ''}
  ` : '<p>No detailed results available</p>'}

  <div class="footer">
    <p>Generated by Geocoding Application</p>
    <p>© ${new Date().getFullYear()} - All rights reserved</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Convert statistics to rows
   */
  statisticsToRows(statistics) {
    const rows = [['Category', 'Item', 'Count']];
    
    if (statistics.byConfidence) {
      rows.push(['Confidence', 'High', statistics.byConfidence.high]);
      rows.push(['Confidence', 'Medium', statistics.byConfidence.medium]);
      rows.push(['Confidence', 'Low', statistics.byConfidence.low]);
    }

    Object.entries(statistics.bySource || {}).forEach(([source, count]) => {
      rows.push(['Source', source, count]);
    });

    Object.entries(statistics.byCountry || {}).forEach(([country, count]) => {
      rows.push(['Country', country, count]);
    });

    return rows;
  }

  /**
   * Convert details to rows
   */
  detailsToRows(details) {
    if (!details || details.length === 0) return [];
    
    const headers = Object.keys(details[0]);
    return [
      headers,
      ...details.map(item => headers.map(h => item[h] ?? ''))
    ];
  }

  /**
   * Create custom template
   */
  createTemplate(config) {
    const template = {
      id: config.id || this.generateReportId(),
      name: config.name,
      sections: config.sections || ['overview', 'statistics', 'results'],
      fields: config.fields || [],
      charts: config.charts || [],
      options: config.options || {},
      createdAt: new Date().toISOString()
    };

    this.templates.set(template.id, template);
    return template;
  }

  /**
   * Get available templates
   */
  getTemplates() {
    return Array.from(this.templates.values());
  }

  /**
   * Schedule report generation
   */
  scheduleReport(config) {
    const schedule = {
      id: this.generateReportId(),
      templateId: config.templateId,
      cronPattern: config.cronPattern,
      recipients: config.recipients || [],
      format: config.format || 'pdf',
      options: config.options || {},
      active: true,
      createdAt: new Date().toISOString(),
      lastRun: null,
      nextRun: this.calculateNextRun(config.cronPattern)
    };

    this.scheduledReports.set(schedule.id, schedule);
    return schedule;
  }

  /**
   * Calculate next run time from cron pattern (simplified)
   */
  calculateNextRun(cronPattern) {
    // Simplified - returns next hour for demo
    const next = new Date();
    next.setHours(next.getHours() + 1);
    next.setMinutes(0);
    next.setSeconds(0);
    return next.toISOString();
  }

  /**
   * Generate report ID
   */
  generateReportId() {
    return `rpt_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Get report by ID
   */
  async getReport(reportId) {
    const filePath = path.join(this.reportsDir, `report_${reportId}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return null;
  }

  /**
   * List generated reports
   */
  listReports() {
    const files = fs.readdirSync(this.reportsDir);
    return files
      .filter(f => f.startsWith('report_'))
      .map(f => {
        const stats = fs.statSync(path.join(this.reportsDir, f));
        return {
          fileName: f,
          size: stats.size,
          createdAt: stats.birthtime
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

// Export singleton instance
const reportingService = new ReportingService();

module.exports = reportingService;
