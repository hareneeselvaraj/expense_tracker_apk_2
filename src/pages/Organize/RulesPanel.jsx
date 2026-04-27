import React, { useState } from "react";
import { Ico } from "../../components/ui/Ico.jsx";
import { Btn } from "../../components/ui/Btn.jsx";
import RuleCard from "../../components/rules/RuleCard.jsx";
import CreateRuleModal from "../../components/rules/CreateRuleModal.jsx";

export default function RulesPanel({ rules, categories, tags, onAddRule, onEditRule, onDeleteRule, onMagicWand, theme }) {
  const C = theme;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  const activeCount = rules.filter(r => r.enabled).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      
      {/* Header Stat (Compact) */}
      <div style={{
        background: C.surface, border: `1px solid ${C.borderLight}`,
        borderRadius: 16, padding: 12, display: "flex", alignItems: "center", gap: 10,
        boxShadow: C.shadow
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: C.input,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16
        }}>
          ⚡
        </div>
        <div style={{ flex: 1 }}>
           <div style={{ color: C.text, fontSize: 13, fontWeight: 800, letterSpacing: "-.01em" }}>Smart Rules</div>
           <div style={{ color: C.sub, fontSize: 11, fontWeight: 600, marginTop: 1 }}>
             {activeCount} active / {rules.length} total
           </div>
        </div>
        <Btn theme={C} sm icon="plus" onClick={() => { setEditingRule(null); setModalOpen(true); }}>Add</Btn>
      </div>

      {rules.length === 0 ? (
        <div style={{ padding: "32px 20px", textAlign: "center", background: C.surface, borderRadius: 24, border: `1px dashed ${C.borderLight}` }}>
           <div style={{ fontSize: 28, marginBottom: 8 }}>🤖</div>
           <div style={{ color: C.text, fontSize: 14, fontWeight: 800 }}>No rules yet</div>
           <div style={{ color: C.sub, fontSize: 12, marginTop: 4, maxWidth: 220, margin: "0 auto", lineHeight: 1.4 }}>
             Create smart rules to automatically categorize, tag, and organize expenses.
           </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", paddingLeft: 8 }}>
            Priority Order
          </div>
          {rules.map((rule, index) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              priority={index + 1}
              theme={C}
              categories={categories}
              tags={tags}
              onToggle={() => onEditRule({ ...rule, enabled: !rule.enabled })}
              onEdit={() => { setEditingRule(rule); setModalOpen(true); }}
              onDelete={() => onDeleteRule(rule.id)}
            />
          ))}
        </div>
      )}

      {/* Magic Wand */}
      <div style={{ marginTop: 4 }}>
        <Btn theme={C} v="soft" full sm icon="stars" onClick={onMagicWand}>
          Re-run All Rules
        </Btn>
      </div>

      {/* Modal */}
      {modalOpen && (
        <CreateRuleModal
          rule={editingRule}
          categories={categories}
          tags={tags}
          theme={C}
          onClose={() => setModalOpen(false)}
          onSave={(newRule) => {
            if (editingRule) {
              onEditRule(newRule);
            } else {
              onAddRule(newRule);
            }
          }}
        />
      )}
    </div>
  );
}
