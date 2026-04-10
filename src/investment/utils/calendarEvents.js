export const generateCalendarEvents = (holdings) => {
  const events = [];
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const endWindow = new Date(today);
  endWindow.setDate(endWindow.getDate() + 90); // 90 days lookahead

  holdings.forEach(h => {
    // 1. FD Maturities
    if (h.type === "fd" && h.maturityDate) {
      const d = new Date(h.maturityDate);
      if (d >= today && d <= endWindow) {
        events.push({ date: d, title: `${h.name} Matures`, type: "maturity", amount: h.principal, holdingId: h.id });
      }
    }
    
    // 2. Bond Maturities
    if (h.type === "bond" && h.maturityDate) {
      const d = new Date(h.maturityDate);
      if (d >= today && d <= endWindow) {
        events.push({ date: d, title: `${h.name} Matures`, type: "maturity", amount: h.faceValue, holdingId: h.id });
      }
    }

    // 3. RD Installments (Monthly)
    if (h.type === "rd" && h.dayOfMonth && !h.deleted) {
      // Find next 3 months of this day
      for (let i = 0; i < 3; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, h.dayOfMonth);
        // Ensure we don't go past maturity
        if (h.maturityDate && d > new Date(h.maturityDate)) break;
        if (d >= today && d <= endWindow) {
          events.push({ date: d, title: `${h.name} Installment`, type: "sip", amount: h.installment, holdingId: h.id });
        }
      }
    }

    // 4. MF SIPs (Monthly)
    if (h.type === "mf" && h.sipDay && h.sipAmount) {
      for (let i = 0; i < 3; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, h.sipDay);
        if (d >= today && d <= endWindow) {
          events.push({ date: d, title: `${h.name} SIP Debit`, type: "sip", amount: h.sipAmount, holdingId: h.id });
        }
      }
    }

    // 5. Bond Coupons (annual, semi-annual, quarterly)
    if (h.type === "bond" && h.couponFrequency && h.startDate) {
      // step forward from startDate
      let stepMonths = 12;
      if (h.couponFrequency === "semi-annual") stepMonths = 6;
      if (h.couponFrequency === "quarterly") stepMonths = 3;

      const couponAmount = (h.faceValue || 0) * ((h.couponRate || 0) / 100) * (stepMonths / 12);
      
      let curDate = new Date(h.startDate);
      // Fast forward curDate near today
      while (curDate < today) {
        curDate.setMonth(curDate.getMonth() + stepMonths);
      }
      
      while (curDate <= endWindow) {
        if (h.maturityDate && curDate > new Date(h.maturityDate)) break;
        events.push({ date: new Date(curDate), title: `${h.name} Coupon`, type: "coupon", amount: couponAmount, holdingId: h.id });
        curDate.setMonth(curDate.getMonth() + stepMonths);
      }
    }
  });

  return events.sort((a,b) => a.date - b.date);
};
