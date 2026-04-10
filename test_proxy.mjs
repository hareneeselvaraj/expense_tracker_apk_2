const PROXIES = [
  url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://thingproxy.freeboard.io/fetch/${url}`
];
const url = 'https://query1.finance.yahoo.com/v8/finance/chart/TCS.NS';

async function test() {
  for (const p of PROXIES) {
    try {
      console.log('Testing', p(url));
      const res = await fetch(p(url));
      console.log('Status', res.status);
      const text = await res.text();
      console.log('Text length', text.length);
      console.log('Sample', text.substring(0, 100));
    } catch(e) {
      console.error('Failed:', e.message);
    }
  }
}
test();
