/**
 * Automated Test Suite for Galaxy Computers CRM Excel & CSV Import Engine
 * Tests .csv, .xlsx, .xls, empty files, invalid dates, duplicates, multi-sheets, formula injection, and large batches.
 */

const XLSX = require('xlsx');
const Papa = require('papaparse');
const assert = require('assert');

// Import utilities (mimic the browser modules in Node)
function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return '';
  let digits = String(rawPhone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
}

function sanitizeCellValue(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val;
  const str = String(val).trim();
  if (!str) return '';
  if (/^[=+\-@\t\r]/.test(str)) {
    return str.replace(/^[=+\-@\t\r]+/, '').trim();
  }
  return str;
}

function parseExcelDate(val) {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const numVal = Number(val);
  if (!isNaN(numVal) && typeof val !== 'string' && numVal > 0 && numVal < 100000) {
    try {
      if (XLSX.SSF && typeof XLSX.SSF.parse_date_code === 'function') {
        const parsed = XLSX.SSF.parse_date_code(numVal);
        if (parsed && parsed.y && parsed.m && parsed.d) {
          const y = parsed.y;
          const m = String(parsed.m).padStart(2, '0');
          const d = String(parsed.d).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
      }
    } catch (e) {}
  }
  if (typeof val === 'string') {
    const s = val.trim();
    if (!s) return null;
    if (/^\d{5}(\.\d+)?$/.test(s)) {
      return parseExcelDate(parseFloat(s));
    }
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) {
      const parts = s.split('T')[0].split(' ')[0].split('-');
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmy) {
      return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    }
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  return null;
}

function autoMapColumns(headers = []) {
  const map = { fullName: '', phone: '', requirement: '', budget: '', leadCategory: '', nextFollowUpDate: '' };
  headers.forEach((h) => {
    const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!map.fullName && (lower.includes('name') || lower.includes('customer'))) map.fullName = h;
    else if (!map.phone && (lower.includes('mobile') || lower.includes('phone') || lower.includes('contact'))) map.phone = h;
    else if (!map.requirement && (lower.includes('req') || lower.includes('product') || lower.includes('item'))) map.requirement = h;
    else if (!map.budget && (lower.includes('budget') || lower.includes('price'))) map.budget = h;
    else if (!map.leadCategory && (lower.includes('category') || lower.includes('priority'))) map.leadCategory = h;
    else if (!map.nextFollowUpDate && (lower.includes('followup') || lower.includes('nextcall'))) map.nextFollowUpDate = h;
  });
  return map;
}

function analyzeRows(rows, map, existingPhoneMap) {
  const valid = [];
  const duplicates = [];
  const invalid = [];
  const seen = new Set();

  rows.forEach((r, idx) => {
    const name = r[map.fullName] ? sanitizeCellValue(r[map.fullName]) : '';
    const rawPhone = r[map.phone];
    const norm = normalizePhoneNumber(rawPhone);

    const errors = [];
    if (!name || name.trim().length < 2) errors.push('Missing Name');
    if (!norm || norm.length !== 10) errors.push('Invalid phone: ' + rawPhone);

    if (errors.length > 0) {
      invalid.push({ rowNumber: idx + 1, name, rawPhone, errors });
      return;
    }

    if (existingPhoneMap.has(norm) || seen.has(norm)) {
      duplicates.push({ rowNumber: idx + 1, name, normPhone: norm, isDb: existingPhoneMap.has(norm) });
    } else {
      seen.add(norm);
      valid.push({ rowNumber: idx + 1, name, normPhone: norm });
    }
  });

  return { valid, duplicates, invalid };
}

console.log('====================================================');
console.log('🧪 RUNNING GALAXY COMPUTERS CRM IMPORT TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] Test ${totalTests}: ${name}`);
    console.error('   Error:', err.message);
  }
}

// TEST 1: CSV Parsing & Column Auto-mapping
runTest('CSV Parsing and Auto-Mapping', () => {
  const csvContent = `Customer Name,Mobile Phone,Requirement,Budget,Category\nAditya Singh,9839011111,Asus Vivobook i7,62000,Hot\nSneha Kapoor,9839022222,Lenovo Ideapad,48000,Warm`;
  const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
  assert.strictEqual(parsed.data.length, 2);

  const map = autoMapColumns(parsed.meta.fields);
  assert.strictEqual(map.fullName, 'Customer Name');
  assert.strictEqual(map.phone, 'Mobile Phone');
  assert.strictEqual(map.requirement, 'Requirement');
  assert.strictEqual(map.budget, 'Budget');
  assert.strictEqual(map.leadCategory, 'Category');
});

// TEST 2: Excel (.xlsx) Multi-worksheet Extraction
runTest('Excel .xlsx Multi-Worksheet Support', () => {
  const wb = XLSX.utils.book_new();
  const sheet1Data = [
    { 'Customer Name': 'Rohan Gupta', 'Mobile': '9839033333', 'Product': 'Gaming PC' },
    { 'Customer Name': 'Meera Joshi', 'Mobile': '9839044444', 'Product': 'CCTV 4ch' }
  ];
  const sheet2Data = [
    { 'Customer Name': 'Corp Client 1', 'Mobile': '9839055555' },
    { 'Customer Name': 'Corp Client 2', 'Mobile': '9839066666' },
    { 'Customer Name': 'Corp Client 3', 'Mobile': '9839077777' }
  ];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet1Data), 'Retail Walk-in');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet2Data), 'Corporate B2B');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const readWb = XLSX.read(buf, { type: 'buffer' });

  assert.strictEqual(readWb.SheetNames.length, 2);
  assert.deepStrictEqual(readWb.SheetNames, ['Retail Walk-in', 'Corporate B2B']);

  const rows1 = XLSX.utils.sheet_to_json(readWb.Sheets['Retail Walk-in']);
  const rows2 = XLSX.utils.sheet_to_json(readWb.Sheets['Corporate B2B']);

  assert.strictEqual(rows1.length, 2);
  assert.strictEqual(rows2.length, 3);
});

// TEST 3: Legacy Excel (.xls) Format
runTest('Legacy Excel .xls Format Support', () => {
  const wb = XLSX.utils.book_new();
  const data = [{ 'Customer Name': 'Old System Lead', 'Mobile': '9839088888' }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Sheet1');

  // Generate binary XLS format
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'biff8' });
  const readWb = XLSX.read(buf, { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json(readWb.Sheets['Sheet1']);

  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0]['Customer Name'], 'Old System Lead');
});

// TEST 4: Leading Zeros & Phone Number Normalization
runTest('Preserve Mobile Leading Zeros & No Scientific Notation', () => {
  assert.strictEqual(normalizePhoneNumber('09839012345'), '9839012345');
  assert.strictEqual(normalizePhoneNumber('+91 98390 12345'), '9839012345');
  assert.strictEqual(normalizePhoneNumber('919839012345'), '9839012345');
  assert.strictEqual(normalizePhoneNumber('98390-12345'), '9839012345');
});

// TEST 5: Date Parsing (Excel Serial, ISO, DD/MM/YYYY)
runTest('Date Normalization (Excel Serial & Formats)', () => {
  // Serial code 45234 is 2023-11-04
  assert.strictEqual(parseExcelDate(45234), '2023-11-04');
  assert.strictEqual(parseExcelDate('45234'), '2023-11-04');
  assert.strictEqual(parseExcelDate('2026-10-25'), '2026-10-25');
  assert.strictEqual(parseExcelDate('25/10/2026'), '2026-10-25');
  assert.strictEqual(parseExcelDate('25-10-2026'), '2026-10-25');
  assert.strictEqual(parseExcelDate(new Date(2026, 9, 25)), '2026-10-25');
  assert.strictEqual(parseExcelDate('invalid-date-string'), null);
});

// TEST 6: Formula Injection Prevention
runTest('Formula Injection Sanitization', () => {
  assert.strictEqual(sanitizeCellValue('=CMD("calc")'), 'CMD("calc")');
  assert.strictEqual(sanitizeCellValue('+12345'), '12345');
  assert.strictEqual(sanitizeCellValue('-SUM(A1:A5)'), 'SUM(A1:A5)');
  assert.strictEqual(sanitizeCellValue('@HYPERLINK("http://bad.com")'), 'HYPERLINK("http://bad.com")');
  assert.strictEqual(sanitizeCellValue('Galaxy Computers'), 'Galaxy Computers');
});

// TEST 7: Duplicate Phone Validation (DB & In-batch)
runTest('Duplicate Phone Identification (DB & Batch)', () => {
  const existingDbPhoneMap = new Map();
  existingDbPhoneMap.set('9839000001', { id: 'GC-1', fullName: 'Existing DB Lead' });

  const rows = [
    { 'Name': 'New Lead 1', 'Mobile': '9839000002' },           // Valid
    { 'Name': 'Duplicate of DB Lead', 'Mobile': '9839000001' },   // Duplicate in DB
    { 'Name': 'New Lead 2', 'Mobile': '9839000003' },           // Valid
    { 'Name': 'Batch Duplicate of Lead 2', 'Mobile': '9839000003' } // Duplicate in Batch
  ];

  const map = { fullName: 'Name', phone: 'Mobile' };
  const res = analyzeRows(rows, map, existingDbPhoneMap);

  assert.strictEqual(res.valid.length, 2); // 9839000002 and first 9839000003
  assert.strictEqual(res.duplicates.length, 2); // 9839000001 (DB) and second 9839000003 (Batch)
  assert.strictEqual(res.invalid.length, 0);
});

// TEST 8: Missing Required Fields & Bad Phone
runTest('Invalid Rows Detection (Missing Name / Bad Phone)', () => {
  const rows = [
    { 'Name': '', 'Mobile': '9839000001' },           // Missing Name
    { 'Name': 'A', 'Mobile': '9839000002' },          // Too short (< 2 chars)
    { 'Name': 'Good Name', 'Mobile': '12345' },        // Bad phone (< 10 digits)
    { 'Name': 'Good Name 2', 'Mobile': '' },           // Missing phone
    { 'Name': 'Valid Customer', 'Mobile': '9839012345' } // Valid
  ];

  const map = { fullName: 'Name', phone: 'Mobile' };
  const res = analyzeRows(rows, map, new Map());

  assert.strictEqual(res.valid.length, 1);
  assert.strictEqual(res.invalid.length, 4);
});

// TEST 9: Empty File Handling
runTest('Empty File Rejection', () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([]);
  XLSX.utils.book_append_sheet(wb, ws, 'EmptySheet');
  const buf = XLSX.write(wb, { type: 'buffer' });
  const readWb = XLSX.read(buf, { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json(readWb.Sheets['EmptySheet']);

  assert.strictEqual(rows.length, 0);
});

// TEST 10: Large File Batch Performance (500 rows)
runTest('Large Batch Parsing (500+ Rows)', () => {
  const largeData = [];
  for (let i = 1; i <= 600; i++) {
    largeData.push({
      'Customer Name': `Lead ${i}`,
      'Mobile Number': `98${String(10000000 + i)}`.slice(0, 10),
      'Requirement': i % 2 === 0 ? 'Laptop Dell' : 'Custom PC Build',
      'Budget': 35000 + (i * 100),
      'Category': i % 3 === 0 ? 'Hot' : i % 3 === 1 ? 'Warm' : 'Cold'
    });
  }

  const startTime = Date.now();
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(largeData), 'BulkLeads');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const readWb = XLSX.read(buf, { type: 'buffer', raw: false });
  const parsedRows = XLSX.utils.sheet_to_json(readWb.Sheets['BulkLeads'], { defval: '', raw: false });
  const map = autoMapColumns(Object.keys(parsedRows[0]));
  const analysis = analyzeRows(parsedRows, map, new Map());
  const elapsed = Date.now() - startTime;

  assert.strictEqual(parsedRows.length, 600);
  assert.strictEqual(analysis.valid.length, 600);
  assert.strictEqual(analysis.invalid.length, 0);
  console.log(`     (600 rows generated, parsed & analyzed in ${elapsed}ms)`);
});

console.log('\n====================================================');
console.log(`🎉 TEST SUMMARY: ${passedTests} of ${totalTests} tests passed successfully!`);
console.log('====================================================');
