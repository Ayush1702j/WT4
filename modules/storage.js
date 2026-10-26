/**
 * Custom Module: File-Based JSON Data Storage Engine
 * Demonstrates: File System (fs.promises), Asynchronous I/O, Data Serialization
 * Course: Web Technology (2304362L) | Practical No. 4
 */

const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

const DB_FILE_PATH = path.join(__dirname, '..', 'data', 'students.json');

class StorageManager {
  constructor() {
    this.ensureStorageFile();
  }

  ensureStorageFile() {
    const dataDir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE_PATH)) {
      // Seed with initial realistic records
      const initialData = [
        {
          id: 'STU-NODE-101',
          fullName: 'Ayush',
          prn: '2304362',
          email: 'ayush@mitaoe.ac.in',
          phone: '9823012345',
          department: 'Computer Engineering',
          academicYear: 'T.Y. B.Tech (Third Year)',
          cgpa: 9.42,
          skills: ['Node.js', 'Express', 'React', 'MongoDB'],
          registeredAt: '2026-10-27T01:30:00.000Z'
        },
        {
          id: 'STU-NODE-102',
          fullName: 'Rohan Deshmukh',
          prn: '2304112',
          email: 'rohan.d@mitaoe.ac.in',
          phone: '9765432109',
          department: 'Information Technology',
          academicYear: 'T.Y. B.Tech (Third Year)',
          cgpa: 8.85,
          skills: ['Node.js', 'Docker', 'AWS'],
          registeredAt: '2026-10-27T01:45:00.000Z'
        }
      ];
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initialData, null, 2), 'utf8');
    }
  }

  async getAll() {
    try {
      const data = await fs.promises.readFile(DB_FILE_PATH, 'utf8');
      return JSON.parse(data || '[]');
    } catch (err) {
      console.error('[STORAGE ERROR] Failed to read database:', err);
      return [];
    }
  }

  async saveAll(records) {
    try {
      await fs.promises.writeFile(DB_FILE_PATH, JSON.stringify(records, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('[STORAGE ERROR] Failed to write database:', err);
      return false;
    }
  }

  async addStudent(sanitizedData) {
    const records = await this.getAll();

    // Check duplicate PRN
    const prnExists = records.some((r) => r.prn.toUpperCase() === sanitizedData.prn.toUpperCase());
    if (prnExists) {
      return { success: false, conflict: 'prn', message: `PRN '${sanitizedData.prn}' is already registered on this server.` };
    }

    // Check duplicate Email
    const emailExists = records.some((r) => r.email.toLowerCase() === sanitizedData.email.toLowerCase());
    if (emailExists) {
      return { success: false, conflict: 'email', message: `Email '${sanitizedData.email}' is already registered on this server.` };
    }

    const newStudent = {
      id: `STU-NODE-${Math.floor(100 + Math.random() * 900)}`,
      ...sanitizedData,
      registeredAt: new Date().toISOString()
    };

    records.unshift(newStudent);
    await this.saveAll(records);

    return { success: true, record: newStudent };
  }

  async deleteStudent(id) {
    const records = await this.getAll();
    const filtered = records.filter((r) => r.id !== id);
    if (filtered.length === records.length) return false;
    await this.saveAll(filtered);
    return true;
  }

  /**
   * Generates a readable stream of CSV formatted student records
   * Demonstrates NodeJS Stream capability
   */
  async createCsvStream() {
    const records = await this.getAll();
    const headers = 'ID,Full Name,PRN,Email,Phone,Department,Year,CGPA,Skills,Registered At\n';
    
    const rows = records.map((r) => {
      const skillsStr = `"${(r.skills || []).join('; ')}"`;
      return `"${r.id}","${r.fullName}","${r.prn}","${r.email}","${r.phone}","${r.department}","${r.academicYear}",${r.cgpa},${skillsStr},"${r.registeredAt}"`;
    }).join('\n');

    return Readable.from([headers + rows]);
  }
}

const storageManager = new StorageManager();

module.exports = storageManager;
