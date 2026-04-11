import React, { useState } from "react";
import { Btn } from "../../components/ui/Btn.jsx";
import { calculateGoalProgress } from "../utils/goalMath.js";
import { fmtAmt } from "../../utils/format.js";
import { Ico } from "../../components/ui/Ico.jsx";

const GoalCard = ({ goal, activeHoldings, onClick, theme: C }) => {
  const { currentValue, progressPct, monthsRemaining, requiredMonthly, onTrack } = calculateGoalProgress(goal, activeHoldings);
  
  let timeLeftStr = "Overdue";
  if (monthsRemaining >= 12) {
    const y = Math.floor(monthsRemaining / 12);
    const m = monthsRemaining % 12;
    timeLeftStr = `${y}y${m > 0 ? ` ${m}m` : ""} left`;
  } else if (monthsRemaining > 0) {
    timeLeftStr = `${monthsRemaining}m left`;
  }
  
  return (
    <div onClick={onClick} style={{ background: C.surface, borderRadius: 24, padding: 20, border: `1px solid ${C.borderLight}`, boxShadow: C.shadow, display: "flex", flexDirection: "column", gap: 16, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: goal.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            <Ico n={goal.icon || "flag"} sz={20} c={goal.color} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{goal.name}</div>
            <div style={{ fontSize: 11, color: C.sub, fontWeight: 600, marginTop: 2 }}>{new Date(goal.targetDate).getFullYear()} ({timeLeftStr})</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: goal.color }}>{progressPct.toFixed(0)}%</div>
        </div>
      </div>

      <div style={{ width: "100%", height: 8, background: C.input, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${progressPct}%`, height: "100%", background: goal.color, borderRadius: 4 }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
        <div style={{ color: C.sub }}>
           <span style={{ color: C.text, fontWeight: 700 }}>{fmtAmt(currentValue)}</span> of {fmtAmt(goal.targetAmount)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: onTrack ? C.income : C.expense }}>
          {currentValue >= goal.targetAmount ? "✓ Achieved" : onTrack ? "✓ On track" : "⚠ Behind"}
        </div>
      </div>
    </div>
  );
};

export const GoalsPage = ({ investData, theme, onEditGoal, onAddGoal, onDeleteGoal }) => {
  const C = theme;
  const activeGoals = (investData.goals || []).filter(g => !g.deleted);
  const activeHoldings = (investData.holdings || []).filter(h => !h.deleted);

  return (
    <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 16, padding: "20px 20px 100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
         <div>
           <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0, letterSpacing: "-.02em" }}>Goals</h1>
           <div style={{ fontSize: 12, color: C.sub, fontWeight: 600, marginTop: 4 }}>Purpose-driven investing</div>
         </div>
         <Btn theme={C} v="soft" sm icon="plus" onClick={onAddGoal}>Add</Btn>
      </div>

      {activeGoals.length === 0 ? (
        <div style={{ background: C.surface, border: `2px dashed ${C.border}`, borderRadius: 24, padding: 40, textAlign: "center", marginTop: 20 }}>
           <div style={{ fontSize: 40, marginBottom: 16 }}>🎯</div>
           <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>No Goals Set</div>
           <div style={{ fontSize: 12, color: C.sub, margin: "8px 0 20px" }}>Link your holdings to specific life milestones and track your progress natively.</div>
           <Btn theme={C} v="primary" onClick={onAddGoal}>Create First Goal</Btn>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          {activeGoals.map(g => (
            <div key={g.id} style={{ position: "relative" }}>
              <GoalCard goal={g} activeHoldings={activeHoldings} onClick={() => onEditGoal(g)} theme={C} />
              {onDeleteGoal && (
                <button
                  onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete goal "${g.name}"?`)) onDeleteGoal(g.id); }}
                  style={{ position: "absolute", top: 16, right: 16, background: C.input, border: `1px solid ${C.borderLight}`, borderRadius: 10, padding: "6px 10px", cursor: "pointer", color: C.expense, fontSize: 11, fontWeight: 700, zIndex: 2 }}
                >
                  <Ico n="trash" sz={14} c={C.expense} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
