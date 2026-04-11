import React from "react";

export const TypeToggle = ({value,onChange,theme}) => {
  const C = theme;
  return (
    <div style={{display:"flex",background:C.input,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:10,overflow:"hidden",height:36}}>
      {["Expense","Income","Investment"].map(opt => {
        const col=opt==="Expense"?C.expense:opt==="Income"?C.income:C.invest;
        return <button key={opt} onClick={()=>onChange(opt)} style={{flex:1,border:"none",fontFamily:"inherit",fontSize:11,fontWeight:700,cursor:"pointer",background:value===opt?col+"33":"transparent",color:value===opt?col:C.sub,transition:"all .15s"}}>{opt}</button>;
      })}
    </div>
  );
};
