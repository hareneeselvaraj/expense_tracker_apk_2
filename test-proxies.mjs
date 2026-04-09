async function checkProxies() {
  const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/TCS.NS`;
  
  const p1 = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
  const p2 = `https://api.codetabs.com/v1/proxy?quest=${targetUrl}`;
  const p3 = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
  
  for (const url of [p1, p2, p3]) {
    console.log("Testing:", url);
    try {
      const res = await fetch(url);
      console.log(" -> Status:", res.status);
      const text = await res.text();
      console.log(" -> Output:", text.slice(0, 100));
    } catch(e) {
      console.log(" -> Error:", e.message);
    }
  }
}
checkProxies();
