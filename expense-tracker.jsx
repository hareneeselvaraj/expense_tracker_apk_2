import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { parseExcelFile, autoDetectColumns, processTransactions, CATEGORY_RULES } from "./statement-engine.js";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ─── IndexedDB ────────────────────────────────────────────────────────────────
const openDB = () => new Promise((res, rej) => {
  const r = indexedDB.open("MoneyLens", 1);
  r.onupgradeneeded = e => e.target.result.createObjectStore("data");
  r.onsuccess = e => res(e.target.result);
  r.onerror = e => rej(e.target.error);
});
const dbGet = async k => { const db = await openDB(); return new Promise((res,rej) => { const r=db.transaction("data","readonly").objectStore("data").get(k); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); };
const dbSet = async (k,v) => { const db = await openDB(); return new Promise((res,rej) => { const tx=db.transaction("data","readwrite"); tx.objectStore("data").put(v,k); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2)+Date.now().toString(36);
const fmtAmt = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:0}).format(Math.abs(n||0));
const fmtDate = d => { try { return new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}); } catch { return d||""; }};
const todayISO = () => new Date().toISOString().split("T")[0];

// ─── Auto-categorize ──────────────────────────────────────────────────────────
const RULES = {
  SWIGGY:"Food & Dining",ZOMATO:"Food & Dining",BLINKIT:"Groceries",BIGBASKET:"Groceries",
  DOMINOS:"Food & Dining",MCDONALDS:"Food & Dining",KFC:"Food & Dining",
  AMAZON:"Shopping",FLIPKART:"Shopping",MYNTRA:"Shopping",MEESHO:"Shopping",AJIO:"Shopping",
  NETFLIX:"Entertainment",SPOTIFY:"Entertainment",HOTSTAR:"Entertainment",PRIME:"Entertainment",
  BOOKMYSHOW:"Entertainment",
  SALARY:"Salary",PAYROLL:"Salary",WAGES:"Salary",
  INTEREST:"Interest",DIVIDEND:"Interest",
  UBER:"Transport",OLA:"Transport",RAPIDO:"Transport",PETROL:"Transport",FUEL:"Transport",IRCTC:"Transport",
  ELECTRICITY:"Utilities",BROADBAND:"Utilities",JIO:"Utilities",AIRTEL:"Utilities",BSNL:"Utilities",
  HOSPITAL:"Healthcare",PHARMACY:"Healthcare",MEDICAL:"Healthcare",APOLLO:"Healthcare",
  SCHOOL:"Education",COLLEGE:"Education",UDEMY:"Education",COURSERA:"Education",
  ATM:"Cash",
  MUTUAL:"Investment",SIP:"Investment",ZERODHA:"Investment",GROWW:"Investment",
};
const autoCategory = (desc, cats) => {
  const up=(desc||"").toUpperCase();
  for(const [k,v] of Object.entries(RULES)){ if(up.includes(k)){const c=cats.find(x=>x.name===v);if(c)return c.id;} }
  return cats.find(x=>x.name==="Others")?.id||"c13";
};

// ─── Defaults ─────────────────────────────────────────────────────────────────
const DEF_CATS = [
  {id:"c1",name:"Food & Dining",type:"Expense",color:"#ef4444"},
  {id:"c2",name:"Groceries",type:"Expense",color:"#f97316"},
  {id:"c3",name:"Shopping",type:"Expense",color:"#f59e0b"},
  {id:"c4",name:"Transport",type:"Expense",color:"#eab308"},
  {id:"c5",name:"Entertainment",type:"Expense",color:"#a855f7"},
  {id:"c6",name:"Healthcare",type:"Expense",color:"#ec4899"},
  {id:"c7",name:"Utilities",type:"Expense",color:"#06b6d4"},
  {id:"c8",name:"Education",type:"Expense",color:"#3b82f6"},
  {id:"c9",name:"Salary",type:"Income",color:"#10b981"},
  {id:"c10",name:"Interest",type:"Income",color:"#34d399"},
  {id:"c11",name:"Investment",type:"Investment",color:"#6366f1"},
  {id:"c12",name:"Cash",type:"Expense",color:"#64748b"},
  {id:"c13",name:"Others",type:"Expense",color:"#94a3b8"},
];
const DEF_TAGS = [
  {id:"t1",name:"Vacation",color:"#f97316"},
  {id:"t2",name:"Birthday",color:"#ec4899"},
  {id:"t3",name:"Work",color:"#3b82f6"},
];
const BLANK_TX = { description:"", amount:"", date:todayISO(), creditDebit:"Debit", txType:"Expense", category:"c13", tags:[], accountId:"", notes:"" };

// ─── CSV Parser ───────────────────────────────────────────────────────────────
const parseCSV = (file, accountId, cats) => new Promise(resolve => {
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
      const category=autoCategory(desc,cats);
      const catType=cats.find(c=>c.id===category)?.type;
      const txType=catType==="Investment"?"Investment":catType==="Income"?"Income":creditDebit==="Credit"?"Income":"Expense";
      return {id:uid(),date:dateStr,description:desc,amount,creditDebit,txType,category,tags:[],accountId:accountId||"",notes:""};
    }).filter(Boolean);
    resolve(txns);
  }, error:()=>resolve([]) });
});

// ─── Theme ────────────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg: "#020408", surface: "rgba(8, 14, 28, 0.85)", card: "rgba(12, 20, 38, 0.6)", border: "rgba(100, 180, 255, 0.06)",
    borderLight: "rgba(100, 200, 255, 0.1)", text: "#eef4ff", sub: "#7b8fad", muted: "rgba(20, 32, 56, 0.6)",
    input: "rgba(10, 18, 36, 0.9)", shadow: "0 12px 48px 0 rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(100, 180, 255, 0.03)",
    glass: "backdrop-filter: blur(24px) saturate(200%);",
    navBg: "rgba(6, 10, 22, 0.9)", headerBg: "rgba(2, 4, 8, 0.85)",
    glow1: "rgba(0, 242, 254, 0.04)", glow2: "rgba(79, 172, 254, 0.03)",
    cardGlow: "0 0 40px rgba(0, 242, 254, 0.03), inset 0 1px 0 rgba(255,255,255,0.04)"
  },
  light: {
    bg: "#f0f4f8", surface: "rgba(255, 255, 255, 0.9)", card: "rgba(255, 255, 255, 0.8)", border: "rgba(15, 23, 42, 0.06)",
    borderLight: "rgba(15, 23, 42, 0.1)", text: "#0c1222", sub: "#556680", muted: "rgba(220, 230, 245, 0.8)",
    input: "rgba(238, 243, 250, 0.95)", shadow: "0 12px 48px 0 rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(15, 23, 42, 0.03)",
    glass: "backdrop-filter: blur(24px) saturate(220%);",
    navBg: "rgba(255, 255, 255, 0.92)", headerBg: "rgba(240, 244, 248, 0.9)",
    glow1: "rgba(0, 150, 200, 0.04)", glow2: "rgba(100, 120, 255, 0.03)",
    cardGlow: "0 0 40px rgba(0, 150, 200, 0.04), inset 0 1px 0 rgba(255,255,255,0.5)"
  }
};

const BASE_C = {
  primary: "#00e5ff", secondary: "#6366f1", primaryDim: "rgba(0, 229, 255, 0.12)",
  income: "#00e676", expense: "#ff5252", invest: "#b388ff", credit: "#00e676", debit: "#ff5252"
};

let C = {}; // Will be set in App

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IC = {
  home:"M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  list:"M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
  bank:"M4 10v7h3v-7H4zm6.5 0v7h3v-7h-3zM2 22h19v-3H2v3zm15-12v7h3v-7h-3zM11.5 1L2 6v2h19V6l-9.5-5z",
  tag:"M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z",
  grid:"M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z",
  plus:"M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  close:"M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  upload:"M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z",
  down:"M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z",
  filter:"M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39A.998.998 0 0019 4H5c-.72 0-1.15.82-.75 1.61z",
  trash:"M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  cloud:"M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z",
  info:"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
  edit:"M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  pen:"M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14zm-7 3l-6 6v3h3l6-6-3-3zm4.5-1.5l-1.5 1.5 3 3 1.5-1.5-3-3z",
  sun:"M12 9c1.65 0 3 1.35 3 3s-1.35 3-3 3-3-1.35-3-3 1.35-3 3-3m0-2c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 000-1.41l-1.06-1.06zm1.06-12.37a.996.996 0 000 1.41l-1.06 1.06a.996.996 0 101.41 1.41l1.06-1.06a.996.996 0 000-1.41.996.996 0 00-1.41 0zM7.05 18.36a.996.996 0 000-1.41l-1.06-1.06a.996.996 0 10-1.41 1.41l1.06 1.06c.38.39 1.02.39 1.41 0z",
  moon:"M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-3.03 0-5.5-2.47-5.5-5.5 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z",
  trendUp:"M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z",
  trendDown:"M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6z",
  wallet:"M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z",
  stars:"M11.99 2c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10-4.48-10-10-10zm4.24 14.64l-4.24-2.23-4.24 2.23.81-4.72-3.43-3.34 4.74-.69 2.12-4.3 2.12 4.3 4.74.69-3.43 3.34.81 4.72z",
  chevronDown:"M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z",
  chevronLeft:"M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z",
  chevronRight:"M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z",
  chart:"M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.4 8h3v6h-3v-6z",
  analyze:"M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H6v-2h6v2zm4-4H6v-2h10v2zm0-4H6V7h10v2z",
  check:"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z",
};
const Ico = ({n,sz=18,c="currentColor"}) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill={c} style={{flexShrink:0}}><path d={IC[n]||""}/></svg>;

// ─── Primitives ───────────────────────────────────────────────────────────────
const Modal = ({open,onClose,title,children}) => {
  const [active, setActive] = useState(false);
  useEffect(() => { if(open) setTimeout(()=>setActive(true), 10); else setActive(false); }, [open]);
  if(!open) return null;
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",backdropFilter:"blur(12px)",zIndex:600,display:"flex",alignItems:"flex-end",justifyContent:"center",transition:"opacity .3s ease",opacity:active?1:0}}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:C.surface, borderWidth:1,borderStyle:"solid",borderColor:C.border, borderRadius:"36px 36px 0 0", width:"100%", maxWidth:600, maxHeight:"92vh", overflow:"auto",
        backdropFilter:"blur(32px) saturate(200%)", boxShadow:`${C.shadow}, ${C.cardGlow||"none"}`, transform:active?"translateY(0)":"translateY(100%)", transition:"transform .45s cubic-bezier(0.16, 1, 0.3, 1)"
      }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"24px 24px 16px",borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,background:C.surface,zIndex:1, backdropFilter:"blur(20px)"}}>
          <span style={{color:C.text,fontSize:18,fontWeight:800,letterSpacing:"-.02em"}}>{title}</span>
          <button onClick={onClose} style={{background:C.muted,border:"none",borderRadius:"50%",color:C.text,cursor:"pointer",padding:8,display:"flex",transition:"transform .2s"}} onMouseOver={e=>e.currentTarget.style.transform="scale(1.1)"} onMouseOut={e=>e.currentTarget.style.transform="scale(1)"}><Ico n="close" sz={20}/></button>
        </div>
        <div style={{padding:"20px 24px 40px"}}>{children}</div>
      </div>
    </div>
  );
};

const FLabel = ({children}) => <label style={{color:C.sub,fontSize:10,fontWeight:800,letterSpacing:".1em",textTransform:"uppercase",display:"block",marginBottom:5}}>{children}</label>;

const FInput = ({value,onChange,placeholder,type="text",style:x}) => (
  <input value={value} onChange={onChange} placeholder={placeholder} type={type} style={{
    background:C.input,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:10,padding:"10px 13px",
    color:C.text,fontSize:14,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"inherit",...x
  }}/>
);


const CustomSelect = ({ label, value, options, onChange, placeholder = "Select..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const selected = options.find(o => (o.id === value || o.name === value));
  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {label && <FLabel>{label}</FLabel>}
      <div onClick={() => setIsOpen(!isOpen)} style={{
        background: C.input, border: `1px solid ${isOpen ? C.primary : C.border}`, borderRadius: 12, padding: "10px 14px", cursor: "pointer", 
        display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all .2s ease", minHeight: 44
      }}>
        <div style={{ display: "flex", alignItems: "center", gap:10 }}>
          {selected?.color && <div style={{ width: 8, height: 8, borderRadius: "50%", background: selected.color }} />}
          <span style={{ color: selected ? C.text : C.sub, fontSize: 13, fontWeight: 700 }}>{selected ? (selected.name || selected.label) : placeholder}</span>
        </div>
        <div style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .3s", display: "flex", color: C.sub }}>
          <Ico n="chevronDown" sz={18} />
        </div>
      </div>
      {isOpen && (
        <div className="page-enter" style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, 
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)", zIndex: 1000, maxHeight: 250, overflowY: "auto", backdropFilter: "blur(25px)", padding: 6
        }}>
          {options.map(opt => (
            <div key={opt.id || opt.name} onClick={() => { onChange(opt.id || opt.name); setIsOpen(false); }} style={{
              padding: "10px 12px", borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "background .2s",
              background: (opt.id || opt.name) === value ? C.primary + "15" : "transparent"
            }} onMouseEnter={e => e.currentTarget.style.background = C.muted} onMouseLeave={e => e.currentTarget.style.background = (opt.id || opt.name) === value ? C.primary + "15" : "transparent"}>
              {opt.color && <div style={{ width: 8, height: 8, borderRadius: "50%", background: opt.color }} />}
              <span style={{ color: (opt.id || opt.name) === value ? C.primary : C.text, fontSize: 13, fontWeight: 700 }}>{opt.name || opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Btn = ({children,onClick,v="primary",icon,disabled,full,sm}) => {
  const vs={
    primary:{bg:`linear-gradient(135deg, ${C.primary}, ${C.secondary})`,co:"#000",bo:"none"},
    ghost:{bg:"transparent",co:C.text,bo:`1px solid ${C.border}`},
    danger:{bg:C.expense,co:"#fff",bo:"none"},
    soft:{bg:C.muted,co:C.text,bo:"none"}
  };
  const s=vs[v]||vs.primary;
  const isGrad = s.bg.includes("gradient");
  return (
    <button onClick={onClick} disabled={disabled} style={{
      backgroundColor: isGrad ? "transparent" : s.bg,
      backgroundImage: isGrad ? s.bg : "none",
      backgroundSize: isGrad ? "200% 200%" : "auto",
      animation: (v==="primary" && isGrad) ? "gradientShift 3s ease infinite" : "none",
      color:s.co,borderWidth:s.bo==="none"?0:1,borderStyle:"solid",borderColor:s.bo==="none"?"transparent":C.border,borderRadius:16,padding:sm?"8px 16px":"14px 24px",
      fontSize:sm?13:14,fontWeight:800,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,
      display:"flex",alignItems:"center",gap:8,justifyContent:"center",
      width:full?"100%":"auto",fontFamily:"inherit",transition:"all .35s cubic-bezier(0.16, 1, 0.3, 1)",
      boxShadow:v==="primary"?`0 4px 20px ${C.primaryDim}`:"none",
    }} onMouseEnter={e=>{if(!disabled){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=v==="primary"?`0 8px 32px ${C.primaryDim}, 0 0 40px ${C.primaryDim}`:"none";}}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=v==="primary"?`0 4px 20px ${C.primaryDim}`:"none";}}>
      {icon&&<Ico n={icon} sz={sm?14:16} c={s.co}/>}{children}
    </button>
  );
};

// Toggle for Credit / Debit
const CdToggle = ({value,onChange}) => (
  <div style={{display:"flex",background:C.input,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:10,overflow:"hidden",height:42}}>
    {["Credit","Debit"].map(opt => (
      <button key={opt} onClick={()=>onChange(opt)} style={{
        flex:1,border:"none",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer",
        background:value===opt?(opt==="Credit"?C.income+"33":C.expense+"33"):"transparent",
        color:value===opt?(opt==="Credit"?C.income:C.expense):C.sub,
        transition:"all .15s",
      }}>{opt}</button>
    ))}
  </div>
);

// Toggle for txType
const TypeToggle = ({value,onChange}) => (
  <div style={{display:"flex",background:C.input,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:10,overflow:"hidden",height:42}}>
    {["Expense","Income","Investment"].map(opt => {
      const col=opt==="Expense"?C.expense:opt==="Income"?C.income:C.invest;
      return <button key={opt} onClick={()=>onChange(opt)} style={{flex:1,border:"none",fontFamily:"inherit",fontSize:12,fontWeight:700,cursor:"pointer",background:value===opt?col+"33":"transparent",color:value===opt?col:C.sub,transition:"all .15s"}}>{opt}</button>;
    })}
  </div>
);

// ─── Transaction Form (shared for add + edit) ─────────────────────────────────
const TxForm = ({init, categories, tags, accounts, onSave, onDelete, onClose}) => {
  const [tx, setTx] = useState({...BLANK_TX, ...init});
  const f = k => v => setTx(p=>({...p,[k]:v}));
  const fEv = k => e => setTx(p=>({...p,[k]:e.target.value}));

  const toggleTag = tid => setTx(p=>({...p,tags:(p.tags||[]).includes(tid)?p.tags.filter(x=>x!==tid):[...(p.tags||[]),tid]}));

  const valid = tx.description.trim() && parseFloat(tx.amount) > 0;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>

      {/* Row 1: Date */}
      <div>
        <FLabel>Date</FLabel>
        <FInput value={tx.date} onChange={fEv("date")} type="date"/>
      </div>

      {/* Row 2: Credit / Debit toggle */}
      <div>
        <FLabel>Credit / Debit</FLabel>
        <CdToggle value={tx.creditDebit} onChange={v=>{
          setTx(p=>({...p, creditDebit:v, txType:v==="Credit"?"Income":"Expense"}));
        }}/>
      </div>

      {/* Row 3: Transaction Type */}
      <div>
        <FLabel>Transaction Type</FLabel>
        <TypeToggle value={tx.txType} onChange={f("txType")}/>
      </div>

      {/* Row 4: Category */}
      <CustomSelect 
        label="Category" 
        value={tx.category} 
        options={categories.filter(c=>c.type===tx.txType)} 
        onChange={f("category")}
      />

      {/* Row 5: Description */}
      <div>
        <FLabel>Description</FLabel>
        <FInput value={tx.description} onChange={fEv("description")} placeholder="e.g. Swiggy, Salary, Rent…"/>
      </div>

      {/* Row 6: Amount */}
      <div>
        <FLabel>Amount (₹)</FLabel>
        <FInput value={tx.amount} onChange={fEv("amount")} type="number" placeholder="0" style={{fontFamily:"'JetBrains Mono',monospace",fontSize:18,fontWeight:700,color:tx.creditDebit==="Credit"?C.income:C.expense}}/>
      </div>

      {/* Row 7: Tags */}
      <div>
        <FLabel>Tags</FLabel>
        {tags.length===0
          ? <div style={{color:C.sub,fontSize:12,padding:"8px 0"}}>No tags yet — add them in the Tags page</div>
          : <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
              {tags.map(tg=>{
                const sel=(tx.tags||[]).includes(tg.id);
                return <button key={tg.id} onClick={()=>toggleTag(tg.id)} style={{background:sel?tg.color+"30":"transparent",border:`1px solid ${sel?tg.color:C.border}`,borderRadius:8,padding:"5px 11px",color:sel?tg.color:C.sub,cursor:"pointer",fontSize:12,fontWeight:sel?700:500,fontFamily:"inherit"}}>#{tg.name}</button>;
              })}
            </div>
        }
      </div>

      {/* Row 8: Account + Notes */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div>
          <CustomSelect 
            label="Account" 
            value={tx.accountId||""} 
            options={[{id:"", name:"None", color:C.sub}, ...accounts.map(a=>({...a, color:C.primary}))]} 
            onChange={f("accountId")}
          />
        </div>
        <div>
          <FLabel>Notes</FLabel>
          <FInput value={tx.notes||""} onChange={fEv("notes")} placeholder="Optional…"/>
        </div>
      </div>

      {/* Actions */}
      <div style={{display:"flex",gap:10,paddingTop:4}}>
        {onDelete && <Btn v="danger" sm icon="trash" onClick={()=>onDelete(tx.id)}>Delete</Btn>}
        <Btn full disabled={!valid} onClick={()=>onSave(tx)}>{init?.id ? "Save Changes" : "Add Transaction"}</Btn>
      </div>
    </div>
  );
};

// ─── Transaction Row Card ─────────────────────────────────────────────────────
// Columns: Date | Type pill | Category dot+name | Description | Tags | Amount | CR/DR badge
const TxRow = ({t, categories, tags, accounts, onClick}) => {
  const cat = categories.find(c=>c.id===t.category);
  const txTags = (t.tags||[]).map(tid=>tags.find(tg=>tg.id===tid)).filter(Boolean);
  const amtColor = t.creditDebit==="Credit" ? C.credit : C.debit;
  const typeColor = t.txType==="Income"?C.income:t.txType==="Investment"?C.invest:C.expense;

  return (
    <div onClick={onClick} style={{
      background:C.card, borderWidth:1, borderStyle:"solid", borderColor:C.border, borderRadius:22, padding:"16px", cursor:"pointer",
      display:"flex", flexDirection:"column", gap:12, transition:"all .35s cubic-bezier(0.16, 1, 0.3, 1)", backdropFilter:"blur(16px) saturate(200%)",
      boxShadow:C.cardGlow||"none"
    }} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.primary;e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 32px ${C.primaryDim}`;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=C.cardGlow||"none";}}>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:12,background:cat?.color+"20",display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${cat?.color}40`}}>
             <div style={{width:10,height:10,borderRadius:"50%",background:cat?.color||C.sub}}/>
          </div>
          <div style={{display:"flex",flexDirection:"column"}}>
            <span style={{color:C.text,fontSize:14,fontWeight:700}}>{cat?.name||"Others"}</span>
            <span style={{color:C.sub,fontSize:11,fontWeight:500}}>{fmtDate(t.date)}</span>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <span style={{color:amtColor,fontSize:16,fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>
            {t.creditDebit==="Credit"?"+":"−"}{fmtAmt(t.amount)}
          </span>
          <div style={{fontSize:9,fontWeight:800,color:C.sub,marginTop:2,letterSpacing:".05em",textTransform:"uppercase"}}>{t.txType}</div>
        </div>
      </div>

      <div style={{color:C.text,fontSize:14,fontWeight:500,lineHeight:1.4, opacity:0.9}}>
        {t.description}
      </div>

      {(txTags.length>0 || t.accountId) && (
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap", paddingTop:4, borderTop:`1px solid ${C.border}`}}>
          {txTags.map(tg=>(
            <span key={tg.id} style={{background:tg.color+"20",color:tg.color,borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,border:`1px solid ${tg.color}40`}}>#{tg.name}</span>
          ))}
          {t.accountId && accounts.find(a=>a.id===t.accountId) && (
            <span style={{color:C.sub,fontSize:11,fontWeight:600,marginLeft:"auto",display:"flex",alignItems:"center",gap:4}}>
               <Ico n="bank" sz={12}/> {accounts.find(a=>a.id===t.accountId)?.name}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [ready, setReady] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const [themeMode, setThemeMode] = useState("dark");
  const [user, setUser] = useState(null); 
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState(DEF_CATS);
  const [tags, setTags] = useState(DEF_TAGS);
  const [accounts, setAccounts] = useState([]);

  const [page, setPage] = useState("dashboard");
  const [reportTab, setReportTab] = useState("month");
  const [reportDate, setReportDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [toast, setToast] = useState(null);

  C = { ...THEMES[themeMode], ...BASE_C };

  // modals
  const [addTx, setAddTx] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showNewCat, setShowNewCat] = useState(false);
  const [showNewTag, setShowNewTag] = useState(false);
  const [showNewAcc, setShowNewAcc] = useState(false);
  const [showBackup, setShowBackup] = useState(false);

  const [filters, setFilters] = useState({from:"",to:"",cat:"",tags:[],acc:"",type:"",cd:""});
  const [searchQ, setSearchQ] = useState("");
  const [newCat, setNewCat] = useState({name:"",type:"Expense",color:"#00dba8",budget:""});
  const [newTag, setNewTag] = useState({name:"",color:"#00dba8"});
  const [editingTag, setEditingTag] = useState(null);
  const [newAcc, setNewAcc] = useState({name:"",type:"Bank",initialBalance:""});
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadAcc, setUploadAcc] = useState("");
  const [uploading, setUploading] = useState(false);

  // Google Drive state
  const [driveSaving, setDriveSaving] = useState(false);
  const [driveRestoring, setDriveRestoring] = useState(false);
  const [driveFiles, setDriveFiles] = useState([]);
  const [driveStep, setDriveStep] = useState(null); // null | 'saving' | 'list' | 'restoring'
  const driveTokenRef = useRef(null);

  const fileRef = useRef(), importRef = useRef(), analyzerFileRef = useRef();
  const [analyzerState, setAnalyzerState] = useState({ step: "upload", file: null, headers: [], rows: [], columnMap: {}, processed: [], loading: false, error: "" });

  const notify = (msg, type="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null), 3000); };

  // ── Load IndexedDB ──────────────────────────────────────────────────────────
  const CLIENT_ID = "387061627642-rf37d4vu08atlueo9vmf2aad8cp09shu.apps.googleusercontent.com";

  useEffect(() => {
    (async () => {
      try {
        const u = await dbGet("user");
        if(u) setUser(u);
        const t = await dbGet("theme");
        if(t) setThemeMode(t);
        const d = await dbGet("appData");
        if(d){
          if(d.transactions) setTransactions(d.transactions);
          if(d.categories)   setCategories(d.categories);
          if(d.tags)         setTags(d.tags);
          if(d.accounts)     setAccounts(d.accounts);
        }
      } catch {}

      // Load GIS
      if(!window.google) {
        const s=document.createElement("script"); s.src="https://accounts.google.com/gsi/client"; s.async=true; s.defer=true;
        s.onload=()=>setGisLoaded(true);
        document.head.appendChild(s);
      } else {
        setGisLoaded(true);
      }
      
      setReady(true);
      if(!window.Papa){ const s=document.createElement("script"); s.src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"; document.head.appendChild(s); }
      const l=document.createElement("link"); l.rel="stylesheet"; l.href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"; document.head.appendChild(l);
    })();
  }, []);

  // ── Auth Flow ──────────────────────────────────────────────────────────────
  const handleCredentialResponse = (response) => {
    try {
      const payload = JSON.parse(atob(response.credential.split(".")[1]));
      const u = { name: payload.name, email: payload.email, picture: payload.picture };
      setUser(u); dbSet("user", u);
      notify(`Welcome back, ${u.name.split(" ")[0]}!`);
    } catch { notify("Login failed","error"); }
  };

  useEffect(() => {
    if(ready && gisLoaded && !user) {
      window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: handleCredentialResponse });
      window.google.accounts.id.renderButton(document.getElementById("googleBtn"), { theme: "outline", size: "large", width: 340, shape: "pill" });
    }
  }, [ready, gisLoaded, user]);

  const login = (u) => { setUser(u); dbSet("user", u); notify(`Welcome back, ${u.name.split(" ")[0]}!`); };
  const logout = () => { setUser(null); dbSet("user", null); setPage("dashboard"); };
  const toggleTheme = () => {
    const next = themeMode==="dark"?"light":"dark";
    setThemeMode(next); dbSet("theme", next);
  };

  // ── Persist ──────────────────────────────────────────────────────────────────
  const cur = useRef({});
  cur.current = {transactions,categories,tags,accounts};
  const save = useCallback(patch => { try { dbSet("appData",{...cur.current,...patch}); } catch {} }, []);

  const setTx   = fn => { const n=typeof fn==="function"?fn(transactions):fn; setTransactions(n); save({transactions:n}); };
  const setCats  = fn => { const n=typeof fn==="function"?fn(categories):fn;  setCategories(n);  save({categories:n}); };
  const setTgs   = fn => { const n=typeof fn==="function"?fn(tags):fn;        setTags(n);        save({tags:n}); };
  const setAccs  = fn => { const n=typeof fn==="function"?fn(accounts):fn;    setAccounts(n);    save({accounts:n}); };

  // ── Add / Edit transaction ───────────────────────────────────────────────────
  const handleSaveTx = (tx) => {
    const amt = parseFloat(tx.amount)||0;
    const finalTx = {...tx, amount:amt, id:tx.id||uid()};
    if(tx.id){ setTx(prev=>prev.map(t=>t.id===tx.id?finalTx:t)); notify("✓ Saved"); }
    else      { setTx(prev=>[finalTx,...prev]); notify("✓ Transaction added"); }
    setAddTx(false); setEditTx(null);
  };
  const handleDeleteTx = id => { setTx(prev=>prev.filter(t=>t.id!==id)); setEditTx(null); notify("Deleted"); };

  // ── Upload CSV ───────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if(!uploadFile||!window.Papa) return;
    setUploading(true);
    try {
      const parsed = await parseCSV(uploadFile, uploadAcc, categories);
      setTx(prev=>[...parsed,...prev]);
      setShowUpload(false); setUploadFile(null); setUploadAcc("");
      notify(`✓ Imported ${parsed.length} transactions`);
    } catch { notify("Parse error","error"); }
    setUploading(false);
  };

  // ── Backup / Restore ─────────────────────────────────────────────────────────
  const exportBackup = () => {
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([JSON.stringify({transactions,categories,tags,accounts,exported:new Date().toISOString()},null,2)],{type:"application/json"}));
    a.download=`moneylens_${todayISO()}.json`; a.click();
    notify("✓ Backup downloaded");
  };
  const importBackup = e => {
    const f=e.target.files?.[0]; if(!f) return;
    const r=new FileReader();
    r.onload=ev=>{
      try {
        const d=JSON.parse(ev.target.result);
        if(d.transactions) setTx(d.transactions);
        if(d.categories)   setCats(d.categories);
        if(d.tags)         setTgs(d.tags);
        if(d.accounts)     setAccs(d.accounts);
        notify(`✓ Restored ${d.transactions?.length||0} transactions`); setShowBackup(false);
      } catch { notify("Invalid file","error"); }
    };
    r.readAsText(f); e.target.value="";
  };

  // ── Google Drive Backup ────────────────────────────────────────────────────
  const getDriveToken = () => new Promise((resolve, reject) => {
    if (driveTokenRef.current) { resolve(driveTokenRef.current); return; }
    if (!window.google?.accounts?.oauth2) { reject(new Error("Google API not loaded")); return; }
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (resp) => {
        if (resp.error) { reject(new Error(resp.error)); return; }
        driveTokenRef.current = resp.access_token;
        // Token expires in ~1hr, clear it after 50 min
        setTimeout(() => { driveTokenRef.current = null; }, 50 * 60 * 1000);
        resolve(resp.access_token);
      },
    });
    tokenClient.requestAccessToken();
  });

  const saveToDrive = async () => {
    setDriveStep("saving");
    try {
      const token = await getDriveToken();
      const backupData = JSON.stringify({transactions, categories, tags, accounts, exported: new Date().toISOString()}, null, 2);
      const fileName = `MoneyLens_Backup_${todayISO()}.json`;

      // Check if a backup file already exists (to update it)
      const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name contains 'MoneyLens_Backup' and trashed=false&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const listData = await listRes.json();
      const existingFile = listData.files?.[0];

      const metadata = { name: fileName, mimeType: "application/json" };
      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
      form.append("file", new Blob([backupData], { type: "application/json" }));

      let url, method;
      if (existingFile) {
        // Update existing file
        url = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`;
        method = "PATCH";
      } else {
        // Create new file
        url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
        method = "POST";
      }

      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: form });
      if (!res.ok) throw new Error(`Drive API error: ${res.status}`);
      
      notify(`☁️ Backup saved to Google Drive!`);
      setDriveStep(null);
    } catch (err) {
      console.error("Drive save error:", err);
      notify(`Drive error: ${err.message}`, "error");
      setDriveStep(null);
    }
  };

  const listDriveBackups = async () => {
    setDriveStep("list");
    try {
      const token = await getDriveToken();
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=name contains 'MoneyLens_Backup' and trashed=false&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setDriveFiles(data.files || []);
    } catch (err) {
      notify(`Drive error: ${err.message}`, "error");
      setDriveStep(null);
    }
  };

  const restoreFromDrive = async (fileId) => {
    setDriveStep("restoring");
    try {
      const token = await getDriveToken();
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await res.json();
      if (d.transactions) setTx(d.transactions);
      if (d.categories)   setCats(d.categories);
      if (d.tags)         setTgs(d.tags);
      if (d.accounts)     setAccs(d.accounts);
      notify(`☁️ Restored ${d.transactions?.length || 0} transactions from Drive!`);
      setDriveStep(null); setShowBackup(false);
    } catch (err) {
      notify(`Restore error: ${err.message}`, "error");
      setDriveStep(null);
    }
  };

  // ── Export CSV ───────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const head=["Date","Description","Amount","Credit/Debit","Transaction Type","Category","Tags","Account","Notes"];
    const lines=filteredTx.map(t=>{
      const cat=categories.find(c=>c.id===t.category)?.name||"";
      const tgs=(t.tags||[]).map(tid=>tags.find(tg=>tg.id===tid)?.name||"").join(";");
      const acc=accounts.find(a=>a.id===t.accountId)?.name||"";
      return [t.date,`"${(t.description||"").replace(/"/g,"'")}"`,t.amount,t.creditDebit,t.txType,cat,tgs,acc,`"${t.notes||""}"`].join(",");
    });
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([[head.join(","),...lines].join("\n")],{type:"text/csv"})); a.download=`transactions_${todayISO()}.csv`; a.click();
    notify(`✓ Exported ${filteredTx.length} rows`);
  };

  const exportTransactionsPDF = () => {
    const doc = new jsPDF();
    const accent = [0, 229, 255]; // Primary neon
    
    // Header
    doc.setFillColor(15, 23, 42); // Dark surface
    doc.rect(0, 0, 210, 40, "F");
    
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("EXPENSE TRACKER", 15, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.text(`TRANSACTION LEDGER — ${filteredTx.length} RECORDS`, 15, 28);
    
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 195, 20, { align: "right" });

    // Summary Boxes (NEW)
    const inc = filteredTx.filter(t=>t.txType==="Income").reduce((s,t)=>s+t.amount,0);
    const exp = filteredTx.filter(t=>t.txType==="Expense").reduce((s,t)=>s+t.amount,0);
    const net = inc - exp;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 45, 58, 22, 3, 3, "F");
    doc.roundedRect(76, 45, 58, 22, 3, 3, "F");
    doc.roundedRect(137, 45, 58, 22, 3, 3, "F");
    
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("TOTAL INCOME", 20, 51);
    doc.text("TOTAL EXPENSE", 81, 51);
    doc.text("NET FLOW", 142, 51);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 180, 100); // Income
    doc.text(`Rs. ${inc.toLocaleString()}`, 20, 60);
    doc.setTextColor(220, 50, 50); // Expense
    doc.text(`Rs. ${exp.toLocaleString()}`, 81, 60);
    doc.setTextColor(net >= 0 ? 0 : 220, net >= 0 ? 180 : 50, net >= 0 ? 100 : 50);
    doc.text(`Rs. ${net.toLocaleString()}`, 142, 60);

    // Filter info
    let startY = 75;
    if (hasFilter || searchQ) {
      doc.setFontSize(8);
      doc.setTextColor(100);
      let filterText = "Active Filters: ";
      if (searchQ) filterText += `Search: "${searchQ}" | `;
      if (filters.cat) filterText += `Category: ${categories.find(c=>c.id===filters.cat)?.name} | `;
      if (filters.acc) filterText += `Account: ${accounts.find(a=>a.id===filters.acc)?.name} | `;
      doc.text(filterText, 15, 72);
      startY = 76;
    }
    
    // Transactions Table
    const txRows = filteredTx.map(t => [
      t.date, 
      (t.description || "").substring(0, 40), 
      categories.find(c=>c.id===t.category)?.name || "Other",
      t.creditDebit, 
      `Rs. ${t.amount.toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: startY,
      head: [["Date", "Description", "Category", "Type", "Amount"]],
      body: txRows,
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      columnStyles: {
        4: { halign: "right", fontStyle: "bold" }
      },
      margin: { left: 15, right: 15 },
      styles: { fontSize: 9 }
    });
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
       doc.setPage(i);
       doc.setFontSize(8);
       doc.setTextColor(150);
       doc.text(`Page ${i} of ${pageCount} — Verified Report`, 105, 290, { align: "center" });
    }
    
    doc.save(`Ledger_${todayISO()}.pdf`);
    notify(`✓ PDF Exported: ${filteredTx.length} records`);
  };

  // ── Filtered ─────────────────────────────────────────────────────────────────
  const filteredTx = useMemo(() => transactions.filter(t => {
    if(filters.from && t.date<filters.from) return false;
    if(filters.to   && t.date>filters.to)   return false;
    if(filters.cat  && t.category!==filters.cat) return false;
    if(filters.acc  && t.accountId!==filters.acc) return false;
    if(filters.type && t.txType!==filters.type) return false;
    if(filters.cd   && t.creditDebit!==filters.cd) return false;
    if(filters.tags.length && !filters.tags.every(tid=>(t.tags||[]).includes(tid))) return false;
    if(searchQ && !(t.description||"").toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  }).sort((a,b)=>b.date.localeCompare(a.date)), [transactions,filters,searchQ]);

  const hasFilter = filters.from||filters.to||filters.cat||filters.acc||filters.type||filters.cd||filters.tags.length;

  // ── Dashboard stats ───────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const mo = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
    });
    const income = mo.filter(t => t.txType === "Income").reduce((s, t) => s + t.amount, 0);
    const expense = mo.filter(t => t.txType === "Expense").reduce((s, t) => s + t.amount, 0);
    const invest = mo.filter(t => t.txType === "Investment").reduce((s, t) => s + t.amount, 0);
    const catMap = {}, tagMap = {};
    mo.forEach(t => {
      const c = categories.find(x => x.id === t.category)?.name || "Others";
      catMap[c] = (catMap[c] || 0) + t.amount;
      (t.tags || []).forEach(tid => {
        const n = tags.find(x => x.id === tid)?.name;
        if (n) tagMap[n] = (tagMap[n] || 0) + t.amount;
      });
    });
    return { income, expense, invest, catMap, tagMap, count: mo.length };
  }, [transactions, categories, tags, viewDate]);

  if(!ready) return <div style={{background:C.bg,height:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:36,height:36,borderRadius:"50%",borderWidth:3,borderStyle:"solid",borderLeftColor:C.muted,borderRightColor:C.muted,borderBottomColor:C.muted,borderTopColor:C.primary,animation:"spin .7s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE: DASHBOARD
  // ════════════════════════════════════════════════════════════════════════════
  const Dashboard = (
    <div className="page-enter" style={{padding:"20px 20px 100px 20px",display:"flex",flexDirection:"column",gap:24}}>
      
      {/* Greeting + Month Picker */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:900,color:C.text,margin:0,letterSpacing:"-.03em"}}>Hello, {user?.name?.split(" ")[0]||"User"}!</h1>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
            <button onClick={()=>setViewDate(new Date(viewDate.getFullYear(),viewDate.getMonth()-1,1))} style={{background:C.input,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:"50%",padding:4,color:C.sub,cursor:"pointer"}}><Ico n="chevronLeft" sz={14}/></button>
            <span style={{fontSize:13,color:C.sub,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em"}}>{viewDate.toLocaleString("en",{month:"long",year:"numeric"})}</span>
            <button onClick={()=>setViewDate(new Date(viewDate.getFullYear(),viewDate.getMonth()+1,1))} style={{background:C.input,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:"50%",padding:4,color:C.sub,cursor:"pointer"}}><Ico n="chevronRight" sz={14}/></button>
          </div>
        </div>
        {user?.picture && <img src={user.picture} style={{width:44,height:44,borderRadius:14,border:`2px solid ${C.borderLight}`,boxShadow:C.shadow}} alt="Profile"/>}
      </div>

      {/* Hero Balance Card */}
      <div style={{
        backgroundImage:`linear-gradient(135deg, ${C.primary}, ${C.secondary})`, backgroundSize:"300% 300%", animation:"gradientShift 5s ease infinite",
        borderRadius:32, padding:28, color:"#000", position:"relative", overflow:"hidden",
        boxShadow:`0 24px 60px ${C.primaryDim}, 0 0 80px ${C.primaryDim}`, display:"flex", flexDirection:"column", gap:12
      }}>
        <div style={{position:"absolute", top:-30, right:-30, width:200, height:200, background:"rgba(255,255,255,0.15)", filter:"blur(50px)", borderRadius:"50%", animation:"float 8s ease-in-out infinite"}}/>
        <div style={{position:"absolute", bottom:-40, left:-20, width:160, height:160, background:"rgba(0,0,0,0.08)", filter:"blur(40px)", borderRadius:"50%", animation:"float 10s ease-in-out infinite reverse"}}/>
        
        <div style={{display:"flex",alignItems:"center",gap:8,fontSize:10,fontWeight:800,letterSpacing:".12em",opacity:0.7, textTransform:"uppercase"}}>
          <Ico n="wallet" sz={14} c="#000"/> NET BALANCE
        </div>
        <div style={{fontSize:44,fontWeight:900,letterSpacing:"-.04em",lineHeight:1,position:"relative",zIndex:1}}>{fmtAmt(stats.income-stats.expense)}</div>
        
        <div style={{display:"flex",alignItems:"center",gap:12,marginTop:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(0,0,0,0.1)",backdropFilter:"blur(8px)",padding:"6px 14px",borderRadius:14,fontSize:12,fontWeight:700}}>
            <Ico n="trendUp" sz={14} c="#000"/> {fmtAmt(stats.income)}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.12)",backdropFilter:"blur(8px)",padding:"6px 14px",borderRadius:14,fontSize:12,fontWeight:700}}>
            <Ico n="trendDown" sz={14} c="#000"/> {fmtAmt(stats.expense)}
          </div>
        </div>
      </div>

      {/* Vitals Grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:12}}>
        {[
          {l:"Inflow",a:stats.income,co:C.income,ic:"trendUp"},
          {l:"Outflow",a:stats.expense,co:C.expense,ic:"trendDown"},
          {l:"Growth",a:stats.invest,co:C.invest,ic:"stars"}
        ].map((s,i)=>(
          <div key={i} style={{
            background:C.card, borderWidth:1, borderStyle:"solid", borderColor:C.border, borderRadius:24, padding:16,
            backdropFilter:"blur(16px) saturate(200%)", display:"flex", flexDirection:"column", gap:10, transition:"all .4s cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow:C.cardGlow||"none"
          }} onMouseEnter={e=>{e.currentTarget.style.borderColor=s.co;e.currentTarget.style.boxShadow=`0 0 24px ${s.co}22`;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow=C.cardGlow||"none";}}>
            <div style={{width:32,height:32,borderRadius:10,background:s.co+"15",display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${s.co}20`}}>
              <Ico n={s.ic} sz={16} c={s.co}/>
            </div>
            <div>
              <div style={{color:C.sub,fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:".08em"}}>{s.l}</div>
              <div style={{color:s.co,fontSize:14,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{fmtAmt(s.a)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Allocation Hub */}
      {Object.keys(stats.catMap).length>0 && (
        <div style={{background:C.card,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:32,padding:24, backdropFilter:"blur(12px)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <div style={{color:C.text,fontSize:16,fontWeight:800, display:"flex", alignItems:"center", gap:8}}><Ico n="grid" sz={18} c={C.primary}/> Allocation</div>
            <button onClick={()=>setPage("categories")} style={{background:"none",border:"none",color:C.primary,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Hub →</button>
          </div>
          
          {Object.entries(stats.catMap).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([name,amt],idx)=>{
            const cat=categories.find(c=>c.name===name), max=Math.max(...Object.values(stats.catMap)), pct=Math.round((amt/max)*100);
            const hasBudget = cat?.budget && cat.budget > 0;
            const budgetPct = hasBudget ? Math.min(Math.round((amt / cat.budget) * 100), 100) : 0;
            const overBudget = hasBudget && amt > cat.budget;
            return (
              <div key={name} style={{marginBottom:idx===Object.entries(stats.catMap).slice(0,4).length-1?0:20}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,alignItems:"flex-end"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:10,height:10,borderRadius:"30%",background:cat?.color||C.sub}}/>
                    <span style={{color:C.text,fontSize:14,fontWeight:700}}>{name}</span>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{color:C.text,fontSize:13,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{fmtAmt(amt)}{hasBudget && <span style={{color:C.sub,fontSize:10}}> / {fmtAmt(cat.budget)}</span>}</div>
                    {hasBudget ? (
                      <div style={{color:overBudget?C.expense:budgetPct>80?"#f59e0b":C.income,fontSize:10,fontWeight:700}}>{overBudget?"⚠ Over budget!":`${budgetPct}% used`}</div>
                    ) : (
                      <div style={{color:C.sub,fontSize:10,fontWeight:700}}>{pct}% focus</div>
                    )}
                  </div>
                </div>
                <div style={{height:8,background:C.muted,borderRadius:4, overflow:"hidden"}}>
                  <div style={{height:"100%",width:hasBudget?`${budgetPct}%`:`${pct}%`,background:overBudget?`linear-gradient(90deg, ${C.expense}, ${C.expense}dd)`:`linear-gradient(90deg, ${cat?.color||C.primary}, ${cat?.color||C.secondary}dd)`,borderRadius:4, transition:"width 1.5s cubic-bezier(0.16, 1, 0.3, 1)"}}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Smart Insights */}
      {transactions.length > 2 && (
        <div style={{background:C.card,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:28,padding:20,backdropFilter:"blur(16px) saturate(200%)",boxShadow:C.cardGlow||"none"}}>
          <div style={{color:C.text,fontSize:16,fontWeight:800,marginBottom:16,display:"flex",alignItems:"center",gap:8}}><Ico n="stars" sz={18} c={C.primary}/> Insights</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {(() => {
              const insights = [];
              // Top spender this month
              if(Object.keys(stats.catMap).length > 0) {
                const top = Object.entries(stats.catMap).sort((a,b)=>b[1]-a[1])[0];
                insights.push({icon:"\ud83d\udd25",text:`Top spend: ${top[0]} at ${fmtAmt(top[1])}`,color:C.expense});
              }
              // Daily average
              if(stats.count > 0) {
                const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 0).getDate();
                const daysPassed = viewDate.getMonth() === new Date().getMonth() ? new Date().getDate() : daysInMonth;
                const dailyAvg = stats.expense / Math.max(daysPassed, 1);
                insights.push({icon:"\ud83d\udcca",text:`Daily avg spending: ${fmtAmt(dailyAvg)}`,color:C.primary});
              }
              // Savings rate
              if(stats.income > 0) {
                const rate = Math.round(((stats.income - stats.expense) / stats.income) * 100);
                insights.push({icon:rate >= 20 ? "\ud83d\udcaa" : "\u26a0\ufe0f",text:`Savings rate: ${rate}% ${rate >= 20 ? "\u2014 Great!" : "\u2014 Try to save more"}`,color:rate>=20?C.income:"#f59e0b"});
              }
              // Budget warnings
              const overBudgetCats = categories.filter(c => c.budget && c.budget > 0 && (stats.catMap[c.name]||0) > c.budget);
              if(overBudgetCats.length > 0) {
                insights.push({icon:"\ud83d\udea8",text:`${overBudgetCats.length} categor${overBudgetCats.length>1?"ies":"y"} over budget!`,color:C.expense});
              }
              return insights.map((ins,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:ins.color+"08",border:`1px solid ${ins.color}15`,borderRadius:14}}>
                  <span style={{fontSize:16}}>{ins.icon}</span>
                  <span style={{color:C.text,fontSize:13,fontWeight:600,flex:1}}>{ins.text}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {transactions.length>0 ? (
        <div style={{background:C.card,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:28,padding:20}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16, padding:"0 4px"}}>
            <div style={{color:C.text,fontSize:16,fontWeight:800}}>Recent Activity</div>
            <button onClick={()=>setPage("transactions")} style={{background:"none",border:"none",color:C.primary,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>View All</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[...transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(t=>(
              <TxRow key={t.id} t={t} categories={categories} tags={tags} accounts={accounts} onClick={()=>setEditTx({...t})}/>
            ))}
          </div>
        </div>
      ) : (
        <div style={{background:C.card,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:32,padding:"60px 24px",textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:16}}>
          <div style={{width:80,height:80,borderRadius:24,background:C.primaryDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:40}}>✨</div>
          <div>
             <div style={{color:C.text,fontSize:18,fontWeight:900,marginBottom:6}}>Start Your Journey</div>
             <div style={{color:C.sub,fontSize:14,lineHeight:1.6, maxWidth:280, margin:"0 auto"}}>Every great fortune begins with a single transaction recorded.</div>
          </div>
          <Btn onClick={()=>setAddTx(true)} icon="plus">Add First Transaction</Btn>
        </div>
      )}
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE: TRANSACTIONS
  // ════════════════════════════════════════════════════════════════════════════
  const Transactions = (
    <div className="page-enter" style={{padding:"16px 16px 100px 16px",display:"flex",flexDirection:"column",gap:12}}>
      {/* Search bar */}
      <div style={{display:"flex",gap:8}}>
        <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search description…" style={{flex:1,background:C.input,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:10,padding:"9px 13px",color:C.text,fontSize:14,outline:"none",fontFamily:"inherit"}}/>
        <button onClick={()=>setShowFilters(true)} style={{background:hasFilter?C.primary+"22":"transparent",border:`1px solid ${hasFilter?C.primary:C.border}`,borderRadius:10,padding:"9px 11px",color:hasFilter?C.primary:C.sub,cursor:"pointer",display:"flex",alignItems:"center"}}>
          <Ico n="filter" sz={18}/>
        </button>
      </div>

      {/* Quick CR/DR filter pills */}
      <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:2}}>
        {["","Credit","Debit","Income","Expense","Investment"].map(opt=>{
          const active = opt===""?(filters.cd===""&&filters.type===""):(filters.cd===opt||filters.type===opt);
          const col=opt==="Credit"?C.income:opt==="Debit"?C.expense:opt==="Income"?C.income:opt==="Expense"?C.expense:opt==="Investment"?C.invest:C.primary;
          return (
            <button key={opt} onClick={()=>{
              if(opt==="") setFilters(p=>({...p,cd:"",type:""}));
              else if(opt==="Credit"||opt==="Debit") setFilters(p=>({...p,cd:p.cd===opt?"":opt,type:""}));
              else setFilters(p=>({...p,type:p.type===opt?"":opt,cd:""}));
            }} style={{
              background:active?col+"22":"transparent",border:`1px solid ${active?col:C.border}`,borderRadius:99,
              padding:"5px 13px",color:active?col:C.sub,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0
            }}>{opt||"All"}</button>
          );
        })}
      </div>

      {/* Stats strip */}
      <div style={{display:"flex",gap:8,alignItems:"center", marginTop:4}}>
        <span style={{color:C.sub,fontSize:12,flex:1, fontWeight:700}}>{filteredTx.length} transactions</span>
        <div style={{display:"flex", gap:8}}>
          <Btn v="ghost" sm icon="down" onClick={exportCSV}>CSV</Btn>
          <Btn v="ghost" sm icon="stars" onClick={exportTransactionsPDF}>PDF</Btn>
          <Btn v="ghost" sm icon="upload" onClick={()=>setShowUpload(true)}>Import</Btn>
        </div>
      </div>

      {filteredTx.length===0 ? (
        <div style={{background:C.card,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:16,padding:32,textAlign:"center",color:C.sub,fontSize:13}}>
          {transactions.length===0 ? "No transactions yet" : "No matches for current filters"}
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          {filteredTx.map(t=>(
            <TxRow key={t.id} t={t} categories={categories} tags={tags} accounts={accounts} onClick={()=>setEditTx({...t})}/>
          ))}
        </div>
      )}
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE: ACCOUNTS
  // ════════════════════════════════════════════════════════════════════════════
  const Accounts = (
    <div className="page-enter" style={{padding:"16px 16px 100px 16px",display:"flex",flexDirection:"column",gap:16}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontWeight:900,color:C.text}}>Accounts</h2>
          <p style={{margin:0,color:C.sub,fontSize:12}}>{accounts.length} accounts active</p>
        </div>
        <Btn icon="plus" sm onClick={()=>setShowNewAcc(true)}>Add</Btn>
      </div>

      {/* Total Balance Summary */}
      {accounts.length > 0 && (
        <div style={{background:C.card,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:24,padding:20,backdropFilter:"blur(16px)",boxShadow:C.cardGlow||"none"}}>
          <div style={{color:C.sub,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".1em",marginBottom:8}}>Total Net Worth</div>
          <div style={{color:C.primary,fontSize:28,fontWeight:900,fontFamily:"'JetBrains Mono',monospace"}}>
            {fmtAmt(accounts.reduce((sum, acc) => {
              const txns = transactions.filter(t => t.accountId === acc.id);
              const txBal = txns.reduce((s, t) => s + (t.creditDebit === "Credit" ? t.amount : -t.amount), 0);
              return sum + (acc.initialBalance || 0) + txBal;
            }, 0))}
          </div>
        </div>
      )}

      {accounts.length===0 ? (
        <div style={{background:C.card,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:24,padding:"48px 24px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
          <div style={{width:72,height:72,borderRadius:20,background:C.primaryDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>🏦</div>
          <div>
            <div style={{color:C.text,fontSize:17,fontWeight:800,marginBottom:4}}>No Accounts Yet</div>
            <div style={{color:C.sub,fontSize:13,lineHeight:1.5,maxWidth:260}}>Add your bank accounts, wallets, and cards to track balances across all your finances.</div>
          </div>
          <Btn icon="plus" onClick={()=>setShowNewAcc(true)}>Add First Account</Btn>
        </div>
      ) : accounts.map(acc=>{
        const txns=transactions.filter(t=>t.accountId===acc.id);
        const txIncome = txns.filter(t=>t.creditDebit==="Credit").reduce((s,t)=>s+t.amount,0);
        const txExpense = txns.filter(t=>t.creditDebit==="Debit").reduce((s,t)=>s+t.amount,0);
        const initBal = acc.initialBalance || 0;
        const bal = initBal + txIncome - txExpense;
        const emojis={Bank:"🏦","Credit Card":"💳",Wallet:"👛",Cash:"💵"};
        return (
          <div key={acc.id} style={{
            background:C.card,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:24,padding:20,
            transition:"all .3s ease",backdropFilter:"blur(12px)",position:"relative",overflow:"hidden",
            boxShadow:C.cardGlow||"none"
          }} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.primary;e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="translateY(0)";}}>
            {/* Ambient glow */}
            <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,background:C.primary,filter:"blur(40px)",opacity:0.06}}/>

            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:50,height:50,borderRadius:16,backgroundImage:`linear-gradient(135deg,${C.primary}22,${C.secondary}22)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0,borderWidth:1,borderStyle:"solid",borderColor:C.primary+"20"}}>{emojis[acc.type]||"🏦"}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:C.text,fontSize:16,fontWeight:800}}>{acc.name}</div>
                <div style={{color:C.sub,fontSize:11,marginTop:2,fontWeight:600}}>{acc.type} · {txns.length} transactions</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{color:bal>=0?C.income:C.expense,fontSize:18,fontWeight:900,fontFamily:"'JetBrains Mono',monospace"}}>{fmtAmt(Math.abs(bal))}</div>
                <div style={{color:C.sub,fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",marginTop:2}}>{bal>=0?"Balance":"Deficit"}</div>
              </div>
            </div>

            {/* Breakdown strip */}
            <div style={{display:"flex",gap:8,marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
              {initBal > 0 && (
                <div style={{flex:1,background:C.input,borderRadius:12,padding:"8px 10px"}}>
                  <div style={{color:C.sub,fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:".05em"}}>Opening</div>
                  <div style={{color:C.primary,fontSize:13,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>{fmtAmt(initBal)}</div>
                </div>
              )}
              <div style={{flex:1,background:C.input,borderRadius:12,padding:"8px 10px"}}>
                <div style={{color:C.sub,fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:".05em"}}>Income</div>
                <div style={{color:C.income,fontSize:13,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>+{fmtAmt(txIncome)}</div>
              </div>
              <div style={{flex:1,background:C.input,borderRadius:12,padding:"8px 10px"}}>
                <div style={{color:C.sub,fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:".05em"}}>Expense</div>
                <div style={{color:C.expense,fontSize:13,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>−{fmtAmt(txExpense)}</div>
              </div>
            </div>

            {/* Delete action */}
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}>
              <button onClick={()=>setAccs(prev=>prev.filter(a=>a.id!==acc.id))} style={{background:C.expense+"15",borderWidth:1,borderStyle:"solid",borderColor:C.expense+"30",borderRadius:10,color:C.expense,cursor:"pointer",padding:"6px 14px",fontSize:11,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,transition:"all .2s ease"}}>
                <Ico n="trash" sz={13} c={C.expense}/>Remove
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE: CATEGORIES
  // ════════════════════════════════════════════════════════════════════════════
  const Categories = (
    <div className="page-enter" style={{padding:"16px 16px 100px 16px",display:"flex",flexDirection:"column",gap:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontWeight:900,color:C.text}}>Specs Hub</h2>
          <p style={{margin:0,color:C.sub,fontSize:12}}>{categories.length} categories active</p>
        </div>
        <Btn icon="plus" sm onClick={()=>setShowNewCat(true)}>Add</Btn>
      </div>

      {["Expense","Income","Investment"].map(type=>{
        const cats=categories.filter(c=>c.type===type); if(!cats.length) return null;
        return (
          <div key={type}>
            <div style={{color:C.sub,fontSize:10,fontWeight:800,letterSpacing:".15em",textTransform:"uppercase",marginBottom:16,paddingLeft:4,display:"flex",alignItems:"center",gap:10}}>
              {type} <div style={{flex:1,height:1,background:C.border}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(140px, 1fr))",gap:12}}>
              {cats.map(cat=>{
                const txns=transactions.filter(t=>t.category===cat.id);
                const count=txns.length;
                const total=txns.reduce((s,t)=>s+t.amount,0);
                return (
                  <div key={cat.id} style={{
                    background:C.card,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:24,padding:16,
                    display:"flex",flexDirection:"column",gap:12,transition:"all .2s ease",
                    backdropFilter:"blur(10px)",position:"relative",overflow:"hidden", minHeight:150
                  }} onMouseEnter={e=>{e.currentTarget.style.borderColor=cat.color;e.currentTarget.style.transform="translateY(-4px)"}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="translateY(0)"}}>
                    <div style={{position:"absolute",top:-20,right:-20,width:60,height:60,background:cat.color,filter:"blur(30px)",opacity:0.15}}/>
                    
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div style={{width:36,height:36,borderRadius:12,backgroundImage:`linear-gradient(135deg,${cat.color}20,${cat.color}11)`,display:"flex",alignItems:"center",justifyContent:"center",borderWidth:1,borderStyle:"solid",borderColor:cat.color+"40"}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:cat.color}}/>
                      </div>
                      {!DEF_CATS.some(d=>d.id===cat.id) && (
                        <button onClick={()=>setCats(prev=>prev.filter(c=>c.id!==cat.id))} style={{background:C.muted,border:"none",borderRadius:"50%",color:C.sub,cursor:"pointer",padding:6,display:"flex"}}><Ico n="trash" sz={14}/></button>
                      )}
                    </div>

                    <div style={{flex:1, display:"flex", flexDirection:"column", justifyContent:"center"}}>
                      <div style={{color:C.text,fontSize:15,fontWeight:800, lineHeight:1.2}}>{cat.name}</div>
                      <div style={{color:C.sub,fontSize:10,marginTop:4,fontWeight:700, textTransform:"uppercase", letterSpacing:".05em"}}>{count} txns</div>
                    </div>

                    {count > 0 && (
                      <div style={{color:cat.color,fontSize:14,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",marginTop:8, borderTop:`1px solid ${C.border}`, paddingTop:8}}>
                        {fmtAmt(total)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE: TAGS
  // ════════════════════════════════════════════════════════════════════════════
  const Tags = (
    <div className="page-enter" style={{padding:"20px 20px 100px 20px",display:"flex",flexDirection:"column",gap:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontWeight:900,color:C.text}}>Tags Hub</h2>
          <p style={{margin:0,color:C.sub,fontSize:12}}>Track spending across custom events.</p>
        </div>
        <Btn icon="plus" sm onClick={()=>{setEditingTag(null);setNewTag({name:"",color:"#00dba8"});setShowNewTag(true);}}>New Tag</Btn>
      </div>

      {tags.length === 0 ? (
        <div style={{background:C.card,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:24,padding:"60px 24px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
          <div style={{width:80,height:80,borderRadius:24,background:C.primaryDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:40}}>🏷</div>
          <div style={{color:C.sub,fontSize:14,maxWidth:260}}>No tags yet. Add tags to organize transactions for vacations, birthdays, or projects.</div>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))",gap:16}}>
          {tags.map(tg => {
            const txns = transactions.filter(t => (t.tags || []).includes(tg.id));
            const total = txns.reduce((s, t) => s + t.amount, 0);
            return (
              <div key={tg.id} style={{
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, padding: 16,
                display: "flex", flexDirection: "column", gap: 12, transition: "all .3s ease",
                backdropFilter: "blur(12px)", position: "relative", overflow: "hidden", minHeight: 140,
                boxShadow: C.cardGlow || "none"
              }} onMouseEnter={e => { e.currentTarget.style.borderColor = tg.color; e.currentTarget.style.transform = "translateY(-4px)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}>
                <div style={{ position: "absolute", top: -20, right: -20, width: 60, height: 60, background: tg.color, filter: "blur(40px)", opacity: 0.15 }} />
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: tg.color + "22", border: `1px solid ${tg.color}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Ico n="tag" sz={16} c={tg.color} />
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { setEditingTag(tg); setNewTag({ name: tg.name, color: tg.color }); setShowNewTag(true); }} style={{ background: "none", border: "none", color: C.sub, cursor: "pointer", transition: "color .2s" }} onMouseEnter={e => e.currentTarget.style.color = C.primary} onMouseLeave={e => e.currentTarget.style.color = C.sub}><Ico n="pen" sz={15} /></button>
                    <button onClick={() => setTgs(prev => prev.filter(t => t.id !== tg.id))} style={{ background: "none", border: "none", color: C.sub, cursor: "pointer", transition: "color .2s" }} onMouseEnter={e => e.currentTarget.style.color = C.expense} onMouseLeave={e => e.currentTarget.style.color = C.sub}><Ico n="trash" sz={15} /></button>
                  </div>
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ color: C.text, fontSize: 16, fontWeight: 800 }}>#{tg.name}</div>
                  <div style={{ color: C.sub, fontSize: 11, marginTop: 4, fontWeight: 600 }}>{txns.length} transactions</div>
                </div>

                <div style={{ color: tg.color, fontSize: 14, fontWeight: 900, fontFamily: "'JetBrains Mono',monospace", marginTop: 8, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                  {fmtAmt(total)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
  
  // ════════════════════════════════════════════════════════════════════════════
  // PAGE: REPORTS
  // ════════════════════════════════════════════════════════════════════════════
  const ReportsPage = (
    <div className="page-enter" style={{padding:"20px 20px 100px 20px",display:"flex",flexDirection:"column",gap:20}}>
      <div>
        <h1 style={{fontSize:24,fontWeight:900,color:C.text,margin:0,letterSpacing:"-.03em"}}>Wealth Report</h1>
        <p style={{fontSize:12,color:C.sub,margin:"4px 0 0",fontWeight:600,opacity:0.7}}>Deep insights into your financial flow.</p>
      </div>

      {/* Tab Selector */}
      <div style={{display:"flex",background:C.input,borderRadius:16,padding:4,borderWidth:1,borderStyle:"solid",borderColor:C.border, backdropFilter:"blur(16px)"}}>
        {["week","month","year"].map(t=>(
          <button key={t} onClick={()=>setReportTab(t)} style={{
            flex:1,padding:"11px",borderRadius:12,borderWidth:0,borderStyle:"solid",borderColor:"transparent",cursor:"pointer",fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:".08em",
            backgroundImage:reportTab===t?`linear-gradient(135deg, ${C.primary}, ${C.secondary})`: "none", 
            backgroundColor:reportTab===t?"transparent":"transparent",
            backgroundSize:"200% 200%", animation:reportTab===t?"gradientShift 3s ease infinite":"none",
            color:reportTab===t? "#000" : C.sub,
            boxShadow:reportTab===t?`0 4px 16px ${C.primaryDim}`:"none",
            transition:"all .35s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>{t}</button>
        ))}
      </div>

      {/* Period Navigation */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
        <button onClick={()=>{
          const d = new Date(reportDate);
          if(reportTab==="week") d.setDate(d.getDate()-7);
          else if(reportTab==="month") d.setMonth(d.getMonth()-1);
          else d.setFullYear(d.getFullYear()-1);
          setReportDate(d);
        }} style={{background:C.input,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:"50%",padding:6,color:C.sub,cursor:"pointer",display:"flex"}}><Ico n="chevronLeft" sz={16}/></button>
        <span style={{fontSize:13,color:C.text,fontWeight:700,minWidth:140,textAlign:"center"}}>
          {reportTab==="week" ? `Week of ${reportDate.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}` : reportTab==="month" ? reportDate.toLocaleString("en",{month:"long",year:"numeric"}) : reportDate.getFullYear().toString()}
        </span>
        <button onClick={()=>{
          const d = new Date(reportDate);
          if(reportTab==="week") d.setDate(d.getDate()+7);
          else if(reportTab==="month") d.setMonth(d.getMonth()+1);
          else d.setFullYear(d.getFullYear()+1);
          setReportDate(d);
        }} style={{background:C.input,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:"50%",padding:6,color:C.sub,cursor:"pointer",display:"flex"}}><Ico n="chevronRight" sz={16}/></button>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {(() => {
          let filtered = [];
          if(reportTab === "week") {
            const start = new Date(reportDate); start.setDate(reportDate.getDate() - reportDate.getDay());
            const end = new Date(start); end.setDate(start.getDate() + 6);
            filtered = transactions.filter(t => { const d = new Date(t.date); return d >= start && d <= end; });
          } else if(reportTab === "month") {
            filtered = transactions.filter(t => { const d=new Date(t.date); return d.getMonth()===reportDate.getMonth() && d.getFullYear()===reportDate.getFullYear(); });
          } else {
            filtered = transactions.filter(t => new Date(t.date).getFullYear() === reportDate.getFullYear());
          }

          const inc = filtered.filter(t=>t.txType==="Income").reduce((s,t)=>s+t.amount,0);
          const exp = filtered.filter(t=>t.txType==="Expense").reduce((s,t)=>s+t.amount,0);
          const net = inc - exp;
          const savingsRate = inc > 0 ? Math.round(((inc - exp) / inc) * 100) : 0;
          const txCount = filtered.length;

          // Category data
          const catData = Object.entries(filtered.reduce((acc,t)=>{
            const c = categories.find(cat=>cat.id===t.category)?.name || "Other";
            acc[c] = (acc[c]||0) + t.amount; return acc;
          }, {})).sort((a,b)=>b[1]-a[1]);
          const maxCatVal = catData.length > 0 ? catData[0][1] : 1;

          return (
            <>
              {/* Net Flow Hero */}
              <div style={{
                background:C.card, borderWidth:1,borderStyle:"solid",borderColor:C.border, borderRadius:28, padding:24,
                backdropFilter:"blur(16px) saturate(200%)", boxShadow:C.cardGlow||"none", position:"relative", overflow:"hidden"
              }}>
                <div style={{position:"absolute",top:-20,right:-20,width:120,height:120,background:net>=0?C.income:C.expense,filter:"blur(60px)",opacity:0.08,borderRadius:"50%"}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{color:C.sub,fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:".1em",marginBottom:8}}>Net Flow</div>
                    <div style={{color:net>=0?C.income:C.expense,fontSize:32,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"-.02em"}}>
                      {net>=0?"+":"−"}{fmtAmt(Math.abs(net))}
                    </div>
                    <div style={{color:C.sub,fontSize:11,marginTop:6,fontWeight:600}}>{txCount} transactions this {reportTab}</div>
                  </div>
                  {inc > 0 && (
                    <div style={{textAlign:"center"}}>
                      <div style={{width:64,height:64,borderRadius:"50%",border:`3px solid ${savingsRate>=0?C.income:C.expense}`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 20px ${savingsRate>=0?C.income+"22":C.expense+"22"}`}}>
                        <span style={{fontSize:16,fontWeight:900,color:savingsRate>=0?C.income:C.expense,fontFamily:"'JetBrains Mono',monospace"}}>{savingsRate}%</span>
                      </div>
                      <div style={{color:C.sub,fontSize:8,fontWeight:800,marginTop:6,textTransform:"uppercase",letterSpacing:".08em"}}>Saved</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Income / Expense Cards */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div style={{background:C.card,padding:20,borderRadius:24,borderWidth:1,borderStyle:"solid",borderColor:C.border,display:"flex",flexDirection:"column",gap:8, backdropFilter:"blur(16px) saturate(200%)", boxShadow:C.cardGlow||"none", position:"relative", overflow:"hidden"}}>
                  <div style={{position:"absolute",bottom:-10,left:-10,width:60,height:60,background:C.income,filter:"blur(40px)",opacity:0.08,borderRadius:"50%"}}/>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:C.income,boxShadow:`0 0 8px ${C.income}44`}}/>
                    <span style={{color:C.income,fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:".08em"}}>Income</span>
                  </div>
                  <div style={{color:C.text,fontSize:20,fontWeight:900,fontFamily:"'JetBrains Mono',monospace"}}>{fmtAmt(inc)}</div>
                </div>
                <div style={{background:C.card,padding:20,borderRadius:24,borderWidth:1,borderStyle:"solid",borderColor:C.border,display:"flex",flexDirection:"column",gap:8, backdropFilter:"blur(16px) saturate(200%)", boxShadow:C.cardGlow||"none", position:"relative", overflow:"hidden"}}>
                  <div style={{position:"absolute",bottom:-10,right:-10,width:60,height:60,background:C.expense,filter:"blur(40px)",opacity:0.08,borderRadius:"50%"}}/>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:C.expense,boxShadow:`0 0 8px ${C.expense}44`}}/>
                    <span style={{color:C.expense,fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:".08em"}}>Expense</span>
                  </div>
                  <div style={{color:C.text,fontSize:20,fontWeight:900,fontFamily:"'JetBrains Mono',monospace"}}>{fmtAmt(exp)}</div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div style={{background:C.card,padding:24,borderRadius:28,borderWidth:1,borderStyle:"solid",borderColor:C.border, backdropFilter:"blur(16px) saturate(200%)", boxShadow:C.cardGlow||"none"}}>
                <div style={{color:C.text,fontSize:14,fontWeight:800,marginBottom:20, display:"flex", alignItems:"center", gap:8}}>
                  <Ico n="chart" sz={16} c={C.primary}/> Category Breakdown
                  {catData.length > 0 && <span style={{marginLeft:"auto",color:C.sub,fontSize:11,fontWeight:600}}>{catData.length} categories</span>}
                </div>
                {filtered.length === 0 ? (
                  <div style={{color:C.sub,fontSize:13,textAlign:"center",padding:32}}>
                    <div style={{fontSize:32,marginBottom:8,opacity:0.5}}>📊</div>
                    No transactions recorded for this {reportTab}
                  </div>
                ) : (
                  catData.map(([name,val],i)=>{
                    const cat = categories.find(c=>c.name===name);
                    const catColor = cat?.color || C.primary;
                    const pct = Math.round((val/maxCatVal)*100);
                    return (
                      <div key={i} style={{marginBottom:i<catData.length-1?18:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,alignItems:"center"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:8,height:8,borderRadius:"50%",background:catColor,boxShadow:`0 0 6px ${catColor}44`}}/>
                            <span style={{color:C.text,fontSize:13,fontWeight:700}}>{name}</span>
                          </div>
                          <span style={{color:C.sub,fontSize:12,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{fmtAmt(val)}</span>
                        </div>
                        <div style={{height:6,background:C.muted,borderRadius:4,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg, ${catColor}, ${catColor}aa)`,borderRadius:4,transition:"width 1s cubic-bezier(0.16, 1, 0.3, 1)",boxShadow:`0 0 8px ${catColor}33`}}/>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reports Actions */}
              <div style={{display:"flex", gap:10, marginTop:10}}>
                <Btn v="soft" full icon="down" onClick={() => {
                   const headers = ["Date", "Description", "Category", "Type", "Amount"];
                   const rows = filtered.map(t => [t.date, t.description, categories.find(c=>c.id===t.category)?.name||"Other", t.creditDebit, t.amount]);
                   const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
                   const blob = new Blob([csv], { type: "text/csv" });
                   const url = URL.createObjectURL(blob);
                   const a = document.createElement("a");
                   a.href = url;
                   a.download = `Report_${reportTab}_${reportDate.toLocaleDateString()}.csv`;
                   a.click();
                   notify("✓ CSV Exported");
                }}>CSV Export</Btn>
                <Btn full icon="stars" onClick={() => {
                  const doc = new jsPDF();
                  const titleStr = reportTab==="week" ? `Week of ${reportDate.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}` : reportTab==="month" ? reportDate.toLocaleString("en",{month:"long",year:"numeric"}) : reportDate.getFullYear().toString();
                  
                  // Design constants based on theme
                  const accent = [0, 229, 255]; // Primary neon
                  
                  // Header
                  doc.setFillColor(15, 23, 42); // Dark surface
                  doc.rect(0, 0, 210, 40, "F");
                  
                  doc.setFontSize(22);
                  doc.setTextColor(255, 255, 255);
                  doc.text("EXPENSE TRACKER", 15, 20);
                  
                  doc.setFontSize(10);
                  doc.setTextColor(accent[0], accent[1], accent[2]);
                  doc.text(`WEALTH REPORT — ${titleStr.toUpperCase()}`, 15, 28);
                  
                  doc.setTextColor(150, 150, 150);
                  doc.text(`Generated: ${new Date().toLocaleString()}`, 195, 20, { align: "right" });
                  
                  // Stats Grid
                  doc.setFillColor(248, 250, 252);
                  doc.roundedRect(15, 45, 58, 25, 3, 3, "F");
                  doc.roundedRect(76, 45, 58, 25, 3, 3, "F");
                  doc.roundedRect(137, 45, 58, 25, 3, 3, "F");
                  
                  doc.setFontSize(9);
                  doc.setTextColor(100, 116, 139);
                  doc.text("TOTAL INCOME", 20, 52);
                  doc.text("TOTAL EXPENSE", 81, 52);
                  doc.text("NET FLOW", 142, 52);
                  
                  doc.setFontSize(14);
                  doc.setTextColor(0, 180, 100); // Income
                  doc.text(`Rs. ${inc.toLocaleString()}`, 20, 62);
                  doc.setTextColor(220, 50, 50); // Expense
                  doc.text(`Rs. ${exp.toLocaleString()}`, 81, 62);
                  doc.setTextColor(net >= 0 ? 0 : 220, net >= 0 ? 180 : 50, net >= 0 ? 100 : 50);
                  doc.text(`Rs. ${net.toLocaleString()}`, 142, 62);
                  
                  // Category Breakdown
                  doc.setFontSize(14);
                  doc.setTextColor(15, 23, 42);
                  doc.text("Category Breakdown", 15, 85);
                  
                  const tableRows = catData.map(([name, val]) => [name, fmtAmt(val), `${Math.round((val/exp)*100)}%`]);
                  autoTable(doc, {
                    startY: 90,
                    head: [["Category", "Amount", "Weight"]],
                    body: tableRows,
                    theme: "striped",
                    headStyles: { fillColor: accent, textColor: 0, fontStyle: "bold" },
                    margin: { left: 15, right: 15 }
                  });
                  
                  // Transaction Audit Trail
                  doc.setFontSize(14);
                  doc.setTextColor(15, 23, 42);
                  doc.text("Transaction Audit Trail", 15, doc.lastAutoTable.finalY + 15);
                  
                  const txRows = filtered.map(t => [t.date, t.description, categories.find(c=>c.id===t.category)?.name || "Other", t.creditDebit, `Rs. ${t.amount.toLocaleString()}`]);
                  autoTable(doc, {
                    startY: doc.lastAutoTable.finalY + 20,
                    head: [["Date", "Description", "Category", "Type", "Amount"]],
                    body: txRows,
                    theme: "grid",
                    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
                    columnStyles: {
                      4: { halign: "right", fontStyle: "bold" }
                    },
                    margin: { left: 15, right: 15 }
                  });
                  
                  // Footer
                  const pageCount = doc.internal.getNumberOfPages();
                  for(let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text(`Page ${i} of ${pageCount} — Verified by Antigravity OS 2045`, 105, 290, { align: "center" });
                  }
                  
                  doc.save(`Antigravity_Wealth_Report_${reportTab}_${reportDate.getTime()}.pdf`);
                  notify("✓ PDF Report Downloaded");
                }}>Download PDF</Btn>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE: ANALYZER (Bank Statement Processor)
  // ════════════════════════════════════════════════════════════════════════════

  const handleFileUpload = async (file) => {
    if (!file) return;
    setAnalyzerState(p => ({ ...p, loading: true, error: "", file }));
    try {
      const { rows, headers } = await parseExcelFile(file);
      const columnMap = autoDetectColumns(headers);
      setAnalyzerState(p => ({ ...p, step: "map", headers, rows, columnMap, loading: false }));
    } catch (err) {
      setAnalyzerState(p => ({ ...p, loading: false, error: err.message }));
    }
  };

  const runProcessing = () => {
    setAnalyzerState(p => ({ ...p, loading: true }));
    setTimeout(() => {
      const processed = processTransactions(analyzerState.rows, analyzerState.columnMap);
      setAnalyzerState(p => ({ ...p, step: "results", processed, loading: false }));
    }, 50);
  };

  const importProcessed = () => {
    const newTxs = analyzerState.processed.map(t => ({
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      date: t.date,
      description: t.description,
      amount: t.amount,
      creditDebit: t.creditDebit,
      txType: t.txType,
      category: (categories.find(c => c.name === t.category.name) || categories[0])?.id || categories[0]?.id,
      tags: [],
      accountId: "",
      notes: t.rawDescription,
    }));
    setTx(prev => [...newTxs, ...prev]);
    notify(`✓ Imported ${newTxs.length} transactions`);
    setAnalyzerState({ step: "upload", file: null, headers: [], rows: [], columnMap: {}, processed: [], loading: false, error: "" });
  };


  const AnalyzerPage = (
    <div className="page-enter" style={{padding:"20px 20px 100px 20px",display:"flex",flexDirection:"column",gap:20}}>
      <div>
        <h1 style={{fontSize:24,fontWeight:900,color:C.text,margin:0,letterSpacing:"-.02em"}}>Statement Analyzer</h1>
        <p style={{fontSize:13,color:C.sub,margin:"4px 0 0",fontWeight:600,opacity:0.8}}>Upload your bank statement to auto-categorize transactions.</p>
      </div>

      {/* ── STEP 1: UPLOAD ── */}
      {analyzerState.step === "upload" && (
        <div className="page-enter" style={{display:"flex",flexDirection:"column",gap:16}}>
          <div
            onClick={() => analyzerFileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = C.primary; }}
            onDragLeave={e => { e.currentTarget.style.borderColor = C.border; }}
            onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = C.border; const f = e.dataTransfer.files?.[0]; if(f) handleFileUpload(f); }}
            style={{background:C.card,border:`2px dashed ${C.border}`,borderRadius:24,padding:"48px 20px",textAlign:"center",cursor:"pointer",transition:"all .2s",backdropFilter:"blur(10px)"}}
          >
            <div style={{width:64,height:64,borderRadius:20,background:`linear-gradient(135deg,${C.primary}22,${C.secondary}22)`,margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Ico n="upload" sz={28} c={C.primary}/>
            </div>
            <div style={{color:C.text,fontSize:16,fontWeight:800,marginBottom:6}}>Drop your Excel file here</div>
            <div style={{color:C.sub,fontSize:13,marginBottom:4}}>or tap to browse</div>
            <div style={{color:C.sub,fontSize:11,opacity:.7}}>.xls · .xlsx supported</div>
          </div>
          <input ref={analyzerFileRef} type="file" accept=".xls,.xlsx" style={{display:"none"}} onChange={e => { const f = e.target.files?.[0]; if(f) handleFileUpload(f); e.target.value=""; }}/>

          {analyzerState.loading && (
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:20}}>
              <div style={{width:20,height:20,borderRadius:"50%",borderWidth:2,borderStyle:"solid",borderColor:C.muted,borderTopColor:C.primary,animation:"spin .7s linear infinite"}}/>
              <span style={{color:C.sub,fontSize:13,fontWeight:600}}>Parsing file…</span>
            </div>
          )}
          {analyzerState.error && <div style={{color:C.expense,fontSize:13,textAlign:"center",padding:12,background:C.expense+"11",borderRadius:12,border:`1px solid ${C.expense}33`}}>{analyzerState.error}</div>}
          
          <div style={{background:C.card,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:20,padding:20,backdropFilter:"blur(10px)"}}>
            <div style={{color:C.text,fontSize:14,fontWeight:800,marginBottom:12,display:"flex",alignItems:"center",gap:8}}><Ico n="info" sz={16} c={C.primary}/> How it works</div>
            <div style={{color:C.sub,fontSize:13,lineHeight:2}}>
              1. Upload your bank statement (.xls / .xlsx)<br/>
              2. Map the columns (auto-detected)<br/>
              3. Transactions are auto-categorized using {CATEGORY_RULES.length} rules<br/>
              4. Review & import into your tracker
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: COLUMN MAPPING ── */}
      {analyzerState.step === "map" && (
        <div className="page-enter" style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{background:C.card,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:20,padding:20,backdropFilter:"blur(10px)"}}>
            <div style={{color:C.text,fontSize:14,fontWeight:800,marginBottom:16}}>📋 Column Mapping</div>
            <div style={{color:C.sub,fontSize:12,marginBottom:16}}>Found <b style={{color:C.primary}}>{analyzerState.rows.length}</b> rows · <b style={{color:C.primary}}>{analyzerState.headers.length}</b> columns</div>
            {["date","description","debit","credit","balance"].map(field => (
              <div key={field} style={{marginBottom:12}}>
                <CustomSelect
                  label={field.charAt(0).toUpperCase()+field.slice(1) + " Column"}
                  value={analyzerState.columnMap[field] || ""}
                  options={[{id:"",name:"— Not mapped —"}, ...analyzerState.headers.map(h=>({id:h,name:h}))]}
                  onChange={v => setAnalyzerState(p => ({...p, columnMap: {...p.columnMap, [field]: v}}))}
                  placeholder="Select column…"
                />
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn v="ghost" full onClick={() => setAnalyzerState({step:"upload",file:null,headers:[],rows:[],columnMap:{},processed:[],loading:false,error:""})}>Back</Btn>
            <Btn full icon="check" disabled={!analyzerState.columnMap.description} onClick={runProcessing}>
              {analyzerState.loading ? "Processing…" : `Process ${analyzerState.rows.length} Rows`}
            </Btn>
          </div>
        </div>
      )}

      {/* ── STEP 3: RESULTS ── */}
      {analyzerState.step === "results" && (
        <div className="page-enter" style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Summary Cards */}
          {(() => {
            const inc = analyzerState.processed.filter(t=>t.creditDebit==="Credit").reduce((s,t)=>s+t.amount,0);
            const exp = analyzerState.processed.filter(t=>t.creditDebit==="Debit").reduce((s,t)=>s+t.amount,0);
            return (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div style={{background:C.card,padding:20,borderRadius:24,borderWidth:1,borderStyle:"solid",borderColor:C.border,backdropFilter:"blur(10px)"}}>
                  <div style={{color:C.income,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".05em"}}>Total Income</div>
                  <div style={{color:C.text,fontSize:18,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",marginTop:6}}>{fmtAmt(inc)}</div>
                </div>
                <div style={{background:C.card,padding:20,borderRadius:24,borderWidth:1,borderStyle:"solid",borderColor:C.border,backdropFilter:"blur(10px)"}}>
                  <div style={{color:C.expense,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".05em"}}>Total Expense</div>
                  <div style={{color:C.text,fontSize:18,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",marginTop:6}}>{fmtAmt(exp)}</div>
                </div>
              </div>
            );
          })()}

          {/* Category Breakdown */}
          <div style={{background:C.card,padding:20,borderRadius:24,borderWidth:1,borderStyle:"solid",borderColor:C.border,backdropFilter:"blur(10px)"}}>
            <div style={{color:C.text,fontSize:14,fontWeight:800,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><Ico n="chart" sz={16} c={C.primary}/> Category Breakdown</div>
            {(() => {
              const catCounts = {};
              analyzerState.processed.forEach(t => {
                const k = t.category.name;
                if(!catCounts[k]) catCounts[k] = {count:0,total:0,color:t.category.color};
                catCounts[k].count++; catCounts[k].total += t.amount;
              });
              const maxVal = Math.max(...Object.values(catCounts).map(v=>v.total), 1);
              return Object.entries(catCounts).sort((a,b)=>b[1].total-a[1].total).map(([name,v]) => (
                <div key={name} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:v.color}}/>
                      <span style={{color:C.text,fontSize:13,fontWeight:700}}>{name}</span>
                      <span style={{color:C.sub,fontSize:11}}>({v.count})</span>
                    </div>
                    <span style={{color:C.sub,fontSize:12,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{fmtAmt(v.total)}</span>
                  </div>
                  <div style={{height:3,background:C.muted,borderRadius:2}}><div style={{height:"100%",width:`${(v.total/maxVal)*100}%`,background:v.color,borderRadius:2,transition:"width .3s"}}/></div>
                </div>
              ));
            })()}
          </div>

          {/* Transaction List */}
          <div style={{color:C.text,fontSize:14,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span>{analyzerState.processed.length} transactions parsed</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {analyzerState.processed.slice(0,100).map((t,i) => (
              <div key={i} style={{background:C.card,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:16,padding:14,display:"flex",alignItems:"center",gap:12,backdropFilter:"blur(10px)"}}>
                <div style={{width:36,height:36,borderRadius:10,background:t.category.color+"20",border:`1px solid ${t.category.color}40`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:t.category.color}}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:C.text,fontSize:13,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.description}</div>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginTop:3}}>
                    <span style={{color:C.sub,fontSize:11}}>{t.date}</span>
                    <span style={{background:t.category.color+"22",color:t.category.color,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:6}}>{t.category.name}</span>
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{color:t.creditDebit==="Credit"?C.income:C.expense,fontSize:14,fontWeight:800,fontFamily:"'JetBrains Mono',monospace"}}>
                    {t.creditDebit==="Credit"?"+":"−"}{fmtAmt(t.amount)}
                  </div>
                </div>
              </div>
            ))}
            {analyzerState.processed.length > 100 && <div style={{color:C.sub,fontSize:12,textAlign:"center",padding:12}}>Showing first 100 of {analyzerState.processed.length} transactions</div>}
          </div>

          {/* Action Buttons */}
          <div style={{display:"flex",gap:10}}>
            <Btn v="ghost" full onClick={() => setAnalyzerState({step:"upload",file:null,headers:[],rows:[],columnMap:{},processed:[],loading:false,error:""})}>New Upload</Btn>
            <Btn full icon="plus" onClick={importProcessed}>Import All ({analyzerState.processed.length})</Btn>
          </div>
        </div>
      )}
    </div>
  );

  const pageMap={dashboard:Dashboard,transactions:Transactions,reports:ReportsPage,accounts:Accounts,categories:Categories,tags:Tags};
  const titleMap={dashboard:"Expense 💰",transactions:"Transactions",reports:"Wealth Report",accounts:"Accounts",categories:"Categories",tags:"Tags"};

  // ════════════════════════════════════════════════════════════════════════════
  // LOGIN SCREEN
  // ════════════════════════════════════════════════════════════════════════════
  if(!user && ready) return (
    <div style={{background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'Plus Jakarta Sans',sans-serif", position:"relative", overflow:"hidden"}}>
      {/* Ambient Mesh */}
      <div style={{position:"absolute",top:"-40%",left:"-30%",width:"80vw",height:"80vw",background:`radial-gradient(circle, rgba(0,229,255,0.06), transparent 60%)`,pointerEvents:"none",animation:"float 10s ease-in-out infinite"}}/>
      <div style={{position:"absolute",bottom:"-30%",right:"-20%",width:"70vw",height:"70vw",background:`radial-gradient(circle, rgba(99,102,241,0.05), transparent 60%)`,pointerEvents:"none",animation:"float 13s ease-in-out infinite reverse"}}/>

      <div className="page-enter" style={{background:C.card, borderWidth:1,borderStyle:"solid",borderColor:C.border, borderRadius:36, padding:"56px 36px", width:"100%", maxWidth:420, textAlign:"center", backdropFilter:"blur(32px) saturate(200%)", boxShadow:`${C.shadow}, ${C.cardGlow||"none"}`, position:"relative", zIndex:1, animation:"borderGlow 4s ease-in-out infinite"}}>
         <div style={{width:88, height:88, borderRadius:28, background:`linear-gradient(135deg, ${C.primary}, ${C.secondary})`, backgroundSize:"200% 200%", animation:"gradientShift 3s ease infinite", margin:"0 auto 28px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:44, boxShadow:`0 12px 40px ${C.primaryDim}, 0 0 60px ${C.primaryDim}`}}>💰</div>
         <h1 style={{fontSize:32, fontWeight:900, marginBottom:10, letterSpacing:"-.04em", background:`linear-gradient(135deg, ${C.primary}, ${C.secondary})`, backgroundSize:"200% 200%", animation:"gradientShift 4s ease infinite", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>Expense</h1>
         <p style={{color:C.sub, fontSize:14, marginBottom:36, lineHeight:1.7, fontWeight:500}}>Your personal financial command center.<br/>Private. Offline. Powerful.</p>
         
         <div id="googleBtn" style={{display:"flex", justifyContent:"center"}}></div>

         <div style={{marginTop:36, borderTop:`1px solid ${C.border}`, paddingTop:20, color:C.sub, fontSize:10, letterSpacing:".08em", textTransform:"uppercase", fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", gap:8}}>
           <div style={{width:6,height:6,borderRadius:"50%",background:C.income,boxShadow:`0 0 8px ${C.income}`}}/> Standalone & Encrypted
         </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes borderGlow { 0%,100% { border-color: rgba(0, 229, 255, 0.06); } 50% { border-color: rgba(0, 229, 255, 0.15); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .page-enter { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'Plus Jakarta Sans',sans-serif",color:C.text,paddingBottom:80,maxWidth:600,margin:"0 auto",position:"relative",overflow:"hidden"}}>

      {/* Ambient Glow Orbs */}
      <div style={{position:"fixed",top:"-30%",left:"-20%",width:"60vw",height:"60vw",background:`radial-gradient(circle, ${C.glow1||"transparent"}, transparent 70%)`,pointerEvents:"none",zIndex:0,animation:"float 12s ease-in-out infinite"}}/>
      <div style={{position:"fixed",bottom:"-20%",right:"-15%",width:"50vw",height:"50vw",background:`radial-gradient(circle, ${C.glow2||"transparent"}, transparent 70%)`,pointerEvents:"none",zIndex:0,animation:"float 15s ease-in-out infinite reverse"}}/>

      {/* Header */}
      <div style={{position:"sticky",top:0,zIndex:300,background:C.headerBg,backdropFilter:"blur(32px) saturate(200%)",borderBottom:`1px solid ${C.border}`,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:20,fontWeight:900,letterSpacing:"-.04em", backgroundImage:`linear-gradient(135deg, ${C.primary}, ${C.secondary})`, backgroundSize:"200% 200%", animation:"gradientShift 4s ease infinite", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>{titleMap[page]}</span>
        <div style={{display:"flex",gap:8}}>
          <button onClick={toggleTheme} style={{background:C.muted,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:14,padding:"8px",color:C.text,cursor:"pointer",display:"flex",transition:"all .3s cubic-bezier(0.4,0,0.2,1)"}} onMouseOver={e=>{e.currentTarget.style.borderColor=C.primary;e.currentTarget.style.boxShadow=`0 0 16px ${C.primaryDim}`;}} onMouseOut={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
            <Ico n={themeMode==="dark"?"sun":"moon"} sz={18}/>
          </button>
           <button onClick={()=>setShowBackup(true)} style={{background:C.muted,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:14,padding:"8px",color:C.text,cursor:"pointer",display:"flex",transition:"all .3s cubic-bezier(0.4,0,0.2,1)"}} onMouseOver={e=>{e.currentTarget.style.borderColor=C.primary;e.currentTarget.style.boxShadow=`0 0 16px ${C.primaryDim}`;}} onMouseOut={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
            <Ico n="cloud" sz={18}/>
          </button>
          <button onClick={()=>setAddTx(true)} style={{backgroundImage:`linear-gradient(135deg, ${C.primary}, ${C.secondary})`,backgroundSize:"200% 200%",animation:"gradientShift 3s ease infinite",border:"none",borderRadius:14,padding:"8px 18px",color:"#000",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13,fontWeight:800,boxShadow:`0 4px 20px ${C.primaryDim}, 0 0 40px ${C.primaryDim}`,transition:"all .3s"}} onMouseOver={e=>e.currentTarget.style.transform="scale(1.05)"} onMouseOut={e=>e.currentTarget.style.transform="scale(1)"}>
            <Ico n="plus" sz={16} c="#000"/> Add
          </button>
        </div>
      </div>

      {pageMap[page]}

      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",bottom:92,left:"50%",transform:"translateX(-50%)",zIndex:999,background:toast.type==="error"?"#2a0a10":"#082018",border:`1px solid ${toast.type==="error"?C.expense:C.income}`,color:toast.type==="error"?C.expense:C.income,padding:"10px 20px",borderRadius:12,fontSize:13,fontWeight:700,whiteSpace:"nowrap",boxShadow:"0 8px 32px #00000077"}}>
          {toast.msg}
        </div>
      )}

      {/* Bottom Nav */}
      <nav style={{position:"fixed",bottom:16,left:"50%",transform:"translateX(-50%)",width:"calc(100% - 40px)",maxWidth:560,background:C.navBg,backdropFilter:"blur(32px) saturate(200%)",borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:28,display:"flex",padding:"8px 6px",zIndex:200, boxShadow:`${C.shadow}, 0 0 60px ${C.glow1||"transparent"}`}}>
        {[{id:"dashboard",icon:"home",label:"Home"},{id:"transactions",icon:"list",label:"Txns"},{id:"reports",icon:"chart",label:"Report"},{id:"categories",icon:"grid",label:"Specs"},{id:"tags",icon:"tag",label:"Tags"},{id:"accounts",icon:"bank",label:"Vault"}].map(n=>(
          <button key={n.id} onClick={()=>setPage(n.id)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"6px 0",color:page===n.id?C.primary:C.sub,fontFamily:"inherit",transition:"all .4s cubic-bezier(0.16, 1, 0.3, 1)", transform:page===n.id?"translateY(-3px)":"translateY(0)"}}>
            <div style={{position:"relative", display:"flex", alignItems:"center", justifyContent:"center"}}>
              {page===n.id && <div style={{position:"absolute", width:40, height:40, background:C.primaryDim, borderRadius:"14px", filter:"blur(12px)", animation:"pulseGlow 2s ease-in-out infinite"}}/>}
              <Ico n={n.icon} sz={22} c={page===n.id?C.primary:C.sub}/>
            </div>
            <span style={{fontSize:9,fontWeight:800, letterSpacing:".04em", textTransform:"uppercase", opacity:page===n.id?1:0.5, color:page===n.id?C.primary:C.sub, transition:"all .3s"}}>{n.label}</span>
          </button>
        ))}
      </nav>

      {/* ── ADD TRANSACTION MODAL ─────────────────────────────────────────── */}
      <Modal open={addTx} onClose={()=>setAddTx(false)} title="Add Transaction">
        <TxForm init={BLANK_TX} categories={categories} tags={tags} accounts={accounts} onSave={handleSaveTx} onClose={()=>setAddTx(false)}/>
      </Modal>

      {/* ── EDIT TRANSACTION MODAL ────────────────────────────────────────── */}
      <Modal open={!!editTx} onClose={()=>setEditTx(null)} title="Edit Transaction">
        {editTx && <TxForm init={editTx} categories={categories} tags={tags} accounts={accounts} onSave={handleSaveTx} onDelete={handleDeleteTx} onClose={()=>setEditTx(null)}/>}
      </Modal>

      {/* ── SMART IMPORT MODAL (Analyzer Wizard) ─────────────────────────── */}
      <Modal open={showUpload} onClose={()=>{setShowUpload(false);setAnalyzerState({step:"upload",file:null,headers:[],rows:[],columnMap:{},processed:[],loading:false,error:""});}} title={analyzerState.step==="upload"?"Import Statement":analyzerState.step==="map"?"Map Columns":"Review & Import"}>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>

          {/* STEP 1: UPLOAD */}
          {analyzerState.step === "upload" && (<>
            <div
              onClick={() => analyzerFileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = C.primary; }}
              onDragLeave={e => { e.currentTarget.style.borderColor = C.border; }}
              onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = C.border; const f = e.dataTransfer.files?.[0]; if(f) handleFileUpload(f); }}
              style={{background:C.input,border:`2px dashed ${C.border}`,borderRadius:20,padding:"40px 16px",textAlign:"center",cursor:"pointer",transition:"border-color .2s"}}
            >
              <div style={{width:56,height:56,borderRadius:16,background:`linear-gradient(135deg,${C.primary}22,${C.secondary}22)`,margin:"0 auto 12px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Ico n="analyze" sz={24} c={C.primary}/>
              </div>
              <div style={{color:C.text,fontSize:15,fontWeight:800,marginBottom:4}}>Drop your bank statement here</div>
              <div style={{color:C.sub,fontSize:12}}>Excel (.xls, .xlsx) supported</div>
            </div>
            <input ref={analyzerFileRef} type="file" accept=".xls,.xlsx" style={{display:"none"}} onChange={e => { const f = e.target.files?.[0]; if(f) handleFileUpload(f); e.target.value=""; }}/>
            {analyzerState.loading && (
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:16}}>
                <div style={{width:18,height:18,borderRadius:"50%",borderWidth:2,borderStyle:"solid",borderLeftColor:C.muted,borderRightColor:C.muted,borderBottomColor:C.muted,borderTopColor:C.primary,animation:"spin .7s linear infinite"}}/>
                <span style={{color:C.sub,fontSize:13,fontWeight:600}}>Parsing…</span>
              </div>
            )}
            {analyzerState.error && <div style={{color:C.expense,fontSize:13,textAlign:"center",padding:10,background:C.expense+"11",borderRadius:10,border:`1px solid ${C.expense}33`}}>{analyzerState.error}</div>}
            <div style={{color:C.sub,fontSize:11,lineHeight:1.8,padding:"0 4px"}}>
              <b style={{color:C.text}}>Smart Import</b> — Auto-detects columns, categorizes {CATEGORY_RULES.length} categories using keyword matching, and generates clean descriptions.
            </div>
          </>)}

          {/* STEP 2: COLUMN MAPPING */}
          {analyzerState.step === "map" && (<>
            <div style={{color:C.sub,fontSize:12,marginBottom:4}}>Found <b style={{color:C.primary}}>{analyzerState.rows.length}</b> rows · <b style={{color:C.primary}}>{analyzerState.headers.length}</b> columns</div>
            {["date","description","debit","credit","balance"].map(field => (
              <CustomSelect
                key={field}
                label={field.charAt(0).toUpperCase()+field.slice(1) + " Column"}
                value={analyzerState.columnMap[field] || ""}
                options={[{id:"",name:"— Not mapped —"}, ...analyzerState.headers.map(h=>({id:h,name:h}))]}
                onChange={v => setAnalyzerState(p => ({...p, columnMap: {...p.columnMap, [field]: v}}))}
              />
            ))}
            <div style={{display:"flex",gap:10,marginTop:4}}>
              <Btn v="ghost" full onClick={() => setAnalyzerState(p=>({...p,step:"upload"}))}>Back</Btn>
              <Btn full icon="check" disabled={!analyzerState.columnMap.description} onClick={runProcessing}>
                {analyzerState.loading ? "Processing…" : `Process ${analyzerState.rows.length} Rows`}
              </Btn>
            </div>
          </>)}

          {/* STEP 3: RESULTS */}
          {analyzerState.step === "results" && (<>
            {(() => {
              const inc = analyzerState.processed.filter(t=>t.creditDebit==="Credit").reduce((s,t)=>s+t.amount,0);
              const exp = analyzerState.processed.filter(t=>t.creditDebit==="Debit").reduce((s,t)=>s+t.amount,0);
              return (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div style={{background:C.input,padding:14,borderRadius:16,border:`1px solid ${C.border}`}}>
                    <div style={{color:C.income,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".05em"}}>Income</div>
                    <div style={{color:C.text,fontSize:16,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",marginTop:4}}>{fmtAmt(inc)}</div>
                  </div>
                  <div style={{background:C.input,padding:14,borderRadius:16,border:`1px solid ${C.border}`}}>
                    <div style={{color:C.expense,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".05em"}}>Expense</div>
                    <div style={{color:C.text,fontSize:16,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",marginTop:4}}>{fmtAmt(exp)}</div>
                  </div>
                </div>
              );
            })()}

            <div style={{maxHeight:300,overflowY:"auto",display:"flex",flexDirection:"column",gap:6,padding:"2px 0"}}>
              {analyzerState.processed.slice(0,50).map((t,i) => (
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:t.category.color,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:C.text,fontSize:13,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.description}</div>
                    <div style={{color:C.sub,fontSize:10,marginTop:2}}>{t.date} · {t.category.name}</div>
                  </div>
                  <div style={{color:t.creditDebit==="Credit"?C.income:C.expense,fontSize:13,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>
                    {t.creditDebit==="Credit"?"+":"−"}{fmtAmt(t.amount)}
                  </div>
                </div>
              ))}
              {analyzerState.processed.length > 50 && <div style={{color:C.sub,fontSize:11,textAlign:"center",padding:8}}>+ {analyzerState.processed.length - 50} more</div>}
            </div>

            <div style={{display:"flex",gap:10}}>
              <Btn v="ghost" full onClick={() => setAnalyzerState({step:"upload",file:null,headers:[],rows:[],columnMap:{},processed:[],loading:false,error:""})}>Reset</Btn>
              <Btn full icon="plus" onClick={() => { importProcessed(); setShowUpload(false); }}>Import {analyzerState.processed.length}</Btn>
            </div>
          </>)}
        </div>
      </Modal>

      {/* ── FILTERS MODAL ─────────────────────────────────────────────────── */}
      <Modal open={showFilters} onClose={()=>setShowFilters(false)} title="Filter">
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><FLabel>From</FLabel><FInput value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})} type="date"/></div>
            <div><FLabel>To</FLabel><FInput value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})} type="date"/></div>
          </div>
          <div><FLabel>Credit / Debit</FLabel><CdToggle value={filters.cd} onChange={v=>setFilters({...filters,cd:filters.cd===v?"":v})}/></div>
          <CustomSelect label="Transaction Type" value={filters.type} options={[{id:"", name:"All"}, {id:"Income", name:"Income"}, {id:"Expense", name:"Expense"}, {id:"Investment", name:"Investment"}]} onChange={v=>setFilters({...filters,type:v})}/>
          <CustomSelect label="Category" value={filters.cat} options={[{id:"", name:"All", color:C.sub}, ...categories.map(c=>({...c}))]} onChange={v=>setFilters({...filters,cat:v})}/>
          <CustomSelect label="Account" value={filters.acc} options={[{id:"", name:"All", color:C.sub}, ...accounts.map(a=>({...a, color:C.primary}))]} onChange={v=>setFilters({...filters,acc:v})}/>
          <div>
            <FLabel>Tags</FLabel>
            <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
              {tags.map(tg=>{const sel=filters.tags.includes(tg.id);return <button key={tg.id} onClick={()=>setFilters(p=>({...p,tags:sel?p.tags.filter(x=>x!==tg.id):[...p.tags,tg.id]}))} style={{background:sel?tg.color+"30":"transparent",border:`1px solid ${sel?tg.color:C.border}`,borderRadius:8,padding:"5px 11px",color:sel?tg.color:C.sub,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>#{tg.name}</button>;})}
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn v="ghost" full onClick={()=>{setFilters({from:"",to:"",cat:"",tags:[],acc:"",type:"",cd:""});setShowFilters(false);}}>Reset</Btn>
            <Btn full onClick={()=>setShowFilters(false)}>Apply ({filteredTx.length})</Btn>
          </div>
        </div>
      </Modal>

      {/* ── BACKUP MODAL ──────────────────────────────────────────────────── */}
      <Modal open={showBackup} onClose={()=>{setShowBackup(false);setDriveStep(null);setDriveFiles([]);}} title="Backup & Restore">
        <div style={{display:"flex",flexDirection:"column",gap:16}}>

          {/* ☁️ Google Drive Section */}
          <div style={{background:`linear-gradient(135deg, rgba(66,133,244,0.08), rgba(52,168,83,0.08))`,border:`1px solid rgba(66,133,244,0.2)`,borderRadius:18,padding:18}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{width:36,height:36,borderRadius:12,background:"linear-gradient(135deg, #4285F4, #34A853)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>☁️</div>
              <div>
                <div style={{color:C.text,fontSize:14,fontWeight:800}}>Google Drive Sync</div>
                <div style={{color:C.sub,fontSize:11}}>Save & restore backups directly to your Google Drive</div>
              </div>
            </div>

            {!driveStep && (
              <div style={{display:"flex",gap:10}}>
                <button onClick={saveToDrive} style={{flex:1,background:"linear-gradient(135deg, #4285F4, #1a73e8)",border:"none",borderRadius:14,padding:"12px 16px",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit",transition:"transform .2s, box-shadow .2s",boxShadow:"0 4px 16px rgba(66,133,244,0.3)"}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
                  <Ico n="upload" sz={16} c="#fff"/>Save to Drive
                </button>
                <button onClick={listDriveBackups} style={{flex:1,background:"linear-gradient(135deg, #34A853, #1e8e3e)",border:"none",borderRadius:14,padding:"12px 16px",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit",transition:"transform .2s, box-shadow .2s",boxShadow:"0 4px 16px rgba(52,168,83,0.3)"}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
                  <Ico n="down" sz={16} c="#fff"/>Restore from Drive
                </button>
              </div>
            )}

            {driveStep === "saving" && (
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:16}}>
                <div style={{width:18,height:18,borderRadius:"50%",borderWidth:2,borderStyle:"solid",borderLeftColor:"transparent",borderRightColor:"transparent",borderBottomColor:"transparent",borderTopColor:"#4285F4",animation:"spin .7s linear infinite"}}/>
                <span style={{color:C.text,fontSize:13,fontWeight:600}}>Saving to Google Drive…</span>
              </div>
            )}

            {driveStep === "restoring" && (
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:16}}>
                <div style={{width:18,height:18,borderRadius:"50%",borderWidth:2,borderStyle:"solid",borderLeftColor:"transparent",borderRightColor:"transparent",borderBottomColor:"transparent",borderTopColor:"#34A853",animation:"spin .7s linear infinite"}}/>
                <span style={{color:C.text,fontSize:13,fontWeight:600}}>Restoring from Drive…</span>
              </div>
            )}

            {driveStep === "list" && (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{color:C.sub,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em"}}>Backups found on Drive</div>
                {driveFiles.length === 0 ? (
                  <div style={{color:C.sub,fontSize:13,textAlign:"center",padding:16}}>No backups found on your Google Drive. Save one first!</div>
                ) : driveFiles.map(f => (
                  <div key={f.id} onClick={() => restoreFromDrive(f.id)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"12px 16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="#34A853";e.currentTarget.style.transform="translateX(4px)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="translateX(0)";}}>
                    <div>
                      <div style={{color:C.text,fontSize:13,fontWeight:700}}>{f.name}</div>
                      <div style={{color:C.sub,fontSize:11,marginTop:2}}>{new Date(f.modifiedTime).toLocaleString()}</div>
                    </div>
                    <div style={{color:"#34A853",fontSize:11,fontWeight:800}}>RESTORE →</div>
                  </div>
                ))}
                <button onClick={() => {setDriveStep(null); setDriveFiles([]);}} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:10,padding:"8px",color:C.sub,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginTop:4}}>← Back</button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{flex:1,height:1,background:C.border}}/>
            <span style={{color:C.sub,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".1em"}}>or local backup</span>
            <div style={{flex:1,height:1,background:C.border}}/>
          </div>

          {/* Local Backup */}
          <Btn full icon="down" v="ghost" onClick={exportBackup}>Download Backup (.json)</Btn>
          <Btn full v="ghost" icon="upload" onClick={()=>importRef.current?.click()}>Restore from Local File</Btn>
          <input ref={importRef} type="file" accept=".json" style={{display:"none"}} onChange={importBackup}/>

          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14}}>
            <Btn full sm v="ghost" icon="trash" onClick={logout}>Sign Out (Reset Session)</Btn>
            <div style={{height:10}}/>
            <Btn full v="ghost" icon="down" onClick={exportCSV}>Export Transactions as CSV</Btn>
          </div>
          <div style={{color:C.sub,fontSize:11,textAlign:"center"}}>{transactions.length} transactions · {accounts.length} accounts · {tags.length} tags</div>
        </div>
      </Modal>

      {/* ── NEW CATEGORY ──────────────────────────────────────────────────── */}
      <Modal open={showNewCat} onClose={()=>setShowNewCat(false)} title="New Category">
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div><FLabel>Name</FLabel><FInput value={newCat.name} onChange={e=>setNewCat({...newCat,name:e.target.value})} placeholder="e.g. Rent, Gym…"/></div>
          <CustomSelect label="Type" value={newCat.type} options={["Expense","Income","Investment"].map(o=>({id:o, name:o}))} onChange={v=>setNewCat({...newCat,type:v})}/>
          <div><FLabel>Monthly Budget (optional)</FLabel><FInput value={newCat.budget} onChange={e=>setNewCat({...newCat,budget:e.target.value})} placeholder="e.g. 5000" type="number"/></div>
          <div><FLabel>Color</FLabel><input type="color" value={newCat.color} onChange={e=>setNewCat({...newCat,color:e.target.value})} style={{width:50,height:38,border:"none",background:"none",cursor:"pointer",padding:0}}/></div>
          <Btn full onClick={()=>{if(!newCat.name.trim())return;setCats(p=>[...p,{id:uid(),name:newCat.name,type:newCat.type,color:newCat.color,budget:newCat.budget?parseFloat(newCat.budget):0}]);setNewCat({name:"",type:"Expense",color:"#00dba8",budget:""});setShowNewCat(false);notify("✓ Category added");}}>Add</Btn>
        </div>
      </Modal>

      {/* ── NEW/EDIT TAG ───────────────────────────────────────────────────────── */}
      <Modal open={showNewTag} onClose={()=>setShowNewTag(false)} title={editingTag ? "Edit Tag" : "New Tag"}>
        <div style={{display:"flex",flexDirection:"column",gap:14, paddingBottom:10}}>
          <div style={{background:C.input, padding:16, borderRadius:20, border:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:14, justifyContent:"center", marginBottom:10}}>
             <div style={{width:50, height:50, borderRadius:16, background:newTag.color+"22", border:`1px solid ${newTag.color}50`, display:"flex", alignItems:"center", justifyContent:"center"}}>
               <Ico n="tag" sz={22} c={newTag.color}/>
             </div>
             <span style={{color:newTag.color, fontSize:20, fontWeight:900, letterSpacing:"-.02em"}}>#{newTag.name || "tagname"}</span>
          </div>

          <div><FLabel>Tag Name</FLabel><FInput value={newTag.name} onChange={e=>setNewTag({...newTag,name:e.target.value})} placeholder="e.g. Vacation, Trip…"/></div>
          
          <div>
            <FLabel>Theme Color</FLabel>
            <div style={{display:"flex", gap:10, flexWrap:"wrap", marginBottom:10}}>
              {["#00dba8","#00e5ff","#6366f1","#a855f7","#ec4899","#f97316","#eab308","#ef4444"].map(c => (
                <button key={c} onClick={()=>setNewTag(p=>({...p, color:c}))} style={{width:32, height:32, borderRadius:8, background:c, border:`3px solid ${newTag.color===c?"#fff":"transparent"}`, cursor:"pointer", transition:"transform .2s"}} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}/>
              ))}
              <input type="color" value={newTag.color} onChange={e=>setNewTag({...newTag,color:e.target.value})} style={{width:32,height:32,border:"none",background:"none",cursor:"pointer",padding:0, borderRadius:8}}/>
            </div>
          </div>

          <div style={{display:"flex", gap:10, marginTop:10}}>
             <Btn v="ghost" full onClick={()=>setShowNewTag(false)}>Cancel</Btn>
             <Btn full onClick={()=>{
               if(!newTag.name.trim()) return;
               if(editingTag) {
                 setTgs(prev => prev.map(t => t.id === editingTag.id ? {...t, ...newTag} : t));
                 notify("✓ Tag updated");
               } else {
                 setTgs(p=>[...p,{id:uid(),...newTag}]);
                 notify("✓ Tag added");
               }
               setNewTag({name:"",color:"#00dba8"});
               setShowNewTag(false);
               setEditingTag(null);
             }}>{editingTag ? "Save Changes" : "Create Tag"}</Btn>
          </div>
        </div>
      </Modal>

      {/* ── NEW ACCOUNT ───────────────────────────────────────────────────── */}
      <Modal open={showNewAcc} onClose={()=>setShowNewAcc(false)} title="New Account">
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div><FLabel>Name</FLabel><FInput value={newAcc.name} onChange={e=>setNewAcc({...newAcc,name:e.target.value})} placeholder="e.g. ICICI Savings…"/></div>
          <CustomSelect label="Type" value={newAcc.type} options={["Bank","Credit Card","Wallet","Cash","UPI","Investment"].map(o=>({id:o, name:o}))} onChange={v=>setNewAcc({...newAcc,type:v})}/>
          <div><FLabel>Initial Balance</FLabel><FInput value={newAcc.initialBalance} onChange={e=>setNewAcc({...newAcc,initialBalance:e.target.value})} placeholder="e.g. 25000" type="number"/></div>
          <Btn full onClick={()=>{if(!newAcc.name.trim())return;setAccs(p=>[...p,{id:uid(),name:newAcc.name,type:newAcc.type,initialBalance:newAcc.initialBalance?parseFloat(newAcc.initialBalance):0}]);setNewAcc({name:"",type:"Bank",initialBalance:""});setShowNewAcc(false);notify("✓ Account added");}}>Add Account</Btn>
        </div>
      </Modal>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulseGlow { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
        @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes borderGlow { 0%,100% { border-color: rgba(0, 229, 255, 0.08); } 50% { border-color: rgba(0, 229, 255, 0.2); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { background: ${C.bg}; transition: background 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
        input[type=date]::-webkit-calendar-picker-indicator { filter: ${themeMode==="dark"?"invert(.8)":"none"}; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0, 229, 255, 0.15); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0, 229, 255, 0.3); }
        input[type=number]::-webkit-inner-spin-button { opacity: .3; }
        .page-enter { animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        ::selection { background: rgba(0, 229, 255, 0.25); color: #fff; }
      `}</style>
    </div>
  );
}
