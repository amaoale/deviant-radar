type Suggestion = {
  Code?: string;
  Name?: string;
  Classify?: string;
  SecurityTypeName?: string;
};

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (!query || query.length > 30) {
    return Response.json({ stock: null, message: "请输入股票名称或6位代码" }, { status: 400 });
  }

  const params = new URLSearchParams({
    input: query,
    type: "14",
    token: String((env as unknown as { EASTMONEY_SEARCH_TOKEN?: string }).EASTMONEY_SEARCH_TOKEN || ""),
  });
  const response = await fetch(`https://searchapi.eastmoney.com/api/suggest/get?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    return Response.json({ stock: null, message: "股票查询服务暂时不可用" }, { status: 502 });
  }

  const payload = (await response.json()) as {
    QuotationCodeTable?: { Data?: Suggestion[] };
  };
  const candidates = (payload.QuotationCodeTable?.Data || []).filter(
    (item) => item.Classify === "AStock" && /^\d{6}$/.test(item.Code || ""),
  );
  const exact =
    candidates.find((item) => item.Code === query || item.Name === query) ||
    candidates[0];

  if (!exact?.Code || !exact.Name) {
    return Response.json({ stock: null, message: "未找到对应的A股股票" }, { status: 404 });
  }

  return Response.json(
    {
      stock: {
        code: exact.Code,
        name: exact.Name,
        exchange: exact.SecurityTypeName?.includes("深") ? "SZ" : "SH",
      },
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
import { env } from "cloudflare:workers";
