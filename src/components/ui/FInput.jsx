import React from "react";

export const FLabel = ({children, theme, style:x}) => {
  const C = theme;
  return <label style={{color:C.sub,fontSize:10,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase",display:"block",marginBottom:2,...x}}>{children}</label>;
};

export const FInput = ({value,onChange,placeholder,type="text",step,style:x, theme}) => {
  const C = theme;
  return (
    <input value={value} onChange={onChange} placeholder={placeholder} type={type} step={step} style={{
      background:C.input,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:10,padding:"8px 10px",
      color:C.text,fontSize:14,outline:"none",width:"100%",maxWidth:"100%",boxSizing:"border-box",fontFamily:"inherit",
      minHeight:36,overflow:"hidden",...x
    }}/>
  );
};
