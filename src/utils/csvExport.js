import { todayISO } from "./format.js";

export const exportCSV = (filteredTx, categories, tags, accounts) => {
  const head=["Date","Description","Amount","Credit/Debit","Transaction Type","Category","Tags","Account","Notes"];
  const lines=filteredTx.map(t=>{
    const cat=categories.find(c=>c.id===t.category)?.name||"";
    const tgs=(t.tags||[]).map(tid=>tags.find(tg=>tg.id===tid)?.name||"").join(";");
    const acc=accounts.find(a=>a.id===t.accountId)?.name||"";
    return [t.date,`"${(t.description||"").replace(/"/g,'""')}"`,t.amount,t.creditDebit,t.txType,cat,tgs,acc,`"${(t.notes||"").replace(/"/g,'""')}"`].join(",");
  });
  const a=document.createElement("a"); 
  a.href=URL.createObjectURL(new Blob([[head.join(","),...lines].join("\n")],{type:"text/csv"})); 
  a.download=`transactions_${todayISO()}.csv`; a.click();
};
