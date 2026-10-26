/**
 * Client-Side Controller for NodeJS Server-Side Validation Application
 * Course: Web Technology (2304362L) | Practical No. 4
 * Author: Ayush (PRN: 2304362)
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registrationForm');
  const btnLoadValid = document.getElementById('btnLoadValid');
  const btnLoadInvalid = document.getElementById('btnLoadInvalid');
  const btnClearForm = document.getElementById('btnClearForm');
  const btnCopyJSON = document.getElementById('btnCopyJSON');
  const btnFetchLogs = document.getElementById('btnFetchLogs');
  const btnCloseLogs = document.getElementById('btnCloseLogs');

  const statusCodeText = document.getElementById('statusCodeText');
  const latencyText = document.getElementById('latencyText');
  const statusBadge = document.getElementById('statusBadge');
  const jsonViewer = document.getElementById('jsonViewer');
  const errorCallout = document.getElementById('errorCallout');
  const errorItemsList = document.getElementById('errorItemsList');

  const serverRuntime = document.getElementById('serverRuntime');
  const serverMemory = document.getElementById('serverMemory');
  const registeredCount = document.getElementById('registeredCount');
  const nodeVersionBadge = document.getElementById('nodeVersionBadge');
  const studentsTableBody = document.getElementById('studentsTableBody');
  const logStreamContainer = document.getElementById('logStreamContainer');
  const logStreamBody = document.getElementById('logStreamBody');

  // Load server statistics on mount
  fetchServerStats();
  fetchStudents();

  // 1. Preset Button: Load Valid Data
  btnLoadValid.addEventListener('click', () => {
    // Generate a fresh unique PRN each time to prevent duplicate conflict on repeated clicks
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    document.getElementById('fullName').value = 'Ayush Sharma';
    document.getElementById('prn').value = `230${randomSuffix}`;
    document.getElementById('email').value = `ayush.${randomSuffix}@mitaoe.ac.in`;
    document.getElementById('phone').value = '9823012345';
    document.getElementById('department').value = 'Computer Engineering';
    document.getElementById('academicYear').value = 'T.Y. B.Tech (Third Year)';
    document.getElementById('cgpa').value = '9.42';
    document.getElementById('skills').value = 'Node.js, Express, React, MongoDB';
    document.getElementById('agreeTerms').checked = true;

    clearInspector('Valid sample data loaded into form fields. Ready to submit.');
  });

  // 2. Preset Button: Load Invalid Data (Multiple violations)
  btnLoadInvalid.addEventListener('click', () => {
    document.getElementById('fullName').value = 'Ayush123'; // Number in name violation
    document.getElementById('prn').value = '12345'; // 5 digits only (< 7 digits)
    document.getElementById('email').value = 'invalid_email_at_mitaoe'; // Missing @ and domain
    document.getElementById('phone').value = '1234567890'; // Starts with 1 (must be 6-9)
    document.getElementById('department').value = ''; // Missing department
    document.getElementById('academicYear').value = ''; // Missing academic year
    document.getElementById('cgpa').value = '12.50'; // Out of range (> 10.00)
    document.getElementById('skills').value = ''; // Missing skills
    document.getElementById('agreeTerms').checked = false; // Unchecked terms

    clearInspector('Deliberately invalid test data loaded. Click Submit to trigger HTTP 400 Bad Request.');
  });

  // 3. Preset Button: Clear Form
  btnClearForm.addEventListener('click', () => {
    form.reset();
    clearInspector('Form fields reset.');
  });

  function clearInspector(msg) {
    statusCodeText.textContent = '---';
    statusCodeText.className = 'status-code-display';
    latencyText.textContent = '0 ms';
    statusBadge.textContent = 'Status: Ready';
    statusBadge.className = 'badge badge-neutral';
    errorCallout.style.display = 'none';
    jsonViewer.textContent = JSON.stringify({ info: msg }, null, 2);
  }

  // 4. Form Submit Handler (Sends POST to /api/register)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      fullName: document.getElementById('fullName').value,
      prn: document.getElementById('prn').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      department: document.getElementById('department').value,
      academicYear: document.getElementById('academicYear').value,
      cgpa: document.getElementById('cgpa').value,
      skills: document.getElementById('skills').value,
      agreeTerms: document.getElementById('agreeTerms').checked
    };

    const startTime = performance.now();

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const latency = Math.round(performance.now() - startTime);
      const data = await response.json();

      renderInspector(response.status, latency, data);

      if (response.status === 201) {
        fetchStudents();
        fetchServerStats();
      }
    } catch (err) {
      const latency = Math.round(performance.now() - startTime);
      renderInspector(500, latency, {
        error: 'Network Error',
        message: err.message
      });
    }
  });

  // 5. Render Server Response in Inspector
  function renderInspector(status, latency, data) {
    statusCodeText.textContent = `${status} ${getStatusName(status)}`;
    statusCodeText.className = `status-code-display status-code-${status}`;
    latencyText.textContent = `${latency} ms`;

    if (status === 201) {
      statusBadge.textContent = '201 Created (Valid)';
      statusBadge.className = 'badge badge-node';
      errorCallout.style.display = 'none';
    } else if (status === 400) {
      statusBadge.textContent = '400 Bad Request (Invalid)';
      statusBadge.className = 'badge badge-outcome';
      showErrorCallout(data.errors);
    } else if (status === 409) {
      statusBadge.textContent = '409 Conflict (Duplicate)';
      statusBadge.className = 'badge badge-outcome';
      errorCallout.style.display = 'block';
      errorItemsList.innerHTML = `<li>⚠️ <strong>${data.conflictField.toUpperCase()}:</strong> ${escapeHTML(data.message)}</li>`;
    } else {
      statusBadge.textContent = `${status} Error`;
      statusBadge.className = 'badge badge-neutral';
      errorCallout.style.display = 'none';
    }

    jsonViewer.textContent = JSON.stringify(data, null, 2);
  }

  function showErrorCallout(errors) {
    if (!errors || Object.keys(errors).length === 0) {
      errorCallout.style.display = 'none';
      return;
    }
    errorCallout.style.display = 'block';
    errorItemsList.innerHTML = Object.entries(errors).map(([field, msg]) => `
      <li>• <strong>${escapeHTML(field)}:</strong> ${escapeHTML(msg)}</li>
    `).join('');
  }

  function getStatusName(status) {
    switch (status) {
      case 200: return 'OK';
      case 201: return 'Created';
      case 400: return 'Bad Request';
      case 404: return 'Not Found';
      case 409: return 'Conflict';
      case 500: return 'Internal Server Error';
      default: return '';
    }
  }

  // 6. Fetch Server Health Statistics
  async function fetchServerStats() {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        serverRuntime.textContent = `${data.server.nodeVersion} (${data.server.platform})`;
        nodeVersionBadge.textContent = `Node ${data.server.nodeVersion}`;
        serverMemory.textContent = `${data.server.memoryUsageMB.rss} MB`;
        registeredCount.textContent = `${data.application.totalRegisteredStudents} Students`;
      }
    } catch (e) {
      serverLiveStatus.textContent = '● Offline / Error';
      serverLiveStatus.className = 'kpi-val text-red';
    }
  }

  // 7. Fetch and Render Registered Students Directory
  async function fetchStudents() {
    try {
      const res = await fetch('/api/students');
      if (res.ok) {
        const data = await res.json();
        renderStudentsTable(data.students);
        registeredCount.textContent = `${data.total} Students`;
      }
    } catch (e) {
      studentsTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Failed to load records from server.</td></tr>';
    }
  }

  function renderStudentsTable(students) {
    if (!students || students.length === 0) {
      studentsTableBody.innerHTML = '<tr><td colspan="8" class="text-center">No student records stored yet.</td></tr>';
      return;
    }

    studentsTableBody.innerHTML = students.map((s) => `
      <tr>
        <td class="font-mono text-sm">${escapeHTML(s.id)}</td>
        <td><strong>${escapeHTML(s.prn)}</strong></td>
        <td>${escapeHTML(s.fullName)}</td>
        <td><span class="badge badge-course">${escapeHTML(s.department)}</span></td>
        <td class="text-sm">${escapeHTML(s.academicYear)}</td>
        <td><strong>${Number(s.cgpa).toFixed(2)}</strong></td>
        <td class="text-sm text-muted">${escapeHTML((s.skills || []).join(', '))}</td>
        <td>
          <button type="button" class="btn-delete-record" onclick="window.deleteStudent('${s.id}')">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  // Global Delete Student Handler
  window.deleteStudent = async function(id) {
    if (!confirm(`Delete student record '${id}' from server filesystem?`)) return;
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchStudents();
        fetchServerStats();
      }
    } catch (e) {
      alert('Failed to delete student');
    }
  };

  // 8. Stream Server Logs
  btnFetchLogs.addEventListener('click', async () => {
    logStreamContainer.style.display = 'block';
    logStreamBody.textContent = 'Connecting to NodeJS log stream (data/server.log)...';

    try {
      const res = await fetch('/api/stream/logs');
      if (res.ok) {
        const text = await res.text();
        logStreamBody.textContent = text || '[Empty log stream]';
        logStreamBody.scrollTop = logStreamBody.scrollHeight;
      }
    } catch (e) {
      logStreamBody.textContent = 'Error streaming logs: ' + e.message;
    }
  });

  btnCloseLogs.addEventListener('click', () => {
    logStreamContainer.style.display = 'none';
  });

  // 9. Copy JSON Button
  btnCopyJSON.addEventListener('click', () => {
    navigator.clipboard.writeText(jsonViewer.textContent).then(() => {
      btnCopyJSON.textContent = '✓ Copied!';
      setTimeout(() => btnCopyJSON.textContent = '📋 Copy', 2000);
    });
  });

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
