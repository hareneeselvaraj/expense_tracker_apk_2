export const getAccBal = (accounts, transactions, accId) => {
  const acc = accounts.find(a => a.id === accId);
  if (!acc) return 0;
  const txs = transactions.filter(t => t.accountId === accId && !t.deleted);
  const flow = txs.reduce((s, t) => s + (t.creditDebit === "Credit" ? t.amount : -t.amount), 0);
  return (acc.initialBalance || 0) + flow;
};

export const getNetWorth = (accounts, transactions) => 
  accounts.reduce((s, a) => s + getAccBal(accounts, transactions, a.id), 0);

export const getRecentTx = (transactions, limit = 5) => 
  [...transactions].filter(t => !t.deleted).sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, limit);

export const getDayFlow = (transactions, days = 30) => {
  const data = [];
  const now = new Date();
  for(let i=days; i>=0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    const dayTxs = transactions.filter(t => t.date === ds && !t.deleted);
    const net = dayTxs.reduce((s, t) => s + (t.creditDebit === "Credit" ? t.amount : -t.amount), 0);
    data.push(net);
  }
  return data;
};

export const getSummary = (transactions, categories = []) => {
  const s = { inc: 0, exp: 0, inv: 0, net: 0, catMap: {} };
  transactions.filter(t => !t.deleted).forEach(t => {
    if (t.txType === "Income") s.inc += t.amount;
    else if (t.txType === "Expense") {
      s.exp += t.amount;
      const c = categories.find(c => c.id === t.category);
      const cName = c ? c.name : "Other";
      s.catMap[cName] = (s.catMap[cName] || 0) + t.amount;
    } else if (t.txType === "Investment") s.inv += t.amount;
  });
  s.net = s.inc - s.exp - s.inv;
  return s;
};
