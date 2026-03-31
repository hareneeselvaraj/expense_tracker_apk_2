/**
 * insightsEngine.js — On-device rule-based financial insights.
 * No API calls — pure math on local data.
 */

/**
 * Generate a list of insights based on transaction history.
 * @returns {Array} insights - [{id, type, emoji, title, body, color}]
 */
export function generateInsights(transactions = [], categories = []) {
  const insights = [];
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonth = (() => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const thisMo = transactions.filter(t => t.date?.startsWith(thisMonth));
  const lastMo = transactions.filter(t => t.date?.startsWith(lastMonth));

  // 1. Savings Rate
  const income = thisMo.filter(t => t.txType === "Income").reduce((s, t) => s + t.amount, 0);
  const expenses = thisMo.filter(t => t.txType === "Expense").reduce((s, t) => s + t.amount, 0);
  if (income > 0) {
    const rate = Math.round(((income - expenses) / income) * 100);
    insights.push({
      id: "savings_rate",
      type: "metric",
      emoji: rate >= 30 ? "🏆" : rate >= 10 ? "💪" : "⚠️",
      title: `${rate}% Savings Rate`,
      body: rate >= 30
        ? "Excellent! You're saving more than 30% of your income."
        : rate >= 10
        ? "Good — aim for 30% to accelerate your goals."
        : "Your expenses are close to your income. Review spending.",
      color: rate >= 30 ? "#00e676" : rate >= 10 ? "#ffab00" : "#ff5252"
    });
  }

  // 2. Spending Trends by Category
  const catSpendThis = {};
  const catSpendLast = {};
  thisMo.filter(t => t.txType === "Expense").forEach(t => {
    const cat = categories.find(c => c.id === t.category);
    const name = cat?.name || "Other";
    catSpendThis[name] = (catSpendThis[name] || 0) + t.amount;
  });
  lastMo.filter(t => t.txType === "Expense").forEach(t => {
    const cat = categories.find(c => c.id === t.category);
    const name = cat?.name || "Other";
    catSpendLast[name] = (catSpendLast[name] || 0) + t.amount;
  });

  Object.keys(catSpendThis).forEach(cat => {
    const thisAmt = catSpendThis[cat];
    const lastAmt = catSpendLast[cat] || 0;
    if (lastAmt > 0) {
      const change = Math.round(((thisAmt - lastAmt) / lastAmt) * 100);
      if (Math.abs(change) >= 20) {
        insights.push({
          id: `trend_${cat}`,
          type: "trend",
          emoji: change > 0 ? "📈" : "📉",
          title: `${cat}: ${change > 0 ? "+" : ""}${change}% vs last month`,
          body: change > 0
            ? `You spent ${Math.abs(change)}% more on ${cat} compared to last month.`
            : `Great! You cut ${cat} spending by ${Math.abs(change)}%.`,
          color: change > 0 ? "#ff5252" : "#00e676"
        });
      }
    }
  });

  // 3. Anomaly Detection — transactions > 3× category average
  const catAvg = {};
  const expTx = transactions.filter(t => t.txType === "Expense");
  expTx.forEach(t => {
    const cat = categories.find(c => c.id === t.category)?.name || "Other";
    if (!catAvg[cat]) catAvg[cat] = { total: 0, count: 0 };
    catAvg[cat].total += t.amount;
    catAvg[cat].count++;
  });

  thisMo.filter(t => t.txType === "Expense").forEach(t => {
    const cat = categories.find(c => c.id === t.category)?.name || "Other";
    const avg = catAvg[cat] ? catAvg[cat].total / catAvg[cat].count : 0;
    if (avg > 0 && t.amount > avg * 3 && t.amount > 500) {
      insights.push({
        id: `anomaly_${t.id}`,
        type: "anomaly",
        emoji: "🚨",
        title: `Unusual ${cat} expense`,
        body: `"${t.description}" (₹${t.amount.toLocaleString()}) is ${Math.round(t.amount / avg)}× your average ${cat} spend.`,
        color: "#ff5252"
      });
    }
  });

  // 4. Top spending category
  const topCat = Object.entries(catSpendThis).sort((a, b) => b[1] - a[1])[0];
  if (topCat && expenses > 0) {
    const pct = Math.round((topCat[1] / expenses) * 100);
    insights.push({
      id: "top_category",
      type: "info",
      emoji: "🎯",
      title: `${topCat[0]} is your top expense`,
      body: `${pct}% of your total spending this month goes to ${topCat[0]}.`,
      color: "#00b0ff"
    });
  }

  return insights.slice(0, 5); // Cap at 5 insights
}
