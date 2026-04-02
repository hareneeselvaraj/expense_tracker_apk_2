import React from 'react';
import { Ico } from '../ui/Ico.jsx';
import { ACTION_LABELS } from './constants.js';

export default function ActionBuilder({ actions, onChange, categories, tags, theme }) {
  const C = theme;

  const addAction = () => {
    onChange([...actions, { type: 'categorize', detail: '' }]);
  };

  const updateAction = (idx, field, val) => {
    const next = [...actions];
    // When action type changes, reset detail to blank
    if (field === 'type') {
      next[idx] = { ...next[idx], type: val, detail: '' };
    } else {
      next[idx] = { ...next[idx], [field]: val };
    }
    onChange(next);
  };

  const removeAction = (idx) => {
    onChange(actions.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {actions.map((a, i) => (
        <div key={i} style={{ 
          display: 'flex', flexDirection: 'column', gap: 8, background: C.input, 
          borderRadius: 12, padding: 12, border: `1px solid ${C.borderLight}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.income, textTransform: 'uppercase' }}>Action {i + 1}</span>
            <button onClick={() => removeAction(i)} style={{ background: 'none', border: 'none', color: C.expense, cursor: 'pointer', padding: 4 }}>
              <Ico n="trash" sz={14} />
            </button>
          </div>
          
          <select
            value={a.type}
            onChange={(e) => updateAction(i, 'type', e.target.value)}
            style={{ width: '100%', background: C.surface, color: C.text, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, outline: 'none' }}
          >
            {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          
          {a.type === 'categorize' && (
            <select
              value={a.detail}
              onChange={(e) => updateAction(i, 'detail', e.target.value)}
              style={{ width: '100%', background: C.surface, color: C.text, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }}
            >
              <option value="">Select Category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </select>
          )}

          {a.type === 'tag' && (
            <select
              value={a.detail}
              onChange={(e) => updateAction(i, 'detail', e.target.value)}
              style={{ width: '100%', background: C.surface, color: C.text, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }}
            >
              <option value="">Select Tag</option>
              {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          
          {a.type === 'notify' && (
            <input
              type="text"
              value={a.detail}
              placeholder="Notification message"
              onChange={(e) => updateAction(i, 'detail', e.target.value)}
              style={{ width: '100%', background: C.surface, color: C.text, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none' }}
            />
          )}

          {a.type === 'split' && (
            <input
              type="text"
              value={a.detail}
              placeholder="Ratio or Amount"
              onChange={(e) => updateAction(i, 'detail', e.target.value)}
              style={{ width: '100%', background: C.surface, color: C.text, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none' }}
            />
          )}

          {/* flag, exclude, approve need no detail input */}
          {['flag', 'exclude', 'approve'].includes(a.type) && (
            <div style={{ fontSize: 12, color: C.sub, fontStyle: 'italic', padding: '4px 8px' }}>
              {a.type === 'flag' && '⚑ Transaction will be flagged for review'}
              {a.type === 'exclude' && '🚫 Transaction will be excluded from budget'}
              {a.type === 'approve' && '✓ Transaction will be auto-approved'}
            </div>
          )}
        </div>
      ))}
      
      <button 
        onClick={addAction}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          background: 'transparent', border: `1px dashed ${C.income}80`, color: C.income,
          padding: 12, borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer'
        }}
      >
        <Ico n="plus" sz={16} /> Add Action
      </button>
    </div>
  );
}
