import React, { useState } from "react";
import { Ico } from "../ui/Ico.jsx";
import { Btn } from "../ui/Btn.jsx";
import { FInput, FLabel } from "../ui/FInput.jsx";
import { CdToggle } from "../ui/CdToggle.jsx";
import { TypeToggle } from "../ui/TypeToggle.jsx";
import { CustomSelect } from "../ui/PremiumSelect.jsx";
import { uid } from "../../utils/id.js";
import { todayISO } from "../../utils/format.js";

const FREQ_OPTIONS = [
  { id: "daily", name: "Daily" },
  { id: "weekly", name: "Weekly" },
  { id: "biweekly", name: "Biweekly" },
  { id: "monthly", name: "Monthly" },
  { id: "yearly", name: "Yearly" },
];

export const RecurringForm = ({ init, categories, accounts, onSave, onDelete, onClose, theme }) => {
  const C = theme;
  const isEdit = !!init?.id;

  const [form, setForm] = useState({
    id: init?.id || uid(),
    templateTx: {
      description: init?.templateTx?.description || "",
      amount: init?.templateTx?.amount || "",
      creditDebit: init?.templateTx?.creditDebit || "Debit",
      txType: init?.templateTx?.txType || "Expense",
      category: init?.templateTx?.category || "c13",
      tags: init?.templateTx?.tags || [],
      accountId: init?.templateTx?.accountId || "",
      notes: init?.templateTx?.notes || "",
    },
    frequency: init?.frequency || "monthly",
    startDate: init?.startDate || todayISO(),
    endDate: init?.endDate || "",
    nextDue: init?.nextDue || todayISO(),
    autoPost: init?.autoPost !== undefined ? init.autoPost : true,
    paused: init?.paused || false,
  });

  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateTx = (k) => (v) =>
    setForm((p) => ({ ...p, templateTx: { ...p.templateTx, [k]: v } }));
  const updateTxEv = (k) => (e) =>
    setForm((p) => ({ ...p, templateTx: { ...p.templateTx, [k]: e.target.value } }));
  const updateField = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));
  const updateFieldEv = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const valid =
    form.templateTx.description.trim() &&
    parseFloat(form.templateTx.amount) > 0 &&
    form.frequency;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Description */}
      <div>
        <FLabel theme={C}>Description</FLabel>
        <FInput
          theme={C}
          value={form.templateTx.description}
          onChange={updateTxEv("description")}
          placeholder="e.g. Netflix, Rent, SIP…"
        />
      </div>

      {/* Amount */}
      <div>
        <FLabel theme={C}>Amount (₹)</FLabel>
        <FInput
          theme={C}
          value={form.templateTx.amount}
          onChange={updateTxEv("amount")}
          type="number"
          placeholder="0"
          style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 18,
            fontWeight: 700,
            color:
              form.templateTx.creditDebit === "Credit" ? C.income : C.expense,
          }}
        />
      </div>

      {/* Credit / Debit */}
      <div>
        <FLabel theme={C}>Credit / Debit</FLabel>
        <CdToggle
          theme={C}
          value={form.templateTx.creditDebit}
          onChange={(v) => {
            setForm((p) => ({
              ...p,
              templateTx: {
                ...p.templateTx,
                creditDebit: v,
                txType: v === "Credit" ? "Income" : "Expense",
              },
            }));
          }}
        />
      </div>

      {/* Transaction Type */}
      <div>
        <FLabel theme={C}>Transaction Type</FLabel>
        <TypeToggle
          theme={C}
          value={form.templateTx.txType}
          onChange={updateTx("txType")}
        />
      </div>

      {/* Category */}
      <CustomSelect
        theme={C}
        label="Category"
        value={form.templateTx.category}
        options={categories.filter((c) => c.type === form.templateTx.txType)}
        onChange={updateTx("category")}
      />

      {/* Account */}
      <CustomSelect
        theme={C}
        label="Account"
        value={form.templateTx.accountId || ""}
        options={[
          { id: "", name: "Default (None)", color: C.sub },
          ...accounts.map((a) => ({ ...a })),
        ]}
        onChange={updateTx("accountId")}
      />

      {/* Frequency */}
      <CustomSelect
        theme={C}
        label="Frequency"
        value={form.frequency}
        options={FREQ_OPTIONS}
        onChange={updateField("frequency")}
        searchable={false}
      />

      {/* Start Date & End Date */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <FLabel theme={C}>Start Date</FLabel>
          <FInput
            theme={C}
            value={form.startDate}
            onChange={(e) => {
              const val = e.target.value;
              setForm((p) => ({ ...p, startDate: val, nextDue: val > p.nextDue ? val : p.nextDue }));
            }}
            type="date"
          />
        </div>
        <div>
          <FLabel theme={C}>End Date (optional)</FLabel>
          <FInput
            theme={C}
            value={form.endDate}
            onChange={updateFieldEv("endDate")}
            type="date"
          />
        </div>
      </div>

      {/* Auto-Post toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: C.input,
          borderRadius: 14,
          padding: "12px 16px",
          border: `1px solid ${C.border}`,
        }}
      >
        <div>
          <div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>
            Auto-post transactions
          </div>
          <div style={{ color: C.sub, fontSize: 11, marginTop: 2 }}>
            Automatically add entries on due dates
          </div>
        </div>
        <div
          onClick={() => setForm((p) => ({ ...p, autoPost: !p.autoPost }))}
          style={{
            width: 44,
            height: 24,
            borderRadius: 12,
            background: form.autoPost
              ? C.primary
              : C.border,
            cursor: "pointer",
            position: "relative",
            transition: "background .2s",
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              background: "#fff",
              position: "absolute",
              top: 3,
              left: form.autoPost ? 23 : 3,
              transition: "left .2s",
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: "flex",
          gap: 10,
          paddingTop: 12,
          borderTop: `1px solid ${C.border}`,
        }}
      >
        {onDelete && isEdit && (
          confirmDelete ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.expense + "11", padding: "4px 12px", borderRadius: 12, border: `1px solid ${C.expense}40` }}>
              <span style={{ color: C.expense, fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>Confirm?</span>
              <button type="button" onClick={() => onDelete(form.id)} style={{ background: C.expense, border: "none", color: "#fff", cursor: "pointer", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 800 }}>YES</button>
              <button type="button" onClick={() => setConfirmDelete(false)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.sub, cursor: "pointer", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 800 }}>NO</button>
            </div>
          ) : (
            <Btn theme={C} v="ghost" sm icon="trash" onClick={() => setConfirmDelete(true)} style={{ color: C.expense }}>Delete</Btn>
          )
        )}
        <div style={{ flex: 1 }} />
        <Btn theme={C} v="ghost" sm onClick={onClose}>
          Cancel
        </Btn>
        <Btn
          theme={C}
          v="primary"
          sm
          disabled={!valid}
          onClick={() => {
            onSave({
              ...form,
              templateTx: {
                ...form.templateTx,
                amount: parseFloat(form.templateTx.amount) || 0,
              },
              nextDue: (isEdit && form.startDate !== init.startDate) ? form.startDate : (isEdit ? form.nextDue : form.startDate),
              endDate: form.endDate || null,
            });
          }}
        >
          {isEdit ? "Save Changes" : "Add Recurring"}
        </Btn>
      </div>
    </div>
  );
};
