import React, { useState } from "react";
import { Modal } from "../ui/Modal.jsx";
import { Ico } from "../ui/Ico.jsx";
import { Btn } from "../ui/Btn.jsx";
import { parseExcelFile, autoDetectColumns, processTransactions } from "../../../statement-engine.js";
import { uid } from "../../utils/id.js";
import { categorizeTransaction } from "../../services/categorizationPipeline.js";
import { checkImportBatch } from "../../services/duplicateEngine.js";

export const UploadModal = ({ open, onClose, onImport, theme, categories = [], rules = [], transactions = [] }) => {
  const [duplicateReview, setDuplicateReview] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const C = theme;

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const { rows, headers } = await parseExcelFile(file);
      const colMap = autoDetectColumns(headers);
      
      if (!colMap.description || (!colMap.debit && !colMap.credit && !colMap.amount)) {
        throw new Error("Could not detect necessary columns (Date, Description, Amount). Please ensure your file has these headers.");
      }

      const rawTxns = processTransactions(rows, colMap);
      const finalTxns = rawTxns.map(t => ({
        ...t,
        id: uid(),
      }));

      // ── DUPLICATE GUARD ──
      const result = checkImportBatch(finalTxns, transactions);
      if (result.duplicates.length > 0) {
        setDuplicateReview(result);
      } else {
        onImport(finalTxns);
        setFile(null);
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Import Statement" theme={C}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "10px 0" }}>
        <p style={{ color: C.sub, fontSize: 13, lineHeight: 1.5 }}>
          Upload your bank statement (.csv, .xls, .xlsx). Our engine will automatically detect columns and categorize transactions.
        </p>

        <div style={{
          border: `2px dashed ${C.border}`,
          borderRadius: 16,
          padding: 30,
          textAlign: "center",
          background: file ? C.primary + "11" : "transparent",
          cursor: "pointer",
          position: "relative"
        }}>
          <input 
            type="file" 
            accept=".csv,.xls,.xlsx" 
            onChange={handleFileChange} 
            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} 
          />
          <Ico n="upload" sz={32} c={file ? C.primary : C.sub} />
          <div style={{ marginTop: 12, color: file ? C.text : C.sub, fontWeight: 700, fontSize: 14 }}>
            {file ? file.name : "Click or drag file to upload"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: C.sub, background: C.input, padding: "3px 8px", borderRadius: 8 }}>✓ Auto-categorize</span>
          <span style={{ fontSize: 10, color: C.sub, background: C.input, padding: "3px 8px", borderRadius: 8 }}>✓ Duplicate guard</span>
          <span style={{ fontSize: 10, color: C.sub, background: C.input, padding: "3px 8px", borderRadius: 8 }}>✓ Tags & Category columns</span>
        </div>

        {error && (
          <div style={{ color: C.expense, fontSize: 12, background: C.expense + "11", padding: 10, borderRadius: 10, border: `1px solid ${C.expense}44` }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
          <Btn theme={C} v="ghost" onClick={onClose}>Cancel</Btn>
          <Btn theme={C} v="primary" onClick={handleUpload} disabled={!file || loading}>
            {loading ? "Processing..." : "Import Transactions"}
          </Btn>
        </div>

        {duplicateReview && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: C.warning + "22", padding: 14, borderRadius: 12, border: `1px solid ${C.warning}` }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 4 }}>
                ⚠️ Found {duplicateReview.duplicates.length} possible duplicates
              </div>
              <div style={{ fontSize: 11, color: C.sub }}>
                {duplicateReview.clean.length} new transactions look unique. Choose how to handle the duplicates.
              </div>
            </div>

            <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {duplicateReview.duplicates.map((dup, idx) => (
                <div key={idx} style={{ background: C.input, padding: 12, borderRadius: 12 }}>
                  <div style={{ fontSize: 11, color: C.sub, marginBottom: 4, fontWeight: 800 }}>
                    {dup.confidence === "exact" ? "EXACT MATCH" : `${Math.round(dup.similarity * 100)}% SIMILAR`}
                  </div>
                  <div style={{ fontSize: 12, color: C.text, fontWeight: 700 }}>
                    {dup.incoming.description}
                  </div>
                  <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>
                    {dup.incoming.date} • {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(dup.incoming.amount)}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <Btn theme={C} v="ghost" full onClick={() => {
                onImport(duplicateReview.clean);
                setDuplicateReview(null);
                setFile(null);
                onClose();
              }}>
                Import {duplicateReview.clean.length} New Only
              </Btn>
              <Btn theme={C} v="primary" full onClick={() => {
                onImport([...duplicateReview.clean, ...duplicateReview.duplicates.map(d => d.incoming)]);
                setDuplicateReview(null);
                setFile(null);
                onClose();
              }}>
                Import All {duplicateReview.clean.length + duplicateReview.duplicates.length}
              </Btn>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
