import React from "react";

export const FLabel = ({children, theme, style:x}) => {
  const C = theme;
  return <label style={{color:C.sub,fontSize:11,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase",display:"block",marginBottom:4,...x}}>{children}</label>;
};

export const FInput = ({value,onChange,placeholder,type="text",step,style:x, theme}) => {
  const C = theme;
  return (
    <input value={value} onChange={onChange} placeholder={placeholder} type={type} step={step} style={{
      background:C.input,borderWidth:1,borderStyle:"solid",borderColor:C.border,borderRadius:12,padding:"10px 12px",
      color:C.text,fontSize:16,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"inherit",
      minHeight:44,...x
    }}/>
  );
};
