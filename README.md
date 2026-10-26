# Web Technology Practical No. 4: Server-Side Development (NodeJS)
## Server-Side Validation Application using NodeJS Core Modules, Events, & Streams

**Course**: Web Technology (2304362L) | T.Y. B.Tech | AY 2025-26  
**Institution**: MIT Academy of Engineering, Pune (Autonomous Affiliated to SPPU)  
**School**: School of Computer Engineering  
**Student Name**: Ayush | **PRN**: 2304362 | **Batch**: T.Y. B.Tech Computer Engineering (Batch B)  
**Course Outcome**: CO3: Server-side Development using NodeJS  

---

## 🚀 Quick Start Guide

### 1. Run Server Locally
This project uses **100% native NodeJS core modules** (zero third-party dependencies required).
```bash
# Navigate to project folder
cd wt_assignment_4_nodejs_validation

# Launch server
node server.js
# Or using npm
npm start
```
The server will start on port **5000**:  
👉 **Interactive Web Portal**: `http://localhost:5000`

---

## 📡 REST API Specifications & Status Codes

| Method | Endpoint | Description | Expected Status Codes |
| :--- | :--- | :--- | :--- |
| **GET** | `/` | Serves client testing UI (`public/index.html`) | `200 OK` |
| **POST** | `/api/register` | Validates & persists new student record | `201 Created` / `400 Bad Request` / `409 Conflict` |
| **GET** | `/api/students` | Fetches all registered students from filesystem | `200 OK` |
| **DELETE**| `/api/students/:id` | Deletes a student record by ID | `200 OK` / `404 Not Found` |
| **GET** | `/api/stream/csv` | Streams CSV export file via NodeJS Readable Stream | `200 OK` (Transfer-Encoding: chunked) |
| **GET** | `/api/stream/logs`| Streams real-time server audit logs | `200 OK` (Transfer-Encoding: chunked) |
| **GET** | `/api/stats` | Returns NodeJS runtime metrics, uptime & memory | `200 OK` |

---

## 🛠️ NodeJS Core Capabilities Demonstrated

### 1. HTTP Server (`http.createServer`)
- Handles incoming GET, POST, DELETE, and OPTIONS requests without third-party frameworks.
- Parses request body chunks asynchronously using Node streams (`req.on('data')`, `req.on('end')`).
- Implements CORS headers and static file serving with proper MIME type mapping.

### 2. Modules (Custom Modules Architecture)
- **`modules/validator.js`**: Custom validation module containing regex rules, numeric ranges, enum checks, and input sanitization to prevent XSS.
- **`modules/logger.js`**: Custom event-driven audit logger extending Node's `EventEmitter`.
- **`modules/storage.js`**: Custom file-backed storage manager using `fs.promises`.

### 3. File System (`fs` & `fs.promises`)
- Persistent JSON record storage in `data/students.json`.
- Event log appending in `data/server.log`.
- Safe directory and file initialization.

### 4. Events (`events.EventEmitter`)
- Subclasses `EventEmitter` to create `ServerAuditEmitter`.
- Emits and handles events asynchronously:
  * `'request'`: Logged for every incoming HTTP request.
  * `'studentRegistered'`: Emitted when validation succeeds and record is persisted.
  * `'validationFailed'`: Emitted when invalid fields are rejected.
  * `'duplicateAttempt'`: Emitted when duplicate PRN or Email is submitted.
  * `'streamExport'`: Emitted when CSV data is streamed.

### 5. Streams (`stream.Readable` & `stream.pipe`)
- Ingests incoming POST JSON payloads through request streams.
- Streams CSV datasets on the fly directly to the HTTP response (`/api/stream/csv`) using `Readable.from(...).pipe(res)`.
- Streams raw server log files to clients (`/api/stream/logs`) using `fs.createReadStream().pipe(res)`.

---

## 🌐 1-Click Cloud Deployment (Render / Railway)

### A. Deploy on Render (Recommended):
1. Push this repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Practical 4: NodeJS Server-Side Validation"
   git remote add origin https://github.com/<YOUR_USERNAME>/wt-nodejs-server-validation.git
   git push -u origin main
   ```
2. Log in to [render.com](https://render.com) ➔ Click **"New +"** ➔ **"Web Service"**.
3. Select your repository.
4. Settings:
   - Environment: `Node`
   - Build Command: *(leave blank)*
   - Start Command: `node server.js`
5. Click **"Create Web Service"**. You will receive an instant live URL (e.g., `https://wt-nodejs-server-validation.onrender.com`).

---

## 📦 Deliverables for Moodle

1. **Submission ZIP**: `2304362_Ayush_P4_NodeServer.zip` (Run `python create_submission_zip.py`)
2. **PDF Lab Report**: `2304362_Ayush_P4_Report.pdf` (Print from `PRN_Name_P4_Report.html` or compile `PRN_Name_P4_Report.tex`)
3. **Online Text Box**: Deployed URL + GitHub Repository URL.
