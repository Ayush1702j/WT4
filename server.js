/**
 * Web Technology (2304362L) | Practical No. 4
 * Server-Side Validation Application using NodeJS
 * Student Name: Ayush | PRN: 2304362 | Batch: T.Y. B.Tech Computer Engineering (Batch B)
 *
 * Core NodeJS Capabilities Demonstrated:
 * 1. HTTP Server: http.createServer, handling GET, POST, DELETE & OPTIONS
 * 2. Modules: Core modules (http, fs, path, url, events, stream, os) + Custom modules (validator, logger, storage)
 * 3. File System (fs & fs.promises): Reading and writing data/students.json and appending logs
 * 4. Events (EventEmitter): Custom audit logger emitting asynchronous event hooks
 * 5. Streams: Chunked data ingestion from req stream, piping read streams for CSV and log downloads
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');

// Custom Modules
const { validateRegistration } = require('./modules/validator');
const auditLogger = require('./modules/logger');
const storageManager = require('./modules/storage');

const PORT = process.env.PORT || 5000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types for serving static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

/**
 * Helper to send standardized JSON responses with proper HTTP status codes
 */
function sendJSON(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(payload, null, 2));
}

/**
 * Helper to parse incoming request body stream into JSON
 * Demonstrates NodeJS Readable Stream handling (data, end events)
 */
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      // Safeguard against oversized payloads (max 1MB)
      if (body.length > 1e6) {
        req.connection.destroy();
        reject(new Error('Payload too large (exceeds 1MB limit)'));
      }
    });

    req.on('end', () => {
      if (!body.trim()) {
        return resolve({});
      }
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (err) {
        reject(new Error('Malformed JSON syntax in request body'));
      }
    });

    req.on('error', (err) => reject(err));
  });
}

/**
 * Serves static files from the /public directory using fs.createReadStream
 */
function serveStaticFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      return sendJSON(res, 404, {
        success: false,
        error: 'File Not Found',
        path: filePath
      });
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    // Stream the file directly to response using Node.js pipe
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  });
}

// Create native NodeJS HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  // Emit request event on custom audit logger
  auditLogger.emit('request', { method, url: pathname, ip: clientIp });

  // Handle CORS Pre-flight Options
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  try {
    // -------------------------------------------------------------------------
    // API ROUTE 1: [POST] /api/register -> Server-Side Validation & Persistence
    // -------------------------------------------------------------------------
    if (pathname === '/api/register' && method === 'POST') {
      let bodyData;
      try {
        bodyData = await parseRequestBody(req);
      } catch (err) {
        return sendJSON(res, 400, {
          success: false,
          statusCode: 400,
          error: 'Bad Request',
          message: err.message
        });
      }

      // Execute Server-Side Validation using custom validator module
      const validationResult = validateRegistration(bodyData);

      if (!validationResult.isValid) {
        // Emit validation failure event
        auditLogger.emit('validationFailed', {
          ip: clientIp,
          errors: validationResult.errors,
          endpoint: '/api/register'
        });

        // Respond with HTTP 400 Bad Request
        return sendJSON(res, 400, {
          success: false,
          statusCode: 400,
          error: 'Validation Failed',
          message: 'The submitted record contains one or more validation errors.',
          errorCount: Object.keys(validationResult.errors).length,
          errors: validationResult.errors
        });
      }

      // Check Duplicate PRN / Email in file storage
      const storageResult = await storageManager.addStudent(validationResult.sanitizedData);

      if (!storageResult.success) {
        // Emit duplicate conflict event
        auditLogger.emit('duplicateAttempt', {
          prn: validationResult.sanitizedData.prn,
          email: validationResult.sanitizedData.email,
          ip: clientIp
        });

        // Respond with HTTP 409 Conflict
        return sendJSON(res, 409, {
          success: false,
          statusCode: 409,
          error: 'Conflict: Duplicate Record',
          conflictField: storageResult.conflict,
          message: storageResult.message
        });
      }

      // Emit student registered success event
      auditLogger.emit('studentRegistered', {
        studentId: storageResult.record.id,
        prn: storageResult.record.prn,
        name: storageResult.record.fullName,
        dept: storageResult.record.department
      });

      // Respond with HTTP 201 Created
      return sendJSON(res, 201, {
        success: true,
        statusCode: 201,
        message: 'Student record successfully validated and persisted to server filesystem.',
        student: storageResult.record
      });
    }

    // -------------------------------------------------------------------------
    // API ROUTE 2: [GET] /api/students -> Fetch All Registered Records
    // -------------------------------------------------------------------------
    if (pathname === '/api/students' && method === 'GET') {
      const records = await storageManager.getAll();
      return sendJSON(res, 200, {
        success: true,
        statusCode: 200,
        total: records.length,
        students: records
      });
    }

    // -------------------------------------------------------------------------
    // API ROUTE 3: [DELETE] /api/students -> Delete Record by ID
    // -------------------------------------------------------------------------
    if (pathname.startsWith('/api/students/') && method === 'DELETE') {
      const id = pathname.replace('/api/students/', '').trim();
      const deleted = await storageManager.deleteStudent(id);

      if (!deleted) {
        return sendJSON(res, 404, {
          success: false,
          statusCode: 404,
          error: 'Not Found',
          message: `Student with ID '${id}' not found.`
        });
      }

      return sendJSON(res, 200, {
        success: true,
        statusCode: 200,
        message: `Student record '${id}' successfully removed from filesystem.`
      });
    }

    // -------------------------------------------------------------------------
    // API ROUTE 4: [GET] /api/stream/csv -> Stream CSV Export
    // Demonstrates: NodeJS Readable Stream piping to HTTP response
    // -------------------------------------------------------------------------
    if (pathname === '/api/stream/csv' && method === 'GET') {
      const records = await storageManager.getAll();
      auditLogger.emit('streamExport', { format: 'CSV', recordCount: records.length, ip: clientIp });

      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="students_academic_report.csv"',
        'Transfer-Encoding': 'chunked'
      });

      const csvStream = await storageManager.createCsvStream();
      return csvStream.pipe(res);
    }

    // -------------------------------------------------------------------------
    // API ROUTE 5: [GET] /api/stream/logs -> Stream Server Audit Logs
    // Demonstrates: fs.createReadStream piping raw log stream
    // -------------------------------------------------------------------------
    if (pathname === '/api/stream/logs' && method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked'
      });

      const logStream = auditLogger.createLogReadStream();
      return logStream.pipe(res);
    }

    // -------------------------------------------------------------------------
    // API ROUTE 6: [GET] /api/stats -> Server Health & NodeJS Runtime Metrics
    // Demonstrates: os, process, memory usage core metrics
    // -------------------------------------------------------------------------
    if (pathname === '/api/stats' && method === 'GET') {
      const records = await storageManager.getAll();
      const recentLogs = await auditLogger.getRecentLogs(10);
      const mem = process.memoryUsage();

      return sendJSON(res, 200, {
        success: true,
        statusCode: 200,
        server: {
          nodeVersion: process.version,
          platform: `${os.platform()} (${os.arch()})`,
          uptimeSeconds: Math.floor(process.uptime()),
          cpuCores: os.cpus().length,
          memoryUsageMB: {
            rss: Math.round(mem.rss / 1024 / 1024),
            heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
            heapUsed: Math.round(mem.heapUsed / 1024 / 1024)
          }
        },
        application: {
          totalRegisteredStudents: records.length,
          activeLogFile: 'data/server.log',
          activeStorageFile: 'data/students.json'
        },
        recentLogs
      });
    }

    // -------------------------------------------------------------------------
    // STATIC FILE SERVING (Frontend UI)
    // -------------------------------------------------------------------------
    if (method === 'GET') {
      let targetFile = pathname === '/' ? 'index.html' : pathname;
      // Strip leading slashes to resolve safely
      targetFile = targetFile.replace(/^\/+/, '');
      const safePath = path.normalize(path.join(PUBLIC_DIR, targetFile));

      // Security check: Prevent directory traversal outside of PUBLIC_DIR
      if (!safePath.startsWith(PUBLIC_DIR)) {
        return sendJSON(res, 403, {
          success: false,
          statusCode: 403,
          error: 'Forbidden: Access Denied'
        });
      }

      if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
        return serveStaticFile(res, safePath);
      }
    }

    // -------------------------------------------------------------------------
    // 404 CATCH-ALL FOR UNMATCHED ROUTES
    // -------------------------------------------------------------------------
    return sendJSON(res, 404, {
      success: false,
      statusCode: 404,
      error: 'Not Found',
      message: `The requested endpoint '${pathname}' does not exist on this NodeJS server.`
    });

  } catch (error) {
    console.error('[UNCAUGHT SERVER ERROR]:', error);
    return sendJSON(res, 500, {
      success: false,
      statusCode: 500,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Launch Server
server.listen(PORT, () => {
  console.log(`\n================================================================`);
  console.log(`🚀 NodeJS Server-Side Validation Application LIVE on Port ${PORT}`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`📡 API Endpoints:`);
  console.log(`   - POST   /api/register      (Server-Side Validation & Persistence)`);
  console.log(`   - GET    /api/students      (Fetch All Registered Students)`);
  console.log(`   - GET    /api/stream/csv    (Stream CSV Export via Node Streams)`);
  console.log(`   - GET    /api/stream/logs   (Stream Server Audit Logs)`);
  console.log(`   - GET    /api/stats         (Server Health & Runtime Metrics)`);
  console.log(`================================================================\n`);
});
