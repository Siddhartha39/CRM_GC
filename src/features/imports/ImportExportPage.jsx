import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { bulkImportCustomers, getCustomers } from '../../services/customerService';
import { useAuth } from '../../context/AuthContext';
import { normalizePhoneNumber } from '../../utils/validation';
import { formatKolkataDateTime } from '../../utils/dates';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Papa from 'papaparse';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  FileText,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export function ImportExportPage() {
  const { user } = useAuth();

  // Import State
  const [csvFile, setCsvFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [columnMapping, setColumnMapping] = useState({
    fullName: '',
    phone: '',
    alternatePhone: '',
    email: '',
    city: '',
    requirement: '',
    budget: '',
    leadCategory: '',
    leadStatus: '',
    source: '',
  });
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);

  // Export State
  const [exportCategory, setExportCategory] = useState('All');
  const [exporting, setExporting] = useState(false);

  // Handle CSV file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCsvFile(file);
    setImportResults(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const headers = results.meta.fields || Object.keys(results.data[0]);
          setCsvHeaders(headers);
          setParsedData(results.data);

          // Auto-guess mapping based on common column names
          const initialMap = { ...columnMapping };
          headers.forEach((h) => {
            const lower = h.toLowerCase();
            if (lower.includes('name') || lower.includes('customer')) initialMap.fullName = h;
            else if (lower.includes('mobile') || lower.includes('phone') || lower.includes('contact')) {
              if (!initialMap.phone) initialMap.phone = h;
            } else if (lower.includes('email')) initialMap.email = h;
            else if (lower.includes('city') || lower.includes('address')) initialMap.city = h;
            else if (lower.includes('req') || lower.includes('product') || lower.includes('model')) initialMap.requirement = h;
            else if (lower.includes('budget') || lower.includes('price')) initialMap.budget = h;
            else if (lower.includes('category') || lower.includes('hot')) initialMap.leadCategory = h;
            else if (lower.includes('status')) initialMap.leadStatus = h;
            else if (lower.includes('source')) initialMap.source = h;
          });
          setColumnMapping(initialMap);
          toast.success(`Loaded ${results.data.length} rows from CSV`);
        } else {
          toast.error('The selected CSV file appears to be empty.');
        }
      },
      error: (err) => {
        toast.error('Error parsing CSV: ' + err.message);
      },
    });
  };

  // Perform bulk import
  const handleStartImport = async () => {
    if (!columnMapping.fullName || !columnMapping.phone) {
      toast.error('Please map at least Customer Name and Primary Phone fields.');
      return;
    }

    setImporting(true);
    try {
      // Map rows
      const mappedRows = parsedData.map((row) => ({
        fullName: row[columnMapping.fullName] || '',
        phone: row[columnMapping.phone] || '',
        alternatePhone: row[columnMapping.alternatePhone] || '',
        email: row[columnMapping.email] || '',
        city: row[columnMapping.city] || 'Kanpur',
        requirement: row[columnMapping.requirement] || '',
        budget: row[columnMapping.budget] || null,
        leadCategory: row[columnMapping.leadCategory] || 'Cold',
        leadStatus: row[columnMapping.leadStatus] || 'New',
        source: row[columnMapping.source] || 'CSV Import',
      }));

      const res = await bulkImportCustomers(mappedRows, user);
      setImportResults(res);
      toast.success(`Import complete! ${res.success} customers added.`);
    } catch (err) {
      console.error('Import failed:', err);
      toast.error('Import error: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  // Export Customers to CSV
  const handleExportCustomers = async () => {
    setExporting(true);
    try {
      const customers = await getCustomers({
        category: exportCategory === 'All' ? null : exportCategory,
        limitCount: 1000,
      });

      if (customers.length === 0) {
        toast.error('No customers found to export with selected filter.');
        return;
      }

      const csvData = customers.map((c) => ({
        CustomerID: c.customerId,
        FullName: c.fullName,
        Phone: c.phone,
        AlternatePhone: c.alternatePhone || '',
        Email: c.email || '',
        City: c.city || '',
        Address: c.address || '',
        Source: c.source || '',
        ProductInterest: c.interest || '',
        Requirement: c.requirement || '',
        Budget: c.budget || '',
        LeadCategory: c.leadCategory,
        LeadStatus: c.leadStatus,
        NextFollowUpDate: c.nextFollowUpDate || '',
        LatestFeedback: c.latestFeedback || '',
        CreatedAt: formatKolkataDateTime(c.createdAt),
      }));

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Galaxy_Computers_Customers_${exportCategory}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${customers.length} customer records to CSV!`);
    } catch (e) {
      toast.error('Export failed: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  // Export Call Logs to CSV
  const handleExportCallLogs = async () => {
    setExporting(true);
    try {
      const snap = await getDocs(query(collection(db, 'callLogs'), limit(1000)));
      const logs = snap.docs.map(d => d.data());

      if (logs.length === 0) {
        toast.error('No call logs found to export.');
        return;
      }

      const csvData = logs.map((l) => ({
        CustomerName: l.customerNameSnapshot,
        Phone: l.customerPhoneSnapshot,
        CallOutcome: l.callOutcome,
        Duration: l.callDuration,
        Feedback: l.feedback,
        Category: l.newLeadCategory,
        NextAction: l.nextAction,
        NextFollowUpDate: l.nextFollowUpDate || '',
        Executive: l.employeeName || l.employeeEmail,
        CallDate: formatKolkataDateTime(l.callAt || l.createdAt),
      }));

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Galaxy_Computers_Call_Logs_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${logs.length} call logs to CSV!`);
    } catch (e) {
      toast.error('Export failed: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 bg-paper-white card-hand border-2 border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sticky-yellow border-2 border-border rounded-lg shadow-hand-sm">
            <FileSpreadsheet className="w-6 h-6 text-foreground stroke-[2]" />
          </div>
          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground">
              Customer Data Import & Export
            </h2>
            <p className="text-sm font-body text-foreground/70">
              Bulk import new leads via CSV with duplicate validation, or export records for spreadsheet backups
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CSV Import Card */}
        <Card className="border-2 border-border p-5 space-y-4" tape={true}>
          <div className="border-b-2 border-dashed border-border/40 pb-2 flex items-center gap-2">
            <Upload className="w-5 h-5 text-secondary-accent" />
            <h3 className="text-xl font-heading font-bold text-foreground">
              Import Leads from CSV
            </h3>
          </div>

          <div className="p-4 border-2 border-dashed border-border rounded-lg text-center bg-stone-50">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              id="csv-file-input"
              className="hidden"
            />
            <label
              htmlFor="csv-file-input"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-white border-2 border-border flex items-center justify-center shadow-hand-sm">
                <FileText className="w-6 h-6 text-secondary-accent" />
              </div>
              <span className="font-heading font-bold text-base text-foreground">
                {csvFile ? csvFile.name : 'Choose CSV file to upload'}
              </span>
              <span className="text-xs text-foreground/60">
                Supports Excel/Google Sheets exported CSV files
              </span>
            </label>
          </div>

          {/* Mapping Controls */}
          {parsedData.length > 0 && (
            <div className="space-y-3 p-3 bg-sticky-yellow/40 border-2 border-border rounded-lg">
              <div className="font-heading font-bold text-sm text-foreground">
                Map CSV Columns ({parsedData.length} rows loaded):
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-body">
                <div>
                  <label className="font-bold block mb-1">Customer Full Name *</label>
                  <select
                    className="input-hand w-full text-xs py-1"
                    value={columnMapping.fullName}
                    onChange={(e) => setColumnMapping({ ...columnMapping, fullName: e.target.value })}
                  >
                    <option value="">-- Select Column --</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">Primary Phone *</label>
                  <select
                    className="input-hand w-full text-xs py-1"
                    value={columnMapping.phone}
                    onChange={(e) => setColumnMapping({ ...columnMapping, phone: e.target.value })}
                  >
                    <option value="">-- Select Column --</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">Product Requirement</label>
                  <select
                    className="input-hand w-full text-xs py-1"
                    value={columnMapping.requirement}
                    onChange={(e) => setColumnMapping({ ...columnMapping, requirement: e.target.value })}
                  >
                    <option value="">-- Select Column --</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">Budget (INR)</label>
                  <select
                    className="input-hand w-full text-xs py-1"
                    value={columnMapping.budget}
                    onChange={(e) => setColumnMapping({ ...columnMapping, budget: e.target.value })}
                  >
                    <option value="">-- Select Column --</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">Category (Hot/Warm/Cold)</label>
                  <select
                    className="input-hand w-full text-xs py-1"
                    value={columnMapping.leadCategory}
                    onChange={(e) => setColumnMapping({ ...columnMapping, leadCategory: e.target.value })}
                  >
                    <option value="">-- Select Column --</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">City / Area</label>
                  <select
                    className="input-hand w-full text-xs py-1"
                    value={columnMapping.city}
                    onChange={(e) => setColumnMapping({ ...columnMapping, city: e.target.value })}
                  >
                    <option value="">-- Select Column --</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              {/* Sample Row Preview */}
              <div className="mt-2 p-2 bg-white border border-border rounded text-[11px] font-mono">
                <span className="font-bold block text-foreground/60 mb-0.5">Sample Preview (Row 1):</span>
                <span>Name: {parsedData[0][columnMapping.fullName] || '—'}</span> •{' '}
                <span>Phone: {parsedData[0][columnMapping.phone] || '—'}</span> •{' '}
                <span>Req: {parsedData[0][columnMapping.requirement] || '—'}</span>
              </div>

              <Button
                variant="primary"
                icon={Upload}
                onClick={handleStartImport}
                disabled={importing}
                className="w-full mt-2"
              >
                {importing ? 'Importing Batch into Firestore...' : `Import ${parsedData.length} Customers`}
              </Button>
            </div>
          )}

          {/* Import Results Summary */}
          {importResults && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-600 rounded-lg text-xs font-body space-y-1">
              <div className="font-heading font-bold text-sm text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                Import Completed Successfully!
              </div>
              <div className="text-emerald-800">
                • Successfully Added: <strong>{importResults.success}</strong>
              </div>
              <div className="text-emerald-800">
                • Skipped / Invalid: <strong>{importResults.skipped}</strong>
              </div>
              {importResults.errors.length > 0 && (
                <div className="mt-2 text-danger">
                  <strong>Errors Encountered ({importResults.errors.length}):</strong>
                  <ul className="list-disc pl-4 space-y-0.5 mt-1 max-h-24 overflow-y-auto">
                    {importResults.errors.map((err, i) => (
                      <li key={i}>Row {err.row}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* CSV Export Card */}
        <Card className="border-2 border-border p-5 space-y-4" tape={true}>
          <div className="border-b-2 border-dashed border-border/40 pb-2 flex items-center gap-2">
            <Download className="w-5 h-5 text-secondary-accent" />
            <h3 className="text-xl font-heading font-bold text-foreground">
              Export Leads & Call Reports
            </h3>
          </div>

          <div className="space-y-4">
            {/* Export Customers */}
            <div className="p-4 bg-paper-white border-2 border-border rounded-lg shadow-hand-sm space-y-3">
              <div className="font-heading font-bold text-base text-foreground">
                Export Customer Database
              </div>
              <div className="flex items-center gap-3">
                <Select
                  value={exportCategory}
                  onChange={(e) => setExportCategory(e.target.value)}
                  options={[
                    { value: 'All', label: 'All Customer Categories' },
                    { value: 'Hot', label: 'Hot Leads Only' },
                    { value: 'Warm', label: 'Warm Leads Only' },
                    { value: 'Cold', label: 'Cold Leads Only' },
                  ]}
                />
                <Button
                  variant="secondary"
                  icon={Download}
                  onClick={handleExportCustomers}
                  disabled={exporting}
                >
                  Download CSV
                </Button>
              </div>
            </div>

            {/* Export Call Logs */}
            <div className="p-4 bg-paper-white border-2 border-border rounded-lg shadow-hand-sm space-y-3">
              <div className="font-heading font-bold text-base text-foreground">
                Export Calling History & Feedbacks
              </div>
              <p className="text-xs text-foreground/70">
                Generates full spreadsheet of past calls, customer feedbacks, and call outcomes.
              </p>
              <Button
                variant="primary"
                icon={Download}
                onClick={handleExportCallLogs}
                disabled={exporting}
              >
                Download Call History CSV
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
