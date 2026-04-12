export async function handler(event) {
  const params = event.queryStringParameters || {};
  const targetPath = params.path;

  if (!targetPath) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing path param" }) };
  }

  // Whitelist: only allow Yahoo Finance hosts
  const allowed = [
    { prefix: "chart/",  host: "query1.finance.yahoo.com", base: "/v8/finance/chart/" },
    { prefix: "search",  host: "query2.finance.yahoo.com", base: "/v1/finance/search" },
  ];

  const match = allowed.find(a => targetPath.startsWith(a.prefix));
  if (!match) {
    return { statusCode: 403, body: JSON.stringify({ error: "Path not allowed" }) };
  }

  const sym = targetPath.slice(match.prefix.length);

  // Build query string from all params except "path"
  const qsParts = [];
  for (const [k, v] of Object.entries(params)) {
    if (k === "path") continue;
    qsParts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  }
  const qs = qsParts.length > 0 ? `?${qsParts.join("&")}` : "";
  const url = `https://${match.host}${match.base}${sym}${qs}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json",
      },
    });
    const body = await res.text();
    return {
      statusCode: res.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300", // 5 min edge cache
        "Access-Control-Allow-Origin": "*",
      },
      body,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Upstream fetch failed", detail: err.message }),
    };
  }
}
