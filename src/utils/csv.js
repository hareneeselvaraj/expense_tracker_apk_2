import { uid } from "./id.js";
import { categorizeTransaction } from "../services/categorizationPipeline.js";

export const parseCSV = (file, accountId, cats, rules) => new Promise(resolve => {
  window.Papa.parse(file, { header:true, skipEmptyLines:true, complete:({data:rows,meta}) => {
    const F = keys => meta.fields?.find(f=>keys.some(k=>f.toLowerCase().replace(/[^a-z]/g,"").includes(k)));
    const dateCol=F(["date"]),descCol=F(["description","narration","particular","detail","remark","txn"])||meta.fields?.[1];
    const debitCol=F(["debit","withdrawal","dr"]),creditCol=F(["credit","deposit","cr"]);
    const amtCol=F(["amount"]),typeCol=F(["type","drcr"]);
    const txns = rows.map(row => {
      let amount=0,creditDebit="Debit";
      if(debitCol&&creditCol){
        const d=parseFloat((row[debitCol]||"0").replace(/[^0-9.]/g,""));
        const c=parseFloat((row[creditCol]||"0").replace(/[^0-9.]/g,""));
        if(d>0){amount=d;creditDebit="Debit";}else if(c>0){amount=c;creditDebit="Credit";}
      } else if(amtCol){
        const raw=parseFloat((row[amtCol]||"0").replace(/[^0-9.-]/g,""));
        amount=Math.abs(raw);
        if(typeCol){const t=(row[typeCol]||"").toLowerCase();creditDebit=(t.includes("cr")||t.includes("credit"))?"Credit":"Debit";}
        else{creditDebit=raw<0?"Debit":"Credit";}
      }
      if(amount<=0)return null;
      const desc=(row[descCol]||"Transaction").trim();
      let dateStr=(row[dateCol]||new Date().toISOString()).trim();
      try{dateStr=new Date(dateStr).toISOString().split("T")[0];}catch{}
      
      const draftTx = {id:uid(),date:dateStr,description:desc,amount,creditDebit,txType:"Expense",category:"c13",tags:[],accountId:accountId||"",notes:""};
      const categorizedTx = categorizeTransaction(draftTx, rules, cats);
      
      const catType=cats.find(c=>c.id===categorizedTx.category)?.type;
      categorizedTx.txType=catType==="Investment"?"Investment":catType==="Income"?"Income":creditDebit==="Credit"?"Income":"Expense";
      
      return categorizedTx;
    }).filter(Boolean);
    resolve(txns);
  }, error:()=>resolve([]) });
});
