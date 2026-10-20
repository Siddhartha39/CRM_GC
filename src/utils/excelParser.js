import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { normalizePhoneNumber } from './validation';

/**
 * Supported File Extensions
 */
export const SUPPORTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];
export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

/**
 * Sanitize cell values against formula injection (CSV/Excel injection).
 * Strips leading =, +, -, @, tab, return characters.
 */
export function sanitizeCellValue(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val;

  const str = String(val).trim();
  if (!str) return '';

  // Prevent formula injection
  if (/^[=+\-@\t\r]/.test(str)) {
    return str.replace(/^[=+\-@\t\r]+/, '').trim();
  }
  return str;
}

/**
 * Converts Excel date serial codes or strings into standard YYYY-MM-DD.
 * Handles Excel serial numbers (e.g., 45234 -> 2023-11-04),
 * JS Date objects, and various string formats (DD/MM/YYYY, YYYY-MM-DD, etc.).
 */
export function parseExcelDate(val) {
  if (val === null || val === undefined || val === '') return null;

  // If already a JS Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // If it's a numeric serial number (Excel epoch: 1899-12-30)
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
      // Fallback calculation for serial
      const dateObj = new Date(Math.round((numVal - 25569) * 86400 * 1000));
      if (!isNaN(dateObj.getTime())) {
        const y = dateObj.getUTCFullYear();
        const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch (e) {
      console.warn('Error parsing serial date:', e);
    }
  }

  // If string representation
  if (typeof val === 'string') {
    const s = val.trim();
    if (!s) return null;

    // Check if it's a numeric string serial like "45234"
    if (/^\d{5}(\.\d+)?$/.test(s)) {
      return parseExcelDate(parseFloat(s));
    }

    // YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) {
      const parts = s.split('T')[0].split(' ')[0].split('-');
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmy) {
      const d = dmy[1].padStart(2, '0');
      const m = dmy[2].padStart(2, '0');
      const y = dmy[3];
      return `${y}-${m}-${d}`;
    }

    // MM/DD/YYYY if valid date
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

/**
 * Standardizes cell text to preserve phone numbers properly.
 * Prevents loss of leading zeroes (e.g. "09839012345") or conversion to scientific notation.
 */
export function parsePhoneCell(raw) {
  if (raw === null || raw === undefined) return '';

  let str = String(raw).trim();
  // If scientific notation e.g. "9.83901E+09" or numeric
  if (typeof raw === 'number' && !isNaN(raw)) {
    str = raw.toLocaleString('fullwide', { useGrouping: false });
  }

  // Strip formula prefixes
  str = sanitizeCellValue(str);
  return str;
}

/**
 * Reads and parses spreadsheet files (.csv, .xlsx, .xls) in the browser.
 * Returns workbook sheets, headers, raw data, and metadata.
 */
export async function parseSpreadsheetFile(file) {
  if (!file) throw new Error('No file provided.');

  const fileName = file.name || 'unnamed';
  const fileExt = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();

  if (!SUPPORTED_EXTENSIONS.includes(fileExt)) {
    throw new Error(
      `Unsupported file format: "${fileExt}". Please upload a .csv, .xlsx, or .xls file.`
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File size exceeds 15MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please upload a smaller file.`
    );
  }

  // 1. CSV handling via PapaParse
  if (fileExt === '.csv') {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        dynamicTyping: false, // Keep values as strings to preserve phone zeros and formats
        complete: (results) => {
          if (!results.data || results.data.length === 0) {
            return reject(new Error('The uploaded CSV file is empty.'));
          }

          const rawHeaders = results.meta.fields || Object.keys(results.data[0]);
          const headers = rawHeaders.map((h) => sanitizeCellValue(h)).filter(Boolean);

          const sanitizedData = results.data
            .filter((row) => Object.values(row).some((v) => String(v).trim().length > 0))
            .map((row) => {
              const cleanRow = {};
              headers.forEach((h) => {
                cleanRow[h] = sanitizeCellValue(row[h]);
              });
              return cleanRow;
            });

          if (sanitizedData.length === 0) {
            return reject(new Error('The CSV file does not contain any valid data rows.'));
          }

          resolve({
            fileType: 'CSV',
            fileName,
            fileSize: file.size,
            activeSheetName: 'CSV Data',
            sheetNames: ['CSV Data'],
            sheets: [
              {
                name: 'CSV Data',
                headers,
                data: sanitizedData,
                rowCount: sanitizedData.length,
              },
            ],
          });
        },
        error: (err) => reject(new Error('Error parsing CSV: ' + err.message)),
      });
    });
  }

  // 2. Excel handling (.xlsx, .xls) via SheetJS
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
    raw: false,
    defval: '',
  });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('The uploaded Excel workbook contains no worksheets.');
  }

  const sheets = workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    // Convert to JSON with raw: false to keep formatted strings for numbers/phones
    const rawRows = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: false,
    });

    let headers = [];
    if (rawRows.length > 0) {
      headers = Object.keys(rawRows[0]).map((h) => sanitizeCellValue(h)).filter(Boolean);
    } else {
      // Check first row of empty sheet
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
        if (cell && cell.v) headers.push(sanitizeCellValue(cell.v));
      }
    }

    const sanitizedData = rawRows
      .filter((row) => Object.values(row).some((v) => String(v).trim().length > 0))
      .map((row) => {
        const cleanRow = {};
        headers.forEach((h) => {
          cleanRow[h] = sanitizeCellValue(row[h]);
        });
        return cleanRow;
      });

    return {
      name: sheetName,
      headers,
      data: sanitizedData,
      rowCount: sanitizedData.length,
    };
  });

  const activeSheet = sheets[0];
  if (!activeSheet || activeSheet.data.length === 0) {
    // Check if any sheet has data
    const sheetWithData = sheets.find((s) => s.data.length > 0);
    if (!sheetWithData) {
      throw new Error('The selected Excel workbook does not contain any data rows.');
    }
  }

  return {
    fileType: fileExt === '.xlsx' ? 'XLSX' : 'XLS',
    fileName,
    fileSize: file.size,
    activeSheetName: sheets[0].name,
    sheetNames: workbook.SheetNames,
    sheets,
  };
}

/**
 * Auto-detect column mapping between uploaded headers and Galaxy Computers CRM schema.
 */
export function autoMapColumns(headers = []) {
  const map = {
    fullName: '',
    phone: '',
    alternatePhone: '',
    email: '',
    city: '',
    address: '',
    requirement: '',
    budget: '',
    leadCategory: '',
    leadStatus: '',
    lastCallDate: '',
    nextFollowUpDate: '',
    latestFeedback: '',
    source: '',
    assignedTo: '',
  };

  headers.forEach((h) => {
    const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Full Name
    if (!map.fullName && (lower.includes('name') || lower.includes('customer') || lower.includes('client') || lower.includes('buyer') || lower.includes('contactperson'))) {
      map.fullName = h;
    }
    // Primary Mobile
    else if (!map.phone && (lower.includes('mobile') || lower.includes('phone') || lower.includes('contact') || lower.includes('whatsapp') || lower.includes('cell') || lower.includes('primaryphone'))) {
      map.phone = h;
    }
    // Alternate Mobile
    else if (!map.alternatePhone && (lower.includes('alt') || lower.includes('secondary') || lower.includes('otherphone') || lower.includes('landline'))) {
      map.alternatePhone = h;
    }
    // Email
    else if (!map.email && (lower.includes('email') || lower.includes('mail'))) {
      map.email = h;
    }
    // City
    else if (!map.city && (lower.includes('city') || lower.includes('town') || lower.includes('district') || lower.includes('location'))) {
      map.city = h;
    }
    // Address
    else if (!map.address && (lower.includes('address') || lower.includes('street') || lower.includes('colony') || lower.includes('mohalla'))) {
      map.address = h;
    }
    // Requirement
    else if (!map.requirement && (lower.includes('req') || lower.includes('product') || lower.includes('model') || lower.includes('laptop') || lower.includes('desktop') || lower.includes('item') || lower.includes('interest'))) {
      map.requirement = h;
    }
    // Budget
    else if (!map.budget && (lower.includes('budget') || lower.includes('price') || lower.includes('amount') || lower.includes('cost') || lower.includes('inr'))) {
      map.budget = h;
    }
    // Lead Category
    else if (!map.leadCategory && (lower.includes('category') || lower.includes('priority') || lower.includes('leadtype') || lower.includes('stage') || lower.includes('hot'))) {
      map.leadCategory = h;
    }
    // Lead Status
    else if (!map.leadStatus && (lower.includes('status') || lower.includes('disposition') || lower.includes('state'))) {
      map.leadStatus = h;
    }
    // Last Call Date
    else if (!map.lastCallDate && (lower.includes('lastcall') || lower.includes('calldate') || lower.includes('calledon') || lower.includes('lastcontact'))) {
      map.lastCallDate = h;
    }
    // Next Follow-up Date
    else if (!map.nextFollowUpDate && (lower.includes('followup') || lower.includes('nextcall') || lower.includes('callback') || lower.includes('duedate') || lower.includes('nextcontact'))) {
      map.nextFollowUpDate = h;
    }
    // Latest Feedback
    else if (!map.latestFeedback && (lower.includes('feedback') || lower.includes('notes') || lower.includes('remarks') || lower.includes('comment') || lower.includes('discussion'))) {
      map.latestFeedback = h;
    }
    // Customer Source
    else if (!map.source && (lower.includes('source') || lower.includes('channel') || lower.includes('leadsource') || lower.includes('platform') || lower.includes('campaign'))) {
      map.source = h;
    }
    // Assigned Employee
    else if (!map.assignedTo && (lower.includes('assigned') || lower.includes('employee') || lower.includes('executive') || lower.includes('staff') || lower.includes('caller') || lower.includes('agent'))) {
      map.assignedTo = h;
    }
  });

  return map;
}

/**
 * Validates and analyzes rows against CRM schema and existing customer phone map.
 */
export function analyzeImportRows({ rows = [], columnMapping = {}, existingPhoneMap = new Map() }) {
  const seenBatchPhones = new Set();
  const validRows = [];
  const duplicateRows = [];
  const invalidRows = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const errors = [];
    const warnings = [];

    // 1. Extract values
    const rawName = columnMapping.fullName ? sanitizeCellValue(row[columnMapping.fullName]) : '';
    const rawPhone = columnMapping.phone ? parsePhoneCell(row[columnMapping.phone]) : '';
    const rawAltPhone = columnMapping.alternatePhone ? parsePhoneCell(row[columnMapping.alternatePhone]) : '';
    const rawEmail = columnMapping.email ? sanitizeCellValue(row[columnMapping.email]) : '';
    const rawCity = columnMapping.city ? sanitizeCellValue(row[columnMapping.city]) : 'Kanpur';
    const rawAddress = columnMapping.address ? sanitizeCellValue(row[columnMapping.address]) : '';
    const rawRequirement = columnMapping.requirement ? sanitizeCellValue(row[columnMapping.requirement]) : '';
    const rawBudget = columnMapping.budget ? sanitizeCellValue(row[columnMapping.budget]) : '';
    const rawCategory = columnMapping.leadCategory ? sanitizeCellValue(row[columnMapping.leadCategory]) : '';
    const rawStatus = columnMapping.leadStatus ? sanitizeCellValue(row[columnMapping.leadStatus]) : '';
    const rawLastCall = columnMapping.lastCallDate ? row[columnMapping.lastCallDate] : '';
    const rawFollowUp = columnMapping.nextFollowUpDate ? row[columnMapping.nextFollowUpDate] : '';
    const rawFeedback = columnMapping.latestFeedback ? sanitizeCellValue(row[columnMapping.latestFeedback]) : '';
    const rawSource = columnMapping.source ? sanitizeCellValue(row[columnMapping.source]) : 'Excel Import';
    const rawAssigned = columnMapping.assignedTo ? sanitizeCellValue(row[columnMapping.assignedTo]) : '';

    // 2. Validate Name
    if (!rawName || rawName.trim().length < 2) {
      errors.push('Customer Name is missing or too short (minimum 2 characters required)');
    }

    // 3. Validate Phone
    const normPhone = normalizePhoneNumber(rawPhone);
    if (!normPhone) {
      errors.push('Mobile number is missing');
    } else if (normPhone.length !== 10) {
      errors.push(`Invalid mobile number "${rawPhone}" (${normPhone.length} digits, must be 10 digits)`);
    }

    // 4. Validate Alternate Phone
    const normAltPhone = rawAltPhone ? normalizePhoneNumber(rawAltPhone) : '';
    if (rawAltPhone && normAltPhone && normAltPhone.length !== 10) {
      warnings.push(`Alternate phone "${rawAltPhone}" is not a 10-digit number`);
    }

    // 5. Validate Email
    if (rawEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      warnings.push(`Email address "${rawEmail}" format is irregular`);
    }

    // 6. Validate Budget
    let cleanBudget = null;
    if (rawBudget) {
      const num = Number(String(rawBudget).replace(/[^0-9.]/g, ''));
      if (!isNaN(num) && num > 0) {
        cleanBudget = num;
      } else {
        warnings.push(`Budget "${rawBudget}" is not numeric and will be stored as null`);
      }
    }

    // 7. Validate Category (Hot, Warm, Cold)
    let cleanCategory = 'Cold';
    if (rawCategory) {
      const catLower = rawCategory.toLowerCase();
      if (catLower.includes('hot')) cleanCategory = 'Hot';
      else if (catLower.includes('warm')) cleanCategory = 'Warm';
      else cleanCategory = 'Cold';
    }

    // 8. Validate Status
    let cleanStatus = 'New';
    if (rawStatus) {
      const stLower = rawStatus.toLowerCase();
      if (stLower.includes('convert')) cleanStatus = 'Converted';
      else if (stLower.includes('contact')) cleanStatus = 'Contacted';
      else if (stLower.includes('follow')) cleanStatus = 'Follow-up';
      else if (stLower.includes('lost')) cleanStatus = 'Lost';
      else if (stLower.includes('do not') || stLower.includes('dnd')) cleanStatus = 'Do Not Contact';
      else cleanStatus = 'New';
    }

    // 9. Dates
    const parsedLastCallDate = rawLastCall ? parseExcelDate(rawLastCall) : null;
    if (rawLastCall && !parsedLastCallDate) {
      warnings.push(`Could not parse last call date "${rawLastCall}"`);
    }

    const parsedFollowUpDate = rawFollowUp ? parseExcelDate(rawFollowUp) : null;
    if (rawFollowUp && !parsedFollowUpDate) {
      warnings.push(`Could not parse follow-up date "${rawFollowUp}"`);
    }

    // Normalized record
    const normalizedRecord = {
      rowNumber,
      fullName: rawName.trim(),
      phone: normPhone || rawPhone,
      normalizedPhone: normPhone,
      alternatePhone: normAltPhone || rawAltPhone,
      email: rawEmail.trim(),
      city: rawCity.trim() || 'Kanpur',
      address: rawAddress.trim(),
      requirement: rawRequirement.trim(),
      budget: cleanBudget,
      leadCategory: cleanCategory,
      leadStatus: cleanStatus,
      lastCallDate: parsedLastCallDate,
      nextFollowUpDate: parsedFollowUpDate,
      latestFeedback: rawFeedback.trim(),
      source: rawSource.trim() || 'Excel Import',
      assignedTo: rawAssigned.trim(),
      rawRow: row,
      errors,
      warnings,
    };

    // Categorization: Check if invalid
    if (errors.length > 0) {
      invalidRows.push({
        ...normalizedRecord,
        rejectionReason: errors.join('; '),
      });
      return;
    }

    // Check duplicate
    let isDbDuplicate = false;
    let existingCustomer = null;
    if (existingPhoneMap && existingPhoneMap.has(normPhone)) {
      isDbDuplicate = true;
      existingCustomer = existingPhoneMap.get(normPhone);
    }

    const isBatchDuplicate = seenBatchPhones.has(normPhone);
    seenBatchPhones.add(normPhone);

    if (isDbDuplicate || isBatchDuplicate) {
      const dupReason = isDbDuplicate
        ? `Phone already registered in database (${existingCustomer?.fullName || 'Existing Lead'}, ID: ${existingCustomer?.customerId || 'N/A'})`
        : `Duplicate mobile number within the same import file`;

      duplicateRows.push({
        ...normalizedRecord,
        isDbDuplicate,
        isBatchDuplicate,
        existingCustomer,
        rejectionReason: dupReason,
      });
    } else {
      validRows.push(normalizedRecord);
    }
  });

  return {
    totalRows: rows.length,
    validRows,
    duplicateRows,
    invalidRows,
    hasErrors: invalidRows.length > 0,
    hasDuplicates: duplicateRows.length > 0,
  };
}

/**
 * Generates a downloadable CSV containing all rejected/skipped rows with error details.
 */
export function generateRejectedRowsCSV(rejectedRows = []) {
  if (!rejectedRows || rejectedRows.length === 0) return null;

  const exportData = rejectedRows.map((r) => ({
    Row_Number: r.rowNumber,
    Rejection_Reason: r.rejectionReason || r.errors?.join('; ') || 'Validation Failed',
    Customer_Name: r.fullName || '',
    Mobile_Number: r.phone || '',
    Requirement: r.requirement || '',
    Budget: r.budget || '',
    Lead_Category: r.leadCategory || '',
    City: r.city || '',
    Warnings: r.warnings?.join('; ') || '',
  }));

  const csv = Papa.unparse(exportData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  return blob;
}

/**
 * Generates a standard sample Excel or CSV workbook with headers and realistic Kanpur store data.
 */
export function generateSampleWorkbook(format = 'xlsx') {
  const sampleData = [
    {
      'Customer Name': 'Amit Tripathi',
      'Mobile Number': '9839012345',
      'Alternate Mobile': '9415012345',
      'Email': 'amit.tripathi@gmail.com',
      'City': 'Kanpur',
      'Address': '12/450 Swaroop Nagar',
      'Product Requirement': 'HP Pavilion 16GB Core i5 Laptop for student use',
      'Budget': 58000,
      'Lead Category': 'Hot',
      'Lead Status': 'New',
      'Last Call Date': '2026-10-18',
      'Next Follow-Up Date': '2026-10-22',
      'Latest Feedback': 'Visited counter on Sunday, wants delivery before Diwali offer ends',
      'Lead Source': 'Walk-in Store',
      'Assigned Employee': 'admin@galaxycomputers.in',
    },
    {
      'Customer Name': 'Dr. S. K. Nigam Clinic',
      'Mobile Number': '9839123456',
      'Alternate Mobile': '',
      'Email': 'sknigam@yahoo.com',
      'City': 'Kanpur',
      'Address': 'Gumti No. 5',
      'Product Requirement': '3 Desktop Systems with UPS + 1 HP LaserJet Printer for clinic reception',
      'Budget': 95000,
      'Lead Category': 'Warm',
      'Lead Status': 'Contacted',
      'Last Call Date': '2026-10-15',
      'Next Follow-Up Date': '2026-10-25',
      'Latest Feedback': 'Quotation shared on WhatsApp. Will confirm after hospital committee meeting',
      'Lead Source': 'WhatsApp Inquiry',
      'Assigned Employee': 'admin@galaxycomputers.in',
    },
    {
      'Customer Name': 'Vikas Bajpai',
      'Mobile Number': '9839234567',
      'Alternate Mobile': '',
      'Email': 'vikas.gaming@gmail.com',
      'City': 'Kanpur',
      'Address': 'Govind Nagar',
      'Product Requirement': 'Custom Gaming PC RTX 4060 8GB, Ryzen 5 7600, 32GB RAM, 1TB NVMe',
      'Budget': 85000,
      'Lead Category': 'Hot',
      'Lead Status': 'Follow-up',
      'Last Call Date': '2026-10-19',
      'Next Follow-Up Date': '2026-10-21',
      'Latest Feedback': 'Comparing price with Nehru Place online quote. Ready if we match warranty',
      'Lead Source': 'JustDial',
      'Assigned Employee': 'admin@galaxycomputers.in',
    },
    {
      'Customer Name': 'Kanpur Logistics Pvt Ltd',
      'Mobile Number': '9415123456',
      'Alternate Mobile': '0512254321',
      'Email': 'purchase@kanpurlogistics.com',
      'City': 'Kanpur',
      'Address': 'Fazalganj Industrial Area',
      'Product Requirement': '8 Hikvision IP CCTV Cameras with 16ch NVR and 4TB surveillance hard disk',
      'Budget': 65000,
      'Lead Category': 'Warm',
      'Lead Status': 'New',
      'Last Call Date': '',
      'Next Follow-Up Date': '2026-10-24',
      'Latest Feedback': 'Site visit requested for cable layout estimation in warehouse',
      'Lead Source': 'IndiaMART',
      'Assigned Employee': 'admin@galaxycomputers.in',
    },
    {
      'Customer Name': 'Pooja Agarwal',
      'Mobile Number': '9839345678',
      'Alternate Mobile': '',
      'Email': '',
      'City': 'Kanpur',
      'Address': 'Civil Lines',
      'Product Requirement': 'Dell Refurbished Laptop under ₹25,000 for accounts work',
      'Budget': 22000,
      'Lead Category': 'Cold',
      'Lead Status': 'New',
      'Last Call Date': '',
      'Next Follow-Up Date': '2026-10-28',
      'Latest Feedback': 'General inquiry, looking for clean condition with 6 months warranty',
      'Lead Source': 'Referral',
      'Assigned Employee': 'admin@galaxycomputers.in',
    },
  ];

  if (format === 'csv') {
    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    return { blob, filename: 'Galaxy_Computers_Import_Template.csv' };
  }

  // Create XLSX
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths for readability
  ws['!cols'] = [
    { wch: 24 }, // Customer Name
    { wch: 16 }, // Mobile Number
    { wch: 16 }, // Alternate Mobile
    { wch: 25 }, // Email
    { wch: 12 }, // City
    { wch: 28 }, // Address
    { wch: 45 }, // Product Requirement
    { wch: 12 }, // Budget
    { wch: 14 }, // Lead Category
    { wch: 14 }, // Lead Status
    { wch: 15 }, // Last Call Date
    { wch: 20 }, // Next Follow-Up Date
    { wch: 45 }, // Latest Feedback
    { wch: 16 }, // Lead Source
    { wch: 25 }, // Assigned Employee
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Galaxy Customers');
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  return { blob, filename: 'Galaxy_Computers_Import_Template.xlsx' };
}
