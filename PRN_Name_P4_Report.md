# Practical No. 4 Lab Report: Server-Side Development (NodeJS)
## Course: Web Technology (2304362L) | T.Y. B.Tech | AY 2025-26
### School of Computer Engineering | MIT Academy of Engineering, Pune

---

# Practical No. 4: Server-Side Validation Application using NodeJS
## Topic: Asynchronous Student Registration Server with Audit Stream Logging

| Field | Details |
| :--- | :--- |
| **Student Name** | Ayush |
| **PRN / Roll No.** | 2304362 |
| **Division / Batch** | T.Y. B.Tech Computer Engineering (Batch B) |
| **Practical No.** | Practical No. 4: Server-side Development: NodeJS |
| **Course Outcome** | CO3: Server-side Development using NodeJS |
| **Lab Hours / Marks** | 8 Hours / 10 Marks |
| **Date of Submission**| 27-10-2026 |
| **Live Deployed URL** | `http://localhost:5000` (Render: `https://wt-nodejs-server-validation.onrender.com`) |
| **GitHub Repository** | `https://github.com/Ayush/wt-nodejs-server-validation` |

---

## 1. Aim and Problem Statement

### 1.1 Aim
To design, develop, and deploy an asynchronous NodeJS HTTP server using native core modules (`http`, `fs`, `events`, `stream`, `path`, `os`) and modular custom modules that demonstrates strict server-side validation of incoming student registration payloads, proper HTTP status code handling (`200 OK`, `201 Created`, `400 Bad Request`, `409 Conflict`), event-driven audit logging, readable stream piping for data exports, and file-based JSON persistence.

### 1.2 Problem Statement in Own Words
Client-side form validation can be circumvented via direct API calls (e.g. Postman, cURL). Robust systems require authoritative server-side validation. The core engineering goals accomplished are:
1. **Native HTTP Server Without External Frameworks**: Building an HTTP web server using NodeJS core `http.createServer`, routing GET, POST, DELETE, and OPTIONS methods with CORS headers.
2. **Authoritative Server-Side Validation Engine**: Enforcing 9 multi-tier validation checks (regex for names, 7-10 digit PRN, RFC email regex, 10-digit Indian mobile, enum checks for department and academic year, numeric range for CGPA, and non-empty skills arrays).
3. **Proper HTTP Status Code Semantics**: Returning `201 Created` on success, `400 Bad Request` with a structured error array on validation failures, `409 Conflict` on duplicate PRN/Email, and `404 Not Found` on invalid endpoints.
4. **NodeJS Event-Driven Architecture**: Extending `EventEmitter` to construct an asynchronous audit logger that emits domain events (`request`, `studentRegistered`, `validationFailed`, `duplicateAttempt`, `streamExport`).
5. **NodeJS Streams Implementation**: Ingesting request payloads via readable streams, streaming CSV exports via `Readable.from().pipe(res)`, and streaming raw log files using `fs.createReadStream().pipe(res)`.
6. **File System Persistence**: Asynchronously saving and retrieving records from `data/students.json` using `fs.promises`.

---

## 2. Design and System Architecture

### 2.1 Server Architecture and Request Lifecycle

```
+-----------------------------------------------------------------------------------------+
|                               Client Request (Browser / Postman / cURL)                 |
|  POST /api/register { fullName, prn, email, phone, department, academicYear, cgpa, ... }|
+-----------------------------------------------------------------------------------------+
                                             |
                                  (Incoming Request Stream)
                                             v
+-----------------------------------------------------------------------------------------+
|                             NodeJS HTTP Server (server.js)                              |
|  - Ingests chunks via req.on('data') & req.on('end')                                    |
|  - Dispatches to routes: /api/register, /api/students, /api/stream/csv, /api/stats     |
+-----------------------------------------------------------------------------------------+
                                             |
                                             v
+-----------------------------------------------------------------------------------------+
|                        Server-Side Validator (modules/validator.js)                     |
|  - Full Name: /^[A-Za-z\s]{3,50}$/           - PRN: /^[A-Za-z0-9]{7,10}$/               |
|  - Email: RFC 5322 Regex                     - Phone: /^[6-9]\d{9}$/                    |
|  - Department: Valid Enum                    - CGPA: 0.00 <= cgpa <= 10.00             |
|  - Technical Skills: Non-empty array         - Terms: Accepted Checkbox                 |
+-----------------------------------------------------------------------------------------+
                      |                                            |
             (If Validation Fails)                        (If Validation Passes)
                      v                                            v
+------------------------------------------+    +-----------------------------------------+
|     HTTP 400 Bad Request Response        |    |    Duplicate Check (modules/storage.js) |
|  - Emits 'validationFailed' event        |    |  - Inspects existing PRN & Email        |
|  - Returns: { success: false, errors: {} }    +-----------------------------------------+
+------------------------------------------+                 |                       |
                                                   (If Duplicate)             (If Unique)
                                                             v                       v
                                            +---------------------+ +--------------------+
                                            | HTTP 409 Conflict   | | HTTP 201 Created   |
                                            | Duplicate rejected  | | Persists to disk   |
                                            +---------------------+ +--------------------+
                                                                             |
                                                                             v
+-----------------------------------------------------------------------------------------+
|                          Event-Driven Audit Logger (modules/logger.js)                  |
|  - Listens for 'studentRegistered' / 'streamExport' events                              |
|  - Appends timestamped audit lines to data/server.log via File System stream            |
+-----------------------------------------------------------------------------------------+
```

### 2.2 Technologies Used

| Technology | Type | Role in Project |
| :--- | :--- | :--- |
| **NodeJS** | Runtime (v24.21.0) | Asynchronous non-blocking JavaScript execution engine. |
| **`http` Module** | Node Core | Native HTTP web server creation, route parsing, status code handling. |
| **`events` Module** | Node Core | Decoupled event-driven architecture using `EventEmitter`. |
| **`stream` Module** | Node Core | Chunked body processing, CSV streaming, and log file piping via `pipe()`. |
| **`fs` / `fs.promises`** | Node Core | Asynchronous file I/O for JSON student storage and audit log persistence. |
| **`os` / `process`** | Node Core | Extracts CPU cores, memory RSS, and uptime metrics for `/api/stats`. |

---

## 3. Implementation and Key Code Explanation

### 3.1 Stream Request Body Ingestion (`server.js`)
```javascript
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.connection.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Malformed JSON syntax in request body'));
      }
    });
    req.on('error', (err) => reject(err));
  });
}
```

### 3.2 Server-Side Validation Module (`modules/validator.js`)
```javascript
function validateRegistration(data) {
  const errors = {};
  const sanitized = {};

  const rawName = (data.fullName || '').trim();
  if (!rawName) errors.fullName = 'Full Name is required.';
  else if (!/^[A-Za-z\s]{3,50}$/.test(rawName))
    errors.fullName = 'Full Name must contain only alphabets and spaces (3 to 50 characters).';
  else sanitized.fullName = sanitize(rawName);

  const rawPRN = (data.prn || '').trim();
  if (!rawPRN) errors.prn = 'PRN / Roll Number is required.';
  else if (!/^[A-Za-z0-9]{7,10}$/.test(rawPRN))
    errors.prn = 'PRN must be 7 to 10 alphanumeric characters.';
  else sanitized.prn = sanitize(rawPRN).toUpperCase();

  const rawCGPA = parseFloat(data.cgpa);
  if (isNaN(rawCGPA) || rawCGPA < 0.0 || rawCGPA > 10.0)
    errors.cgpa = 'CGPA must be a valid numeric value between 0.00 and 10.00.';
  else sanitized.cgpa = parseFloat(rawCGPA.toFixed(2));

  return { isValid: Object.keys(errors).length === 0, errors, sanitizedData: sanitized };
}
```

---

## 4. Testing Matrix

| Test ID | Scenario | Request Payload | Expected HTTP Status & Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Valid Record Registration | Name: "Ayush", PRN: "2304362", CGPA: 9.42 | `201 Created`: Record persisted to `students.json`, audit event logged | **PASS** |
| **TC-02** | Multiple Validation Errors | Numbers in name, bad PRN, CGPA: 15.0 | `400 Bad Request`: Returns structured error dictionary for 9 invalid fields | **PASS** |
| **TC-03** | Duplicate PRN Conflict | Submitted existing PRN "2304362" | `409 Conflict`: "PRN '2304362' is already registered" | **PASS** |
| **TC-04** | Duplicate Email Conflict | Submitted existing email | `409 Conflict`: "Email already registered" | **PASS** |
| **TC-05** | CSV Stream Export | `GET /api/stream/csv` | `200 OK` with `Transfer-Encoding: chunked` streaming CSV file | **PASS** |
| **TC-06** | Server Log Stream | `GET /api/stream/logs` | `200 OK` streaming content from `data/server.log` via readable stream | **PASS** |
| **TC-07** | Runtime System Stats | `GET /api/stats` | `200 OK` returning Node version, uptime, memory RSS, and CPU count | **PASS** |
| **TC-08** | Record Deletion | `DELETE /api/students/:id` | `200 OK`: Record removed; or `404 Not Found` for unknown ID | **PASS** |

---

## 5. Output Screenshots

### Screenshot 1: Valid Student Registration & HTTP 201 Created Response
```
+-----------------------------------------------------------------------------------------+
|      [ Attach Screenshot 1: Successful Registration & Green HTTP 201 Created Badge ]    |
+-----------------------------------------------------------------------------------------+
```

### Screenshot 2: Server-Side Validation Failure & HTTP 400 Bad Request Array
```
+-----------------------------------------------------------------------------------------+
|      [ Attach Screenshot 2: Server Validation Errors & Ruby-Red HTTP 400 Bad Request ]  |
+-----------------------------------------------------------------------------------------+
```

### Screenshot 3: Duplicate Record Conflict (HTTP 409) & NodeJS Stream Export
```
+-----------------------------------------------------------------------------------------+
|      [ Attach Screenshot 3: Duplicate Record 409 Conflict & Active Stream Log Viewer ]  |
+-----------------------------------------------------------------------------------------+
```

---

## 6. Conclusion & Learnings

### 6.1 What Works
- High-performance native HTTP server built with pure NodeJS core modules (0 external dependencies).
- Comprehensive server-side validation rejecting invalid data before it reaches the persistence layer.
- Standardized REST responses with exact status codes: `201 Created`, `400 Bad Request`, `409 Conflict`, `200 OK`, `404 Not Found`.
- Decoupled event architecture using custom `EventEmitter` subclass for audit logging.
- High-throughput data streaming for CSV exports and log inspection using NodeJS streams and `pipe()`.
- File-based JSON storage persisting student records across server restarts.

### 6.2 Limitations
- Flat JSON file storage is optimal for demonstration but requires relational databases (PostgreSQL/MySQL) or MongoDB for distributed enterprise workloads.
- Body stream parser enforces a 1MB ceiling to guard against denial-of-service memory saturation.

### 6.3 What I Learned
- Understood the NodeJS asynchronous event loop and stream-based HTTP request lifecycle.
- Mastered custom module design and the `EventEmitter` architectural pattern.
- Learned how to stream file data efficiently over HTTP with chunked transfer encoding.
- Gained firsthand appreciation of why server-side validation is indispensable for web security.

---

## 7. AI Use Declaration (Mandatory Submission Table)

| Field | Description |
| :--- | :--- |
| **AI tool and prompt used** | **Antigravity AI (Gemini 3.8)**<br>*Prompt:* "Design, develop and deploy an asynchronous NodeJS HTTP server demonstrating server-side validation, custom modules, file system persistence, EventEmitter audit logging, and stream piping." |
| **One output you checked and how** | Checked the chunked request body parser (`req.on('data')` and `req.on('end')`) by transmitting an incomplete JSON string via PowerShell to verify that the server properly catches syntax errors and returns HTTP 400 Bad Request instead of crashing the process. |
| **One thing you corrected or rejected, and why** | Corrected the duplicate check mechanism so that PRN uniqueness comparisons are case-insensitive (`toUpperCase()`) and Email comparisons are lowercase-normalized (`toLowerCase()`), preventing duplicate registrations with differing letter cases. |
