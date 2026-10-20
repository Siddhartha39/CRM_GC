import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { getCustomers } from '../../services/customerService';
import { executeBulkImport, getExistingCustomerPhoneMap } from '../../services/importService';
import {
  parseSpreadsheetFile,
  autoMapColumns,
  analyzeImportRows,
  generateRejectedRowsCSV,
  generateSampleWorkbook,
  SUPPORTED_EXTENSIONS,
} from '../../utils/excelParser';
import { formatKolkataDateTime } from '../../utils/dates';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  FileText,
  RefreshCw,
  Layers,
  ArrowRight,
  Eye,
  Check,
  X,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

export function ImportExportPage() {
  const { user } = useAuth();

  // File & Workbook State
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedWorkbook, setParsedWorkbook] = useState(null);
  const [activeSheetName, setActiveSheetName] = useState('');
  const [currentSheetData, setCurrentSheetData] = useState([]);
  const [currentSheetHeaders, setCurrentSheetHeaders] = useState([]);

  // Column Mapping State
  const [columnMapping, setColumnMapping] = useState({
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
  });

  // Database Phone Map for instant pre-import duplicate validation
  const [existingPhoneMap, setExistingPhoneMap] = useState(new Map());
  const [loadingDbMap, setLoadingDbMap] = useState(false);

  // Validation Analysis State
  const [analysis, setAnalysis] = useState(null);

  // Duplicate Handling Mode: 'skip' | 'update' | 'add_only'
  const [duplicateMode, setDuplicateMode] = useState('skip');

  // Preview Pagination State (10-20 rows)
  const [previewPage, setPreviewPage] = useState(1);
  const PREVIEW_PAGE_SIZE = 15;

  // Import Execution & Progress State
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, percentage: 0, statusText: '' });
  const [importResults, setImportResults] = useState(null);

  // Export State
  const [exportCategory, setExportCategory] = useState('All');
  const [exportFormat, setExportFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);

  // Load database customer phone map on mount
  useEffect(() => {
    async function loadPhoneMap() {
      setLoadingDbMap(true);
      try {
        const map = await getExistingCustomerPhoneMap();
        setExistingPhoneMap(map);
      } catch (e) {
        console.warn('Error loading existing customer map:', e);
      } finally {
        setLoadingDbMap(false);
      }
    }
    loadPhoneMap();
  }, []);

  // Handle file drop / input selection
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImportResults(null);
    setAnalysis(null);
    setPreviewPage(1);

    try {
      toast.loading('Analyzing spreadsheet file...', { id: 'file-load' });
      const parsed = await parseSpreadsheetFile(file);
      setParsedWorkbook(parsed);

      const firstSheet = parsed.sheets[0];
      setActiveSheetName(firstSheet.name);
      setCurrentSheetHeaders(firstSheet.headers);
      setCurrentSheetData(firstSheet.data);

      // Auto-guess column mappings
      const autoMap = autoMapColumns(firstSheet.headers);
      setColumnMapping(autoMap);

      toast.success(`Loaded "${file.name}" (${firstSheet.data.length} rows in sheet "${firstSheet.name}")`, {
        id: 'file-load',
      });
    } catch (err) {
      console.error('File parse error:', err);
      toast.error(err.message, { id: 'file-load' });
      setSelectedFile(null);
      setParsedWorkbook(null);
    }
  };

  // Handle switching active worksheet (for multi-sheet Excel files)
  const handleSheetChange = (sheetName) => {
    if (!parsedWorkbook) return;
    const sheet = parsedWorkbook.sheets.find((s) => s.name === sheetName);
    if (!sheet) return;

    setActiveSheetName(sheetName);
    setCurrentSheetHeaders(sheet.headers);
    setCurrentSheetData(sheet.data);
    setPreviewPage(1);
    setImportResults(null);

    // Auto map for new sheet
    const autoMap = autoMapColumns(sheet.headers);
    setColumnMapping(autoMap);
    toast.info(`Switched to worksheet "${sheetName}" (${sheet.data.length} rows)`);
  };

  // Re-run validation analysis whenever data, column mapping, or existing database phone map changes
  useEffect(() => {
    if (!currentSheetData || currentSheetData.length === 0) {
      setAnalysis(null);
      return;
    }

    const result = analyzeImportRows({
      rows: currentSheetData,
      columnMapping,
      existingPhoneMap,
    });
    setAnalysis(result);
  }, [currentSheetData, columnMapping, existingPhoneMap]);

  // Execute bulk import
  const handleStartImport = async () => {
    if (!columnMapping.fullName || !columnMapping.phone) {
      toast.error('Please map Customer Full Name and Primary Mobile Number.');
      return;
    }

    if (!analysis || analysis.validRows.length + analysis.duplicateRows.length === 0) {
      toast.error('No valid or processable rows found to import.');
      return;
    }

    // Determine records to process based on duplicate mode
    let recordsToProcess = [];
    if (duplicateMode === 'skip') {
      recordsToProcess = [...analysis.validRows];
    } else if (duplicateMode === 'update') {
      recordsToProcess = [...analysis.validRows, ...analysis.duplicateRows];
    } else if (duplicateMode === 'add_only') {
      recordsToProcess = [...analysis.validRows];
    }

    if (recordsToProcess.length === 0) {
      toast.error('All rows in this spreadsheet are duplicates. Choose "Update matching customers" if you wish to apply updates.');
      return;
    }

    setImporting(true);
    setImportProgress({ current: 0, total: recordsToProcess.length, percentage: 0, statusText: 'Starting import...' });

    try {
      const summary = await executeBulkImport({
        recordsToImport: recordsToProcess,
        duplicateMode,
        user,
        onProgress: (prog) => setImportProgress(prog),
      });

      // Include initial invalid rows in rejected records summary
      summary.rejectedRecords = [
        ...analysis.invalidRows,
        ...(summary.rejectedRecords || []),
      ];

      setImportResults(summary);

      // Refresh database phone map so subsequent checks reflect newly added leads
      const refreshedMap = await getExistingCustomerPhoneMap();
      setExistingPhoneMap(refreshedMap);

      toast.success(
        `Import complete! ${summary.imported} added, ${summary.updated} updated, ${summary.skipped} skipped.`
      );
    } catch (err) {
      console.error('Import failed:', err);
      toast.error('Import error: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  // Download rejected rows as CSV
  const handleDownloadRejectedCSV = () => {
    let rowsToReject = [];
    if (importResults && importResults.rejectedRecords?.length > 0) {
      rowsToReject = importResults.rejectedRecords;
    } else if (analysis) {
      rowsToReject = [
        ...analysis.invalidRows,
        ...(duplicateMode === 'skip' ? analysis.duplicateRows : []),
      ];
    }

    if (rowsToReject.length === 0) {
      toast.info('No rejected or error rows to download.');
      return;
    }

    const blob = generateRejectedRowsCSV(rowsToReject);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rejected_Rows_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${rowsToReject.length} rejected rows with error reasons.`);
  };

  // Download sample template (Excel or CSV)
  const handleDownloadSampleTemplate = (format = 'xlsx') => {
    try {
      const { blob, filename } = generateSampleWorkbook(format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${format.toUpperCase()} template: ${filename}`);
    } catch (e) {
      toast.error('Error generating template: ' + e.message);
    }
  };

  // Export Customers to CSV or XLSX
  const handleExportCustomers = async () => {
    setExporting(true);
    try {
      const customers = await getCustomers({
        category: exportCategory === 'All' ? null : exportCategory,
        limitCount: 2000,
      });

      if (customers.length === 0) {
        toast.error('No customers found to export with selected filter.');
        return;
      }

      const formatted = customers.map((c) => ({
        CustomerID: c.customerId || '',
        FullName: c.fullName || '',
        MobilePhone: c.phone || '',
        AlternatePhone: c.alternatePhone || '',
        Email: c.email || '',
        City: c.city || '',
        Address: c.address || '',
        LeadSource: c.source || '',
        ProductInterest: c.interest || c.requirement || '',
        Requirement: c.requirement || '',
        BudgetINR: c.budget || '',
        LeadCategory: c.leadCategory || 'Cold',
        LeadStatus: c.leadStatus || 'New',
        LastCallDate: c.lastCallAt ? formatKolkataDateTime(c.lastCallAt) : '',
        NextFollowUpDate: c.nextFollowUpDate || '',
        LatestFeedback: c.latestFeedback || '',
        AssignedEmployee: c.assignedTo || '',
        CreatedAt: formatKolkataDateTime(c.createdAt),
      }));

      const timestamp = Date.now();
      const baseFilename = `Galaxy_Computers_Customers_${exportCategory}_${timestamp}`;

      if (exportFormat === 'xlsx') {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(formatted);
        XLSX.utils.book_append_sheet(wb, ws, 'Customers');
        const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([buf], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${baseFilename}.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const csv = Papa.unparse(formatted);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${baseFilename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast.success(`Exported ${customers.length} customer records to ${exportFormat.toUpperCase()}!`);
    } catch (e) {
      toast.error('Export failed: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  // Export Call Logs to CSV or XLSX
  const handleExportCallLogs = async () => {
    setExporting(true);
    try {
      const snap = await getDocs(query(collection(db, 'callLogs'), limit(2000)));
      const logs = snap.docs.map((d) => d.data());

      if (logs.length === 0) {
        toast.error('No call logs found to export.');
        return;
      }

      const formatted = logs.map((l) => ({
        CustomerName: l.customerNameSnapshot || '',
        Phone: l.customerPhoneSnapshot || '',
        CallOutcome: l.callOutcome || '',
        Duration: l.callDuration || '',
        Feedback: l.feedback || '',
        NewCategory: l.newLeadCategory || '',
        NextAction: l.nextAction || '',
        NextFollowUpDate: l.nextFollowUpDate || '',
        Executive: l.employeeName || l.employeeEmail || '',
        CallDate: formatKolkataDateTime(l.callAt || l.createdAt),
      }));

      const timestamp = Date.now();
      const baseFilename = `Galaxy_Computers_Call_Logs_${timestamp}`;

      if (exportFormat === 'xlsx') {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(formatted);
        XLSX.utils.book_append_sheet(wb, ws, 'Call Logs');
        const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([buf], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${baseFilename}.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const csv = Papa.unparse(formatted);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${baseFilename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast.success(`Exported ${logs.length} calling records to ${exportFormat.toUpperCase()}!`);
    } catch (e) {
      toast.error('Export failed: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  // Preview slice (rows 1-15)
  const previewSlice = currentSheetData.slice(
    (previewPage - 1) * PREVIEW_PAGE_SIZE,
    previewPage * PREVIEW_PAGE_SIZE
  );
  const totalPreviewPages = Math.ceil((currentSheetData?.length || 0) / PREVIEW_PAGE_SIZE);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="bg-[#E0E5EC] rounded-[32px] p-6 sm:p-8 shadow-neu-flat flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl shadow-neu-pressed flex items-center justify-center bg-[#E0E5EC] text-[#6C63FF] shrink-0">
            <FileSpreadsheet className="w-7 h-7 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-[#3D4852] tracking-tight">
              Excel & CSV Data Hub
            </h2>
            <p className="text-sm font-body text-[#6B7280] mt-1">
              Bulk import customer leads with duplicate detection, date parsing, and column mapping.
            </p>
          </div>
        </div>

        {/* Download Sample Templates Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={() => handleDownloadSampleTemplate('xlsx')}
            className="text-xs"
          >
            Sample Excel (.xlsx)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={() => handleDownloadSampleTemplate('csv')}
            className="text-xs"
          >
            Sample CSV (.csv)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ============================================================ */}
        {/* LEFT COLUMN: EXCEL & CSV BULK IMPORT (8 cols on lg)           */}
        {/* ============================================================ */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="border-b border-[#A3B1C6]/30 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl shadow-neu-pressed flex items-center justify-center text-[#6C63FF]">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-heading font-extrabold text-[#3D4852]">
                    Import Leads from Spreadsheet
                  </h3>
                  <p className="text-xs font-body text-[#6B7280]">
                    Supports Microsoft Excel (.xlsx, .xls) and CSV files up to 15MB
                  </p>
                </div>
              </div>

              {selectedFile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setParsedWorkbook(null);
                    setAnalysis(null);
                    setImportResults(null);
                  }}
                  className="text-xs text-rose-600 hover:bg-rose-50"
                >
                  Clear File
                </Button>
              )}
            </div>

            {/* Dropzone File Selector */}
            {!selectedFile ? (
              <div className="p-10 rounded-3xl shadow-neu-pressed bg-[#E0E5EC] text-center border-2 border-dashed border-[#A3B1C6]/60 hover:border-[#6C63FF]/60 transition-all cursor-pointer group">
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  id="spreadsheet-file-input"
                  className="hidden"
                />
                <label
                  htmlFor="spreadsheet-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-16 h-16 rounded-2xl shadow-neu-flat bg-[#E0E5EC] flex items-center justify-center text-[#6C63FF] group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="font-heading font-bold text-base text-[#3D4852] block">
                      Choose Excel or CSV File to Upload
                    </span>
                    <span className="text-xs text-[#6B7280] mt-1 block">
                      Drag and drop your .xlsx, .xls, or .csv workbook here
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-lg shadow-neu-flat text-[#6C63FF] font-bold">
                      .XLSX
                    </span>
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-lg shadow-neu-flat text-[#38B2AC] font-bold">
                      .XLS
                    </span>
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-lg shadow-neu-flat text-[#F6AD55] font-bold">
                      .CSV
                    </span>
                  </div>
                </label>
              </div>
            ) : (
              /* Selected File Information Bar */
              <div className="p-4 rounded-2xl shadow-neu-pressed bg-[#E0E5EC] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl shadow-neu-flat bg-[#E0E5EC] flex items-center justify-center text-[#6C63FF]">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-heading font-bold text-sm text-[#3D4852] flex items-center gap-2">
                      <span className="truncate max-w-[240px] sm:max-w-xs">{selectedFile.name}</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-neu-flat text-[#6C63FF]">
                        {parsedWorkbook?.fileType}
                      </span>
                    </div>
                    <div className="text-xs text-[#6B7280] mt-0.5">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {currentSheetData.length} data rows loaded
                    </div>
                  </div>
                </div>

                {/* Multiple Sheet Selector */}
                {parsedWorkbook && parsedWorkbook.sheetNames.length > 1 && (
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#6C63FF]" />
                    <span className="text-xs font-bold text-[#3D4852]">Sheet:</span>
                    <select
                      value={activeSheetName}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="text-xs py-1.5 px-3 rounded-xl shadow-neu-pressed bg-[#E0E5EC] text-[#3D4852] border-0 focus:outline-none font-body font-bold"
                    >
                      {parsedWorkbook.sheetNames.map((name) => (
                        <option key={name} value={name}>
                          {name} ({parsedWorkbook.sheets.find((s) => s.name === name)?.rowCount || 0} rows)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* If file is loaded: Show Preview, Mapping & Pre-Validation */}
            {parsedWorkbook && currentSheetData.length > 0 && (
              <div className="space-y-6 pt-2">
                {/* 1. Preview Table of First 15 Rows */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-heading font-bold uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-[#6C63FF]" />
                      Data Preview (Showing {previewSlice.length} of {currentSheetData.length} rows)
                    </span>
                    {totalPreviewPages > 1 && (
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <button
                          disabled={previewPage === 1}
                          onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                          className="px-2 py-0.5 rounded shadow-neu-flat disabled:opacity-40"
                        >
                          Prev
                        </button>
                        <span>
                          {previewPage} / {totalPreviewPages}
                        </span>
                        <button
                          disabled={previewPage === totalPreviewPages}
                          onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages, p + 1))}
                          className="px-2 py-0.5 rounded shadow-neu-flat disabled:opacity-40"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-2xl shadow-neu-pressed bg-[#E0E5EC] p-3 max-h-56">
                    <table className="w-full text-left text-xs font-body">
                      <thead>
                        <tr className="border-b border-[#A3B1C6]/30 text-[11px] font-heading font-bold text-[#6B7280]">
                          <th className="py-1.5 px-2">#</th>
                          {currentSheetHeaders.slice(0, 7).map((h) => (
                            <th key={h} className="py-1.5 px-2 truncate max-w-[140px]">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#A3B1C6]/15">
                        {previewSlice.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#A3B1C6]/10">
                            <td className="py-1 px-2 font-mono text-[10px] text-[#6B7280]">
                              {(previewPage - 1) * PREVIEW_PAGE_SIZE + idx + 1}
                            </td>
                            {currentSheetHeaders.slice(0, 7).map((h) => (
                              <td key={h} className="py-1 px-2 font-mono text-[11px] text-[#3D4852] truncate max-w-[140px]">
                                {String(row[h] || '—')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Column Mapping Section */}
                <div className="p-5 rounded-2xl shadow-neu-flat bg-[#E0E5EC] space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#A3B1C6]/20">
                    <div>
                      <h4 className="font-heading font-bold text-sm text-[#3D4852]">
                        Map Spreadsheet Columns to CRM Fields
                      </h4>
                      <p className="text-[11px] text-[#6B7280]">
                        Verify auto-detected columns. Name and Primary Mobile are mandatory.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-[#38B2AC] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      Auto-Mapped
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs font-body">
                    {/* Full Name */}
                    <div>
                      <label className="font-semibold block mb-1 text-[#3D4852]">Customer Name *</label>
                      <select
                        className="w-full text-xs py-2 px-3 rounded-xl shadow-neu-pressed bg-[#E0E5EC] text-[#3D4852] border-0 focus:outline-none font-medium"
                        value={columnMapping.fullName}
                        onChange={(e) => setColumnMapping({ ...columnMapping, fullName: e.target.value })}
                      >
                        <option value="">-- Select Column --</option>
                        {currentSheetHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Primary Mobile */}
                    <div>
                      <label className="font-semibold block mb-1 text-[#3D4852]">Mobile Number *</label>
                      <select
                        className="w-full text-xs py-2 px-3 rounded-xl shadow-neu-pressed bg-[#E0E5EC] text-[#3D4852] border-0 focus:outline-none font-medium"
                        value={columnMapping.phone}
                        onChange={(e) => setColumnMapping({ ...columnMapping, phone: e.target.value })}
                      >
                        <option value="">-- Select Column --</option>
                        {currentSheetHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Alternate Mobile */}
                    <div>
                      <label className="font-semibold block mb-1 text-[#3D4852]">Alternate Number</label>
                      <select
                        className="w-full text-xs py-2 px-3 rounded-xl shadow-neu-pressed bg-[#E0E5EC] text-[#3D4852] border-0 focus:outline-none font-medium"
                        value={columnMapping.alternatePhone}
                        onChange={(e) => setColumnMapping({ ...columnMapping, alternatePhone: e.target.value })}
                      >
                        <option value="">-- (Optional) --</option>
                        {currentSheetHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Requirement */}
                    <div>
                      <label className="font-semibold block mb-1 text-[#3D4852]">Product Requirement</label>
                      <select
                        className="w-full text-xs py-2 px-3 rounded-xl shadow-neu-pressed bg-[#E0E5EC] text-[#3D4852] border-0 focus:outline-none font-medium"
                        value={columnMapping.requirement}
                        onChange={(e) => setColumnMapping({ ...columnMapping, requirement: e.target.value })}
                      >
                        <option value="">-- (Optional) --</option>
                        {currentSheetHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Budget */}
                    <div>
                      <label className="font-semibold block mb-1 text-[#3D4852]">Budget (₹)</label>
                      <select
                        className="w-full text-xs py-2 px-3 rounded-xl shadow-neu-pressed bg-[#E0E5EC] text-[#3D4852] border-0 focus:outline-none font-medium"
                        value={columnMapping.budget}
                        onChange={(e) => setColumnMapping({ ...columnMapping, budget: e.target.value })}
                      >
                        <option value="">-- (Optional) --</option>
                        {currentSheetHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Lead Category */}
                    <div>
                      <label className="font-semibold block mb-1 text-[#3D4852]">Lead Category</label>
                      <select
                        className="w-full text-xs py-2 px-3 rounded-xl shadow-neu-pressed bg-[#E0E5EC] text-[#3D4852] border-0 focus:outline-none font-medium"
                        value={columnMapping.leadCategory}
                        onChange={(e) => setColumnMapping({ ...columnMapping, leadCategory: e.target.value })}
                      >
                        <option value="">-- (Optional - default Cold) --</option>
                        {currentSheetHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Lead Status */}
                    <div>
                      <label className="font-semibold block mb-1 text-[#3D4852]">Lead Status</label>
                      <select
                        className="w-full text-xs py-2 px-3 rounded-xl shadow-neu-pressed bg-[#E0E5EC] text-[#3D4852] border-0 focus:outline-none font-medium"
                        value={columnMapping.leadStatus}
                        onChange={(e) => setColumnMapping({ ...columnMapping, leadStatus: e.target.value })}
                      >
                        <option value="">-- (Optional - default New) --</option>
                        {currentSheetHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Next Follow-up Date */}
                    <div>
                      <label className="font-semibold block mb-1 text-[#3D4852]">Next Follow-Up Date</label>
                      <select
                        className="w-full text-xs py-2 px-3 rounded-xl shadow-neu-pressed bg-[#E0E5EC] text-[#3D4852] border-0 focus:outline-none font-medium"
                        value={columnMapping.nextFollowUpDate}
                        onChange={(e) => setColumnMapping({ ...columnMapping, nextFollowUpDate: e.target.value })}
                      >
                        <option value="">-- (Optional) --</option>
                        {currentSheetHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Latest Feedback */}
                    <div>
                      <label className="font-semibold block mb-1 text-[#3D4852]">Latest Feedback / Notes</label>
                      <select
                        className="w-full text-xs py-2 px-3 rounded-xl shadow-neu-pressed bg-[#E0E5EC] text-[#3D4852] border-0 focus:outline-none font-medium"
                        value={columnMapping.latestFeedback}
                        onChange={(e) => setColumnMapping({ ...columnMapping, latestFeedback: e.target.value })}
                      >
                        <option value="">-- (Optional) --</option>
                        {currentSheetHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* City / Area */}
                    <div>
                      <label className="font-semibold block mb-1 text-[#3D4852]">City / Area</label>
                      <select
                        className="w-full text-xs py-2 px-3 rounded-xl shadow-neu-pressed bg-[#E0E5EC] text-[#3D4852] border-0 focus:outline-none font-medium"
                        value={columnMapping.city}
                        onChange={(e) => setColumnMapping({ ...columnMapping, city: e.target.value })}
                      >
                        <option value="">-- (Optional - default Kanpur) --</option>
                        {currentSheetHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Customer Source */}
                    <div>
                      <label className="font-semibold block mb-1 text-[#3D4852]">Lead Source</label>
                      <select
                        className="w-full text-xs py-2 px-3 rounded-xl shadow-neu-pressed bg-[#E0E5EC] text-[#3D4852] border-0 focus:outline-none font-medium"
                        value={columnMapping.source}
                        onChange={(e) => setColumnMapping({ ...columnMapping, source: e.target.value })}
                      >
                        <option value="">-- (Optional - Excel Import) --</option>
                        {currentSheetHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Assigned Employee */}
                    <div>
                      <label className="font-semibold block mb-1 text-[#3D4852]">Assigned Employee</label>
                      <select
                        className="w-full text-xs py-2 px-3 rounded-xl shadow-neu-pressed bg-[#E0E5EC] text-[#3D4852] border-0 focus:outline-none font-medium"
                        value={columnMapping.assignedTo}
                        onChange={(e) => setColumnMapping({ ...columnMapping, assignedTo: e.target.value })}
                      >
                        <option value="">-- (Optional - Unassigned) --</option>
                        {currentSheetHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. Validation Summary Dashboard */}
                {analysis && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Total */}
                      <div className="p-4 rounded-2xl shadow-neu-flat bg-[#E0E5EC] text-center">
                        <span className="text-[10px] font-bold uppercase text-[#6B7280] block">Total Rows</span>
                        <span className="font-heading font-extrabold text-2xl text-[#3D4852] block mt-1">
                          {analysis.totalRows}
                        </span>
                      </div>

                      {/* Valid */}
                      <div className="p-4 rounded-2xl shadow-neu-flat bg-[#E0E5EC] text-center border-b-4 border-emerald-500">
                        <span className="text-[10px] font-bold uppercase text-[#38B2AC] block">Valid Ready</span>
                        <span className="font-heading font-extrabold text-2xl text-[#38B2AC] block mt-1">
                          {analysis.validRows.length}
                        </span>
                      </div>

                      {/* Duplicates */}
                      <div className="p-4 rounded-2xl shadow-neu-flat bg-[#E0E5EC] text-center border-b-4 border-amber-500">
                        <span className="text-[10px] font-bold uppercase text-[#F6AD55] block">Duplicates</span>
                        <span className="font-heading font-extrabold text-2xl text-[#F6AD55] block mt-1">
                          {analysis.duplicateRows.length}
                        </span>
                      </div>

                      {/* Invalid */}
                      <div className="p-4 rounded-2xl shadow-neu-flat bg-[#E0E5EC] text-center border-b-4 border-rose-500">
                        <span className="text-[10px] font-bold uppercase text-rose-500 block">Invalid Rows</span>
                        <span className="font-heading font-extrabold text-2xl text-rose-500 block mt-1">
                          {analysis.invalidRows.length}
                        </span>
                      </div>
                    </div>

                    {/* Duplicate Policy Radio Selector */}
                    <div className="p-5 rounded-2xl shadow-neu-pressed bg-[#E0E5EC] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-xs uppercase tracking-wider text-[#3D4852] flex items-center gap-1.5">
                          <Info className="w-4 h-4 text-[#6C63FF]" />
                          Duplicate Handling Policy:
                        </span>
                        {(analysis.invalidRows.length > 0 || analysis.duplicateRows.length > 0) && (
                          <button
                            type="button"
                            onClick={handleDownloadRejectedCSV}
                            className="text-xs font-heading font-bold text-[#6C63FF] hover:underline flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download Rejected Rows ({analysis.invalidRows.length + (duplicateMode === 'skip' ? analysis.duplicateRows.length : 0)})
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-body">
                        {/* Option 1: Skip */}
                        <label
                          className={`p-3 rounded-xl transition-all cursor-pointer flex items-start gap-2.5 ${
                            duplicateMode === 'skip'
                              ? 'shadow-neu-pressed bg-[#E0E5EC] border-2 border-[#6C63FF]/50 text-[#3D4852]'
                              : 'shadow-neu-flat bg-[#E0E5EC] text-[#6B7280]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="dupMode"
                            value="skip"
                            checked={duplicateMode === 'skip'}
                            onChange={() => setDuplicateMode('skip')}
                            className="accent-[#6C63FF] mt-0.5"
                          />
                          <div>
                            <span className="font-bold block text-[#3D4852]">Skip Duplicates</span>
                            <span className="text-[11px] text-[#6B7280] block">
                              Preserve existing customer database. Only insert brand new leads ({analysis.validRows.length}).
                            </span>
                          </div>
                        </label>

                        {/* Option 2: Update Matching */}
                        <label
                          className={`p-3 rounded-xl transition-all cursor-pointer flex items-start gap-2.5 ${
                            duplicateMode === 'update'
                              ? 'shadow-neu-pressed bg-[#E0E5EC] border-2 border-[#6C63FF]/50 text-[#3D4852]'
                              : 'shadow-neu-flat bg-[#E0E5EC] text-[#6B7280]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="dupMode"
                            value="update"
                            checked={duplicateMode === 'update'}
                            onChange={() => setDuplicateMode('update')}
                            className="accent-[#6C63FF] mt-0.5"
                          />
                          <div>
                            <span className="font-bold block text-[#3D4852]">Update Matching</span>
                            <span className="text-[11px] text-[#6B7280] block">
                              Update existing customers with new requirement/notes while preserving call logs ({analysis.duplicateRows.length} will be updated).
                            </span>
                          </div>
                        </label>

                        {/* Option 3: Add New Only */}
                        <label
                          className={`p-3 rounded-xl transition-all cursor-pointer flex items-start gap-2.5 ${
                            duplicateMode === 'add_only'
                              ? 'shadow-neu-pressed bg-[#E0E5EC] border-2 border-[#6C63FF]/50 text-[#3D4852]'
                              : 'shadow-neu-flat bg-[#E0E5EC] text-[#6B7280]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="dupMode"
                            value="add_only"
                            checked={duplicateMode === 'add_only'}
                            onChange={() => setDuplicateMode('add_only')}
                            className="accent-[#6C63FF] mt-0.5"
                          />
                          <div>
                            <span className="font-bold block text-[#3D4852]">Add New Only</span>
                            <span className="text-[11px] text-[#6B7280] block">
                              Strict insertion mode. Rejects any rows with existing mobile numbers.
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Progress Bar while importing */}
                    {importing && (
                      <div className="p-5 rounded-2xl shadow-neu-pressed bg-[#E0E5EC] space-y-2">
                        <div className="flex justify-between text-xs font-heading font-bold text-[#3D4852]">
                          <span>{importProgress.statusText || 'Importing records into Firestore...'}</span>
                          <span>{importProgress.percentage}%</span>
                        </div>
                        <div className="w-full bg-[#A3B1C6]/30 h-3 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="bg-[#6C63FF] h-full transition-all duration-300 rounded-full"
                            style={{ width: `${importProgress.percentage}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <Button
                      variant="primary"
                      icon={Upload}
                      onClick={handleStartImport}
                      disabled={importing || (analysis.validRows.length === 0 && duplicateMode !== 'update')}
                      className="w-full py-3.5 text-sm font-bold shadow-neu-flat hover:shadow-neu-flat-hover"
                    >
                      {importing
                        ? 'Batch Saving to Firestore...'
                        : duplicateMode === 'update'
                        ? `Import ${analysis.validRows.length} New & Update ${analysis.duplicateRows.length} Matching Records`
                        : `Import ${analysis.validRows.length} Valid Customers`}
                    </Button>
                  </div>
                )}

                {/* 4. Import Results Report */}
                {importResults && (
                  <div className="p-6 rounded-2xl shadow-neu-pressed bg-[#E0E5EC] border-l-4 border-emerald-500 text-xs font-body space-y-3">
                    <div className="font-heading font-bold text-base text-emerald-800 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        Batch Import Completed Successfully!
                      </span>
                      {importResults.rejectedRecords?.length > 0 && (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Download}
                          onClick={handleDownloadRejectedCSV}
                          className="text-xs"
                        >
                          Download Rejections CSV
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
                      <div className="p-2 rounded-xl shadow-neu-flat bg-[#E0E5EC]">
                        <span className="text-[#6B7280] block text-[10px]">NEW ADDED</span>
                        <strong className="text-emerald-700 text-base">{importResults.imported}</strong>
                      </div>
                      <div className="p-2 rounded-xl shadow-neu-flat bg-[#E0E5EC]">
                        <span className="text-[#6B7280] block text-[10px]">UPDATED</span>
                        <strong className="text-[#6C63FF] text-base">{importResults.updated}</strong>
                      </div>
                      <div className="p-2 rounded-xl shadow-neu-flat bg-[#E0E5EC]">
                        <span className="text-[#6B7280] block text-[10px]">SKIPPED</span>
                        <strong className="text-[#F6AD55] text-base">{importResults.skipped}</strong>
                      </div>
                      <div className="p-2 rounded-xl shadow-neu-flat bg-[#E0E5EC]">
                        <span className="text-[#6B7280] block text-[10px]">FAILED</span>
                        <strong className="text-rose-600 text-base">{importResults.failed}</strong>
                      </div>
                    </div>

                    {importResults.errors.length > 0 && (
                      <div className="mt-2 text-rose-600 space-y-1">
                        <strong>Errors encountered during batch writes:</strong>
                        <ul className="list-disc pl-4 space-y-0.5 max-h-24 overflow-y-auto font-mono text-[11px]">
                          {importResults.errors.map((err, i) => (
                            <li key={i}>
                              Batch {err.chunk}: {err.error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: SPREADSHEET EXPORT HUB (4 cols on lg)           */}
        {/* ============================================================ */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6 space-y-6">
            <div className="border-b border-[#A3B1C6]/30 pb-3 flex items-center gap-2">
              <Download className="w-5 h-5 text-[#6C63FF]" />
              <h3 className="text-xl font-heading font-extrabold text-[#3D4852]">
                Export Data Hub
              </h3>
            </div>

            {/* Export Format Selector */}
            <div className="p-4 bg-[#E0E5EC] rounded-2xl shadow-neu-pressed space-y-2">
              <label className="font-heading font-bold text-xs uppercase tracking-wider text-[#3D4852] block">
                Export File Format:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-body font-bold">
                <button
                  type="button"
                  onClick={() => setExportFormat('csv')}
                  className={`py-2 px-3 rounded-xl transition-all ${
                    exportFormat === 'csv'
                      ? 'shadow-neu-pressed bg-[#E0E5EC] text-[#6C63FF] border border-[#6C63FF]/40'
                      : 'shadow-neu-flat bg-[#E0E5EC] text-[#6B7280]'
                  }`}
                >
                  Standard CSV (.csv)
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat('xlsx')}
                  className={`py-2 px-3 rounded-xl transition-all ${
                    exportFormat === 'xlsx'
                      ? 'shadow-neu-pressed bg-[#E0E5EC] text-[#6C63FF] border border-[#6C63FF]/40'
                      : 'shadow-neu-flat bg-[#E0E5EC] text-[#6B7280]'
                  }`}
                >
                  Excel Workbook (.xlsx)
                </button>
              </div>
            </div>

            <div className="space-y-5">
              {/* Export Customers */}
              <div className="p-5 bg-[#E0E5EC] rounded-2xl shadow-neu-flat space-y-3">
                <div className="font-heading font-bold text-base text-[#3D4852]">
                  Customer Database
                </div>
                <p className="text-xs text-[#6B7280]">
                  Download customer records filtered by lead category.
                </p>
                <div className="space-y-3">
                  <Select
                    value={exportCategory}
                    onChange={(e) => setExportCategory(e.target.value)}
                    options={[
                      { value: 'All', label: 'All Customer Categories' },
                      { value: 'Hot', label: '🔥 Hot Leads Only' },
                      { value: 'Warm', label: '⚡ Warm Leads Only' },
                      { value: 'Cold', label: '❄️ Cold Leads Only' },
                    ]}
                  />
                  <Button
                    variant="secondary"
                    icon={Download}
                    onClick={handleExportCustomers}
                    disabled={exporting}
                    className="w-full justify-center"
                  >
                    Download Customers ({exportFormat.toUpperCase()})
                  </Button>
                </div>
              </div>

              {/* Export Call Logs */}
              <div className="p-5 bg-[#E0E5EC] rounded-2xl shadow-neu-flat space-y-3">
                <div className="font-heading font-bold text-base text-[#3D4852]">
                  Calling History & Feedbacks
                </div>
                <p className="text-xs text-[#6B7280]">
                  Audit spreadsheet of past calls, customer feedbacks, and call outcomes.
                </p>
                <Button
                  variant="primary"
                  icon={Download}
                  onClick={handleExportCallLogs}
                  disabled={exporting}
                  className="w-full justify-center"
                >
                  Download Call History ({exportFormat.toUpperCase()})
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
