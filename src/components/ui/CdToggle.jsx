import React from "react";

export const CdToggle = ({value,onChange,theme}) => {
  const C = theme;
  return (
    <div style={{display:"flex",background:C.input,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:10,overflow:"hidden",height:36}}>
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
};
