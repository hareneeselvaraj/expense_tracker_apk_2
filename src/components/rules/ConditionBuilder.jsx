import React from 'react';
import { Ico } from '../ui/Ico.jsx';
import { CONDITION_LABELS, DAYS } from './constants.js';

export default function ConditionBuilder({ conditions, onChange, categories, theme }) {
  const C = theme;

  const addCondition = () => {
    onChange([...conditions, { type: 'merchant', op: 'contains', val: '' }]);
  };

  const updateCondition = (idx, field, val) => {
    const next = [...conditions];
    // When type changes, reset operator and value to sensible defaults
    if (field === 'type') {
      const newType = val;
      let defaultOp = 'contains';
      let defaultVal = '';
      if (['amount_gt', 'amount_lt', 'amount_eq'].includes(newType)) defaultOp = '';
      else if (newType === 'category') defaultOp = 'equals';
      else if (newType === 'day_of_week') defaultOp = 'equals';
      else if (newType === 'recurring') defaultOp = '';
      next[idx] = { ...next[idx], type: newType, op: defaultOp, val: defaultVal };
    } else {
      next[idx] = { ...next[idx], [field]: val };
    }
    onChange(next);
  };

  const removeCondition = (idx) => {
    onChange(conditions.filter((_, i) => i !== idx));
  };

  // Determine which operator options to show based on type
  const getOperators = (type) => {
    if (['amount_gt', 'amount_lt', 'amount_eq'].includes(type)) {
      return [{ value: '', label: 'is' }];
    }
    if (type === 'category' || type === 'day_of_week' || type === 'recurring') {
      return [{ value: 'equals', label: 'is' }];
    }
    return [
      { value: 'contains', label: 'contains' },
      { value: 'equals', label: 'equals' },
      { value: 'not_contains', label: 'not contains' },
      { value: 'starts_with', label: 'starts with' },
    ];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {conditions.map((c, i) => (
        <div key={i} style={{ 
          display: 'flex', flexDirection: 'column', gap: 8, background: C.input, 
          borderRadius: 12, padding: 12, border: `1px solid ${C.borderLight}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.sub, textTransform: 'uppercase' }}>Condition {i + 1}</span>
            <button onClick={() => removeCondition(i)} style={{ background: 'none', border: 'none', color: C.expense, cursor: 'pointer', padding: 4 }}>
              <Ico n="trash" sz={14} />
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={c.type}
              onChange={(e) => updateCondition(i, 'type', e.target.value)}
              style={{ flex: 1, background: C.surface, color: C.text, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, outline: 'none' }}
            >
              {Object.entries(CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            
            {/* Only show operator dropdown if type has meaningful operators */}
            {!['recurring'].includes(c.type) && (
              <select
                value={c.op}
                onChange={(e) => updateCondition(i, 'op', e.target.value)}
                style={{ width: 110, background: C.surface, color: C.text, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, outline: 'none' }}
              >
                {getOperators(c.type).map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
              </select>
            )}
          </div>

          {/* Value input — varies by type */}
          {c.type === 'category' ? (
            <select
              value={c.val}
              onChange={(e) => updateCondition(i, 'val', e.target.value)}
              style={{ width: '100%', background: C.surface, color: C.text, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }}
            >
              <option value="">Select Category</option>
              {(categories || []).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          ) : c.type === 'recurring' ? (
            <select
              value={c.val}
              onChange={(e) => updateCondition(i, 'val', e.target.value)}
              style={{ width: '100%', background: C.surface, color: C.text, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }}
            >
              <option value="">Select Option</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          ) : c.type === 'day_of_week' ? (
            <select
              value={c.val}
              onChange={(e) => updateCondition(i, 'val', e.target.value)}
              style={{ width: '100%', background: C.surface, color: C.text, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }}
            >
              <option value="">Select Day</option>
              {DAYS.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
            </select>
          ) : ['amount_gt', 'amount_lt', 'amount_eq'].includes(c.type) ? (
            <input
              type="number"
              value={c.val}
              placeholder="e.g. 500"
              onChange={(e) => updateCondition(i, 'val', e.target.value)}
              style={{ width: '100%', background: C.surface, color: C.text, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none' }}
            />
          ) : (
            <input
              type="text"
              value={c.val}
              placeholder="Value"
              onChange={(e) => updateCondition(i, 'val', e.target.value)}
              style={{ width: '100%', background: C.surface, color: C.text, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none' }}
            />
          )}
        </div>
      ))}
      
      <button 
        onClick={addCondition}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          background: 'transparent', border: `1px dashed ${C.primary}80`, color: C.primary,
          padding: 12, borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer'
        }}
      >
        <Ico n="plus" sz={16} /> Add Condition
      </button>
    </div>
  );
}
