import React, { useState } from 'react';
import { CONDITION_LABELS, ACTION_LABELS } from './constants.js';
import { Ico } from '../ui/Ico.jsx'; // Assuming icon component exists

export default function RuleCard({ rule, priority, onToggle, onEdit, onDelete, categories, tags, theme }) {
  const [expanded, setExpanded] = useState(false);
  const C = theme;

  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.borderLight}`,
      borderRadius: 16,
      overflow: 'hidden',
      transition: 'opacity 0.2s',
      opacity: !rule.enabled ? 0.6 : 1,
      boxShadow: C.shadow,
      marginBottom: 12
    }}>
      {/* Header Row */}
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer'
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          background: (rule.color || C.primary) + '22',
          border: `1px solid ${(rule.color || C.primary)}44`
        }}>
          {rule.icon || '⚡'}
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: C.text, fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {rule.name}
          </div>
          <div style={{ color: C.sub, fontSize: 12, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
            {(rule.conditions || []).length} condition{(rule.conditions || []).length !== 1 ? 's' : ''} • {(rule.actions || []).length} action{(rule.actions || []).length !== 1 ? 's' : ''}
            {(rule.match_count || 0) > 0 && (
              <span style={{ background: `${C.income}22`, color: C.income, fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 6 }}>
                {rule.match_count} match{rule.match_count !== 1 ? 'es' : ''}
              </span>
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{
            fontSize: 10, background: C.input, border: `1px solid ${C.borderLight}`,
            borderRadius: 4, padding: '2px 6px', color: C.sub, fontWeight: 700
          }}>
            #{priority}
          </span>
          
          {/* Toggle Button */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            style={{
              width: 40, height: 24, borderRadius: 12, position: 'relative', border: 'none', cursor: 'pointer',
              background: rule.enabled ? C.primary : C.input,
              transition: 'all 0.3s'
            }}
          >
            <div style={{
              width: 20, height: 20, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2,
              left: rule.enabled ? 18 : 2, transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }} />
          </button>
        </div>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${C.borderLight}`, marginTop: 4 }}>
          {/* Conditions */}
          <div style={{ background: C.input, borderRadius: 8, padding: 12, marginTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: C.primary, marginBottom: 8, letterSpacing: '.05em' }}>
              Conditions ({rule.logic})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(rule.conditions || []).map((c, i) => {
                let dispVal = c.val;
                if (c.type === 'category') dispVal = (categories || []).find(x => x.id === c.val)?.name || c.val;
                if (c.type === 'recurring') dispVal = c.val === 'true' ? 'Yes' : (c.val === 'false' ? 'No' : c.val);
                return (
                <span key={i} style={{
                  fontSize: 12, padding: '4px 10px', borderRadius: 12,
                  background: `${C.primary}1A`, border: `1px solid ${C.primary}33`, color: C.primary
                }}>
                  {CONDITION_LABELS[c.type] || c.type} {c.op ? c.op.replace('_', ' ') : ''} <strong style={{color: C.text}}>{dispVal}</strong>
                </span>
                );
              })}
            </div>
          </div>
          
          {/* Actions */}
          <div style={{ background: C.input, borderRadius: 8, padding: 12, marginTop: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: C.income, marginBottom: 8, letterSpacing: '.05em' }}>
              Actions
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(rule.actions || []).map((a, i) => {
                let dispDetail = a.detail;
                if (a.type === 'categorize') dispDetail = (categories || []).find(x => x.id === a.detail)?.name || a.detail;
                if (a.type === 'tag') dispDetail = (tags || []).find(x => x.id === a.detail)?.name || a.detail;
                return (
                <span key={i} style={{
                  fontSize: 12, padding: '4px 10px', borderRadius: 12,
                  background: `${C.income}1A`, border: `1px solid ${C.income}33`, color: C.income
                }}>
                  {ACTION_LABELS[a.type] || a.type}{dispDetail ? ` → ${dispDetail}` : ''}
                </span>
                );
              })}
            </div>
          </div>
          
          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                onClick={onEdit} 
                style={{
                  fontSize: 12, background: C.input, border: `1px solid ${C.borderLight}`,
                  color: C.text, borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontWeight: 600
                }}
              >
                Edit
              </button>
              <button 
                onClick={onDelete} 
                style={{
                  fontSize: 12, background: `${C.expense}1A`, border: `1px solid ${C.expense}33`,
                  color: C.expense, borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontWeight: 600
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
