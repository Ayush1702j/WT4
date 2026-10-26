/**
 * Custom Module: Event-Driven Audit Logger
 * Demonstrates: EventEmitter, File System (fs), Writable/Readable Streams
 * Course: Web Technology (2304362L) | Practical No. 4
 */

const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

const LOG_FILE_PATH = path.join(__dirname, '..', 'data', 'server.log');

class ServerAuditEmitter extends EventEmitter {
  constructor() {
    super();
    this.ensureLogFile();
    this.setupListeners();
  }

  ensureLogFile() {
    const dataDir = path.dirname(LOG_FILE_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(LOG_FILE_PATH)) {
      fs.writeFileSync(LOG_FILE_PATH, `[${new Date().toISOString()}] [INIT] Server Audit Log Stream Initialized\n`, 'utf8');
    }
  }

  setupListeners() {
    // 1. Event: Request Received
    this.on('request', ({ method, url, ip }) => {
      this.writeLog('INFO', `Incoming Request: ${method} ${url} from IP ${ip}`);
    });

    // 2. Event: Successful Registration
    this.on('studentRegistered', ({ studentId, prn, name, dept }) => {
      this.writeLog('SUCCESS', `Student Registered -> ID: ${studentId} | PRN: ${prn} | Name: "${name}" | Dept: ${dept}`);
    });

    // 3. Event: Validation Failure
    this.on('validationFailed', ({ ip, errors, endpoint }) => {
      const errKeys = Object.keys(errors).join(', ');
      this.writeLog('WARN', `Validation Failed at ${endpoint} from IP ${ip} | Flagged Fields: [${errKeys}]`);
    });

    // 4. Event: Duplicate Record Conflict
    this.on('duplicateAttempt', ({ prn, email, ip }) => {
      this.writeLog('CONFLICT', `Duplicate Registration Rejected | PRN: ${prn} / Email: ${email} | IP: ${ip}`);
    });

    // 5. Event: Stream Data Export
    this.on('streamExport', ({ format, recordCount, ip }) => {
      this.writeLog('STREAM', `Export Stream Triggered (${format}) -> Streamed ${recordCount} records to IP ${ip}`);
    });
  }

  writeLog(level, message) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level}] ${message}\n`;

    // Asynchronously append to log file using file system stream
    fs.appendFile(LOG_FILE_PATH, line, (err) => {
      if (err) console.error('[LOGGER ERROR] Failed writing to server.log:', err);
    });

    // Also echo to server console with color cues
    const color = level === 'SUCCESS' ? '\x1b[32m' : level === 'WARN' ? '\x1b[33m' : level === 'CONFLICT' ? '\x1b[31m' : '\x1b[36m';
    console.log(`${color}[${level}]\x1b[0m [${timestamp}] ${message}`);
  }

  /**
   * Returns a Readable Stream for reading server logs
   * Demonstrates NodeJS Stream capability
   */
  createLogReadStream() {
    return fs.createReadStream(LOG_FILE_PATH, { encoding: 'utf8' });
  }

  /**
   * Returns the last N lines from the log file
   */
  async getRecentLogs(maxLines = 25) {
    try {
      const content = await fs.promises.readFile(LOG_FILE_PATH, 'utf8');
      const lines = content.trim().split('\n');
      return lines.slice(-maxLines);
    } catch (err) {
      return [`[${new Date().toISOString()}] [ERROR] Could not read logs`];
    }
  }
}

const auditLogger = new ServerAuditEmitter();

module.exports = auditLogger;
