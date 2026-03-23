/**
 * Webhook Service
 * Service de Webhooks
 * 
 * Webhook support for batch processing with:
 * - Register webhook URLs
 * - Send notifications on batch events
 * - Retry logic for failed webhooks
 * - Webhook signature verification
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class WebhookService {
  constructor() {
    this.webhooks = new Map();
    this.webhookLogs = [];
    this.maxRetries = 3;
    this.retryDelays = [1000, 5000, 15000]; // 1s, 5s, 15s
    this.secretKey = process.env.WEBHOOK_SECRET || 'geocoding-webhook-secret';
    
    // Load persisted webhooks
    this.loadWebhooks();
  }

  /**
   * Event types supported
   */
  static EVENT_TYPES = {
    BATCH_STARTED: 'batch_started',
    BATCH_PROGRESS: 'batch_progress',
    BATCH_COMPLETED: 'batch_completed',
    BATCH_FAILED: 'batch_failed',
    BATCH_CANCELLED: 'batch_cancelled'
  };

  /**
   * Register a webhook
   * @param {object} config - Webhook configuration
   * @returns {object} Registered webhook
   */
  registerWebhook(config) {
    const { url, events, name, headers = {} } = config;

    if (!url || !this.isValidUrl(url)) {
      throw new Error('Invalid webhook URL');
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      throw new Error('At least one event type is required');
    }

    // Validate event types
    const validEvents = Object.values(WebhookService.EVENT_TYPES);
    for (const event of events) {
      if (!validEvents.includes(event)) {
        throw new Error(`Invalid event type: ${event}`);
      }
    }

    const webhook = {
      id: this.generateId(),
      url,
      name: name || 'Unnamed Webhook',
      events,
      headers,
      secret: this.generateSecret(),
      active: true,
      createdAt: new Date().toISOString(),
      lastTriggered: null,
      successCount: 0,
      failureCount: 0
    };

    this.webhooks.set(webhook.id, webhook);
    this.saveWebhooks();

    // Return webhook without exposing full secret
    return {
      ...webhook,
      secret: webhook.secret.substring(0, 8) + '...'
    };
  }

  /**
   * Update a webhook
   * @param {string} id - Webhook ID
   * @param {object} updates - Updates to apply
   * @returns {object} Updated webhook
   */
  updateWebhook(id, updates) {
    const webhook = this.webhooks.get(id);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const allowedUpdates = ['url', 'name', 'events', 'headers', 'active'];
    for (const key of Object.keys(updates)) {
      if (allowedUpdates.includes(key)) {
        webhook[key] = updates[key];
      }
    }

    webhook.updatedAt = new Date().toISOString();
    this.webhooks.set(id, webhook);
    this.saveWebhooks();

    return webhook;
  }

  /**
   * Delete a webhook
   * @param {string} id - Webhook ID
   * @returns {boolean} Success status
   */
  deleteWebhook(id) {
    const deleted = this.webhooks.delete(id);
    if (deleted) {
      this.saveWebhooks();
    }
    return deleted;
  }

  /**
   * Get all webhooks
   * @returns {array} List of webhooks
   */
  getWebhooks() {
    return Array.from(this.webhooks.values()).map(webhook => ({
      ...webhook,
      secret: webhook.secret.substring(0, 8) + '...'
    }));
  }

  /**
   * Get webhook by ID
   * @param {string} id - Webhook ID
   * @returns {object|null} Webhook or null
   */
  getWebhook(id) {
    const webhook = this.webhooks.get(id);
    if (!webhook) return null;
    
    return {
      ...webhook,
      secret: webhook.secret.substring(0, 8) + '...'
    };
  }

  /**
   * Trigger webhooks for an event
   * @param {string} eventType - Event type
   * @param {object} data - Event data
   */
  async triggerEvent(eventType, data) {
    const webhooksToTrigger = Array.from(this.webhooks.values())
      .filter(webhook => webhook.active && webhook.events.includes(eventType));

    const results = await Promise.allSettled(
      webhooksToTrigger.map(webhook => this.sendWebhook(webhook, eventType, data))
    );

    // Log results
    results.forEach((result, index) => {
      const webhook = webhooksToTrigger[index];
      this.logWebhookEvent(webhook.id, eventType, result.status === 'fulfilled', result.value || result.reason);
    });

    return results;
  }

  /**
   * Send webhook notification
   * @param {object} webhook - Webhook configuration
   * @param {string} eventType - Event type
   * @param {object} data - Event data
   * @param {number} attempt - Current attempt number
   */
  async sendWebhook(webhook, eventType, data, attempt = 0) {
    const payload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
      webhookId: webhook.id
    };

    const signature = this.generateSignature(payload, webhook.secret);

    const headers = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Event': eventType,
      'X-Webhook-Timestamp': payload.timestamp,
      ...webhook.headers
    };

    try {
      const response = await this.makeRequest(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        timeout: 10000
      });

      // Update webhook stats
      webhook.lastTriggered = new Date().toISOString();
      webhook.successCount++;
      this.webhooks.set(webhook.id, webhook);
      this.saveWebhooks();

      return {
        success: true,
        statusCode: response.status,
        attempt: attempt + 1
      };
    } catch (error) {
      // Retry logic
      if (attempt < this.maxRetries) {
        await this.delay(this.retryDelays[attempt]);
        return this.sendWebhook(webhook, eventType, data, attempt + 1);
      }

      // Update failure stats
      webhook.failureCount++;
      this.webhooks.set(webhook.id, webhook);
      this.saveWebhooks();

      throw {
        success: false,
        error: error.message,
        attempts: attempt + 1
      };
    }
  }

  /**
   * Make HTTP request (simplified fetch)
   */
  async makeRequest(url, options) {
    // Use native fetch or node-fetch
    const fetch = globalThis.fetch || require('node-fetch');
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 10000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Generate webhook signature
   * @param {object} payload - Webhook payload
   * @param {string} secret - Webhook secret
   * @returns {string} Signature
   */
  generateSignature(payload, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verify webhook signature
   * @param {string} signature - Received signature
   * @param {object} payload - Received payload
   * @param {string} secret - Webhook secret
   * @returns {boolean} Verification result
   */
  verifySignature(signature, payload, secret) {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Log webhook event
   */
  logWebhookEvent(webhookId, eventType, success, details) {
    const log = {
      id: this.generateId(),
      webhookId,
      eventType,
      success,
      details,
      timestamp: new Date().toISOString()
    };

    this.webhookLogs.unshift(log);

    // Keep only last 1000 logs
    if (this.webhookLogs.length > 1000) {
      this.webhookLogs = this.webhookLogs.slice(0, 1000);
    }
  }

  /**
   * Get webhook logs
   * @param {object} options - Filter options
   * @returns {array} Webhook logs
   */
  getWebhookLogs(options = {}) {
    let logs = [...this.webhookLogs];

    if (options.webhookId) {
      logs = logs.filter(log => log.webhookId === options.webhookId);
    }

    if (options.eventType) {
      logs = logs.filter(log => log.eventType === options.eventType);
    }

    if (options.success !== undefined) {
      logs = logs.filter(log => log.success === options.success);
    }

    const page = options.page || 1;
    const limit = options.limit || 50;
    const start = (page - 1) * limit;

    return {
      logs: logs.slice(start, start + limit),
      total: logs.length,
      page,
      pages: Math.ceil(logs.length / limit)
    };
  }

  /**
   * Test webhook
   * @param {string} id - Webhook ID
   * @returns {object} Test result
   */
  async testWebhook(id) {
    const webhook = this.webhooks.get(id);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const testData = {
      test: true,
      message: 'This is a test webhook notification',
      timestamp: new Date().toISOString()
    };

    try {
      const result = await this.sendWebhook(webhook, 'test', testData);
      return {
        success: true,
        message: 'Webhook test successful',
        ...result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Webhook test failed',
        error: error.message || error
      };
    }
  }

  // ==========================================
  // Batch Processing Event Helpers
  // ==========================================

  /**
   * Notify batch started
   */
  async notifyBatchStarted(batchId, totalItems) {
    return this.triggerEvent(WebhookService.EVENT_TYPES.BATCH_STARTED, {
      batchId,
      totalItems,
      status: 'started'
    });
  }

  /**
   * Notify batch progress
   */
  async notifyBatchProgress(batchId, processed, total, percentage) {
    return this.triggerEvent(WebhookService.EVENT_TYPES.BATCH_PROGRESS, {
      batchId,
      processed,
      total,
      percentage,
      status: 'processing'
    });
  }

  /**
   * Notify batch completed
   */
  async notifyBatchCompleted(batchId, statistics) {
    return this.triggerEvent(WebhookService.EVENT_TYPES.BATCH_COMPLETED, {
      batchId,
      statistics,
      status: 'completed'
    });
  }

  /**
   * Notify batch failed
   */
  async notifyBatchFailed(batchId, error) {
    return this.triggerEvent(WebhookService.EVENT_TYPES.BATCH_FAILED, {
      batchId,
      error: error.message || error,
      status: 'failed'
    });
  }

  // ==========================================
  // Utility Methods
  // ==========================================

  generateId() {
    return `wh_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Save webhooks to file
   */
  saveWebhooks() {
    try {
      const dataDir = path.join(__dirname, '..', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const filePath = path.join(dataDir, 'webhooks.json');
      const data = Array.from(this.webhooks.entries());
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving webhooks:', error);
    }
  }

  /**
   * Load webhooks from file
   */
  loadWebhooks() {
    try {
      const filePath = path.join(__dirname, '..', 'data', 'webhooks.json');
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        this.webhooks = new Map(data);
        console.log(`Loaded ${this.webhooks.size} webhooks`);
      }
    } catch (error) {
      console.error('Error loading webhooks:', error);
    }
  }
}

// Export singleton instance
const webhookService = new WebhookService();

module.exports = webhookService;
