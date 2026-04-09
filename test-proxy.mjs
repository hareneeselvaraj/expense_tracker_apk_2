async function test() {
  const targetUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/RELIANCE.NS`);
  const proxyUrl = `https://thingproxy.freeboard.io/fetch/https://query1.finance.yahoo.com/v8/finance/chart/RELIANCE.NS`;
  try {
    const res = await fetch(proxyUrl);
    console.log("Status:", res.status);
    const txt = await res.text();
    console.log("Response:", txt.slice(0, 500));
  } catch(e) {
    console.error(e);
  }
}
test();
