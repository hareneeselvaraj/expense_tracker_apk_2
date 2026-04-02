import React, { useState } from 'react';
import { Ico } from '../ui/Ico.jsx';
import { uid } from '../../utils/id.js';
import ConditionBuilder from './ConditionBuilder.jsx';
import ActionBuilder from './ActionBuilder.jsx';

export default function CreateRuleModal({ rule, onSave, onClose, categories, tags, theme }) {
  const C = theme;
  const isEdit = !!rule;

  const [name, setName] = useState(rule?.name || '');
  const [logic, setLogic] = useState(rule?.logic || 'AND');
  const [conditions, setConditions] = useState(rule?.conditions || [{ type: 'merchant', op: 'contains', val: '' }]);
  const [actions, setActions] = useState(rule?.actions || [{ type: 'categorize', detail: '' }]);
  const [enabled, setEnabled] = useState(rule ? rule.enabled : true);

  const handleSave = () => {
    if (!name.trim()) return alert("Rule must have a name.");
    if (conditions.length === 0) return alert("Add at least one condition.");
    if (actions.length === 0) return alert("Add at least one action.");

    const finalRule = {
      id: rule?.id || uid(),
      name: name.trim(),
      enabled,
      logic,
      conditions,
      actions,
      priority: rule?.priority || 0,
      match_count: rule?.match_count || 0
    };
    onSave(finalRule);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 99999,
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
    }}>
      <div style={{
        background: C.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32,
        height: '90vh', display: 'flex', flexDirection: 'column', position: 'relative',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '24px', borderBottom: `1px solid ${C.borderLight}`
        }}>
          <h2 style={{ margin: 0, color: C.text, fontSize: 18, fontWeight: 800 }}>
            {isEdit ? 'Edit Rule' : 'New Rule'}
          </h2>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.sub, fontWeight: 700 }}>Enabled</span>
            <button
              onClick={() => setEnabled(!enabled)}
              style={{
                width: 44, height: 26, borderRadius: 13, position: 'relative', border: 'none', cursor: 'pointer',
                background: enabled ? C.primary : C.input, transition: 'all 0.3s'
              }}
            >
              <div style={{
                width: 22, height: 22, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2,
                left: enabled ? 20 : 2, transition: 'all 0.3s'
              }} />
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.sub, cursor: 'pointer', padding: 8, marginLeft: 8 }}>
              <Ico n="times" sz={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, paddingBottom: 100, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Rule Name */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.sub, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>Rule Name</label>
            <input
              type="text"
              value={name}
              placeholder="e.g. Netflix Subscription"
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%', background: C.input, border: `1px solid ${C.borderLight}`,
                borderRadius: 16, padding: '16px', color: C.text, fontSize: 16, fontWeight: 600, outline: 'none'
              }}
            />
          </div>

          {/* Logic Toggle */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.sub, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>Match ANY or ALL conditions?</label>
            <div style={{ display: 'flex', background: C.input, borderRadius: 12, padding: 4 }}>
              <button
                onClick={() => setLogic('AND')}
                style={{
                  flex: 1, padding: 10, borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  background: logic === 'AND' ? C.surface : 'transparent',
                  color: logic === 'AND' ? C.primary : C.sub,
                  boxShadow: logic === 'AND' ? `0 2px 8px rgba(0,0,0,0.1)` : 'none'
                }}
              >
                Match ALL (AND)
              </button>
              <button
                onClick={() => setLogic('OR')}
                style={{
                  flex: 1, padding: 10, borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  background: logic === 'OR' ? C.surface : 'transparent',
                  color: logic === 'OR' ? C.primary : C.sub,
                  boxShadow: logic === 'OR' ? `0 2px 8px rgba(0,0,0,0.1)` : 'none'
                }}
              >
                Match ANY (OR)
              </button>
            </div>
          </div>

          <hr style={{ border: 0, borderTop: `1px solid ${C.borderLight}`, margin: 0 }} />

          {/* Condition Builder */}
          <div>
            <h3 style={{ fontSize: 16, color: C.text, fontWeight: 800, margin: '0 0 12px 0' }}>If...</h3>
            <ConditionBuilder conditions={conditions} onChange={setConditions} categories={categories} theme={C} />
          </div>

          {/* Action Builder */}
          <div>
            <h3 style={{ fontSize: 16, color: C.text, fontWeight: 800, margin: '0 0 12px 0' }}>Then...</h3>
            <ActionBuilder actions={actions} onChange={setActions} categories={categories} tags={tags} theme={C} />
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, width: '100%',
          background: C.bg, borderTop: `1px solid ${C.borderLight}`,
          padding: '12px 16px 24px 16px', display: 'flex', gap: 10
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '12px', borderRadius: 12, border: `1px solid ${C.borderLight}`,
              background: C.surface, color: C.text, fontSize: 13, fontWeight: 700, cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 2, padding: '12px', borderRadius: 12, border: 'none',
              background: C.primary, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: `0 4px 12px ${C.primary}40`
            }}
          >
            {isEdit ? 'Save Changes' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  );
}
