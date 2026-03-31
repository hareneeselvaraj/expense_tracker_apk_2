import React from 'react';
import { Ico } from '../ui/Ico.jsx';
import { CONDITION_LABELS } from './constants.js';

export default function ConditionBuilder({ conditions, onChange, theme }) {
  const C = theme;

  const addCondition = () => {
    onChange([...conditions, { type: 'merchant', op: 'contains', val: '' }]);
  };

  const updateCondition = (idx, field, val) => {
    const next = [...conditions];
    next[idx] = { ...next[idx], [field]: val };
    onChange(next);
  };

  const removeCondition = (idx) => {
    onChange(conditions.filter((_, i) => i !== idx));
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
            
            <select
              value={c.op}
              onChange={(e) => updateCondition(i, 'op', e.target.value)}
              style={{ width: 100, background: C.surface, color: C.text, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, outline: 'none' }}
            >
              <option value="contains">contains</option>
              <option value="equals">equals</option>
              {['amount_gt', 'amount_lt', 'amount_eq'].includes(c.type) && <option value="">is</option>}
            </select>
          </div>

          <input
            type="text"
            value={c.val}
            placeholder={c.type.startsWith('amount') ? 'e.g. 50' : 'Value'}
            onChange={(e) => updateCondition(i, 'val', e.target.value)}
            style={{ width: '100%', background: C.surface, color: C.text, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none' }}
          />
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
