"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { Upload, X, AlertCircle, CheckCircle, Loader2, Sparkles } from "lucide-react";
import {
  autoMapColumns,
  validateMappings,
  type ColumnMapping,
  type RequiredField,
} from "@/lib/csv/column-mapper";

type ParsedCSV = {
  headers: string[];
  rows: string[][];
};

type CSVUploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: ImportData[]) => Promise<void>;
};

export type ImportData = {
  full_name: string;
  address: string;
  channel: "whatsapp" | "sms" | "email";
  priority: number;
  notes: string;
};

const FIELD_LABELS: Record<RequiredField, string> = {
  full_name: "Full Name",
  address: "Phone/Email",
  channel: "Channel",
  priority: "Priority",
  notes: "Notes",
};

export function CSVUploadModal({ isOpen, onClose, onImport }: CSVUploadModalProps) {
  const [step, setStep] = useState<"upload" | "mapping" | "importing" | "success">("upload");
  const [parsedData, setParsedData] = useState<ParsedCSV | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: number } | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError(null);

    Papa.parse(file, {
      complete: (results) => {
        const headers = results.data[0] as string[];
        const rows = results.data.slice(1) as string[][];
        
        // Filter out empty rows
        const validRows = rows.filter(row => 
          row.some(cell => cell && cell.trim() !== "")
        );

        if (headers.length === 0 || validRows.length === 0) {
          setError("CSV file is empty or invalid");
          return;
        }

        setParsedData({ headers, rows: validRows });
        
        // Auto-map columns
        const result = autoMapColumns(headers);
        setMappings(result.mappings);
        setStep("mapping");
      },
      error: (error) => {
        setError(`Failed to parse CSV: ${error.message}`);
      },
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
    },
    maxFiles: 1,
  });

  const handleMappingChange = (csvColumn: string, newMapping: RequiredField | null) => {
    setMappings(prev =>
      prev.map(m =>
        m.csvColumn === csvColumn
          ? { ...m, mappedTo: newMapping, confidence: newMapping ? 100 : 0 }
          : m
      )
    );
  };

  const handleAIFix = async () => {
    if (!parsedData) return;
    
    setAiLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/csv/map-columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headers: parsedData.headers,
          sampleRows: parsedData.rows.slice(0, 3), // Send first 3 rows
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI suggestions");
      }

      const { mappings: aiMappings, reasoning } = await response.json();
      
      // Update mappings with AI suggestions
      setMappings(prev =>
        prev.map(m => ({
          ...m,
          mappedTo: aiMappings[m.csvColumn] || m.mappedTo,
          confidence: aiMappings[m.csvColumn] ? 95 : m.confidence,
        }))
      );

      console.log("AI reasoning:", reasoning);
    } catch (err) {
      setError("Failed to get AI suggestions. Please map manually.");
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleImport = async () => {
    if (!parsedData) return;

    const validation = validateMappings(mappings);
    if (!validation.valid) {
      setError(`Missing required fields: ${validation.missingFields.join(", ")}`);
      return;
    }

    setStep("importing");
    setError(null);

    try {
      // Build mapping index
      const mappingIndex = new Map<string, RequiredField>();
      mappings.forEach(m => {
        if (m.mappedTo) {
          mappingIndex.set(m.csvColumn, m.mappedTo);
        }
      });

      // Transform rows to import data
      const importData: ImportData[] = parsedData.rows
        .map((row) => {
          const data: Partial<ImportData> = {
            priority: 10, // Default priority
            notes: "",
            channel: "whatsapp", // Default channel
          };

          parsedData.headers.forEach((header, index) => {
            const field = mappingIndex.get(header);
            if (!field) return;

            const value = row[index]?.trim() || "";
            
            if (field === "full_name") {
              data.full_name = value;
            } else if (field === "address") {
              data.address = value;
            } else if (field === "channel") {
              const normalized = value.toLowerCase();
              if (normalized === "whatsapp" || normalized === "sms" || normalized === "email") {
                data.channel = normalized as "whatsapp" | "sms" | "email";
              }
            } else if (field === "priority") {
              const num = parseInt(value, 10);
              if (!isNaN(num)) {
                data.priority = num;
              }
            } else if (field === "notes") {
              data.notes = value;
            }
          });

          return data as ImportData;
        })
        .filter(d => d.full_name && d.address); // Filter out invalid rows

      const result = await onImport(importData);
      
      // Show success screen with results
      setImportResult({
        imported: importData.length,
        errors: 0,
      });
      setStep("success");
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError("Failed to import contacts. Please try again.");
      console.error(err);
      setStep("mapping");
    }
  };

  const handleClose = () => {
    setStep("upload");
    setParsedData(null);
    setMappings([]);
    setError(null);
    setImportResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-100">
            {step === "upload" && "Import Contacts from CSV"}
            {step === "mapping" && "Map CSV Columns"}
            {step === "importing" && "Importing..."}
            {step === "success" && "Import Complete!"}
          </h2>
          <button
            onClick={handleClose}
            disabled={step === "importing"}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === "upload" && (
            <div>
              <div
                {...getRootProps()}
                className={`cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition ${
                  isDragActive
                    ? "border-emerald-400 bg-emerald-400/5"
                    : "border-slate-700 hover:border-slate-600 hover:bg-slate-800/30"
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-slate-400" />
                <p className="mt-4 text-sm text-slate-300">
                  {isDragActive
                    ? "Drop your CSV file here"
                    : "Drag & drop a CSV file, or click to browse"}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  CSV should contain columns for name, phone/email, and optionally channel, priority, notes
                </p>
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {step === "mapping" && parsedData && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Found {parsedData.rows.length} rows. Map CSV columns to fields:
                </p>
                <button
                  onClick={handleAIFix}
                  disabled={aiLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-500/10 px-3 py-1.5 text-sm font-medium text-purple-300 transition hover:bg-purple-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {aiLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Fix with AI
                </button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {mappings.map((mapping) => (
                  <div
                    key={mapping.csvColumn}
                    className="flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-200">
                        {mapping.csvColumn}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Sample: {parsedData.rows[0]?.[parsedData.headers.indexOf(mapping.csvColumn)] || "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {mapping.confidence > 0 && (
                        <span className={`text-xs ${
                          mapping.confidence >= 80 ? "text-emerald-400" :
                          mapping.confidence >= 60 ? "text-yellow-400" :
                          "text-rose-400"
                        }`}>
                          {mapping.confidence}%
                        </span>
                      )}
                      <select
                        value={mapping.mappedTo || ""}
                        onChange={(e) =>
                          handleMappingChange(
                            mapping.csvColumn,
                            e.target.value === "" ? null : (e.target.value as RequiredField)
                          )
                        }
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
                      >
                        <option value="">Skip this column</option>
                        {Object.entries(FIELD_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={handleClose}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400 cursor-pointer"
                >
                  <CheckCircle className="h-4 w-4" />
                  Import {parsedData.rows.length} contacts
                </button>
              </div>
            </div>
          )}

          {step === "importing" && (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-emerald-400" />
              <p className="mt-4 text-sm text-slate-300">Importing contacts...</p>
            </div>
          )}

          {step === "success" && importResult && (
            <div className="py-12 text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-emerald-400" />
              <h3 className="mt-4 text-xl font-semibold text-slate-100">
                Successfully imported {importResult.imported} contacts!
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Contacts have been added to your waitlist in inactive state.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Closing automatically...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
