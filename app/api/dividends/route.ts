type EastmoneyDividend = {
  SECURITY_CODE?: string;
  SECURITY_NAME_ABBR?: string;
  PRETAX_BONUS_RMB?: number | null;
  PLAN_NOTICE_DATE?: string | null;
  EQUITY_RECORD_DATE?: string | null;
  EX_DIVIDEND_DATE?: string | null;
  REPORT_DATE?: string | null;
  ASSIGN_PROGRESS?: string | null;
  IMPL_PLAN_PROFILE?: string | null;
  NOTICE_DATE?: string | null;
};

type EastmoneyCalendarDividend = {
  SECURITY_CODE?: string;
  NOTICE_DATE?: string | null;
  LEVEL1_CONTENT?: string | null;
};

function day(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function calendarDate(match: RegExpMatchArray | null) {
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function parseCalendarDividend(item: EastmoneyCalendarDividend, name: string): EastmoneyDividend | null {
  const content = item.LEVEL1_CONTENT || "";
  if (!content.includes("[正式]")) return null;
  const fiscalYear = content.match(/公布(\d{4})年(?:年报)?分红/)?.[1] || "";
  const recordDate = calendarDate(content.match(/股权登记日：(\d{4})年(\d{2})月(\d{2})日/));
  const exDate = calendarDate(content.match(/除权除息日：(\d{4})年(\d{2})月(\d{2})日/));
  const cashPer10 = Number(content.match(/分配方案：10[^；]*?派([\d.]+)元/)?.[1] || 0);
  if (!fiscalYear || !recordDate || !exDate || !cashPer10) return null;
  return {
    SECURITY_CODE: item.SECURITY_CODE || "",
    SECURITY_NAME_ABBR: name,
    PRETAX_BONUS_RMB: cashPer10,
    NOTICE_DATE: item.NOTICE_DATE || null,
    EQUITY_RECORD_DATE: recordDate,
    EX_DIVIDEND_DATE: exDate,
    REPORT_DATE: `${fiscalYear}-06-30`,
    ASSIGN_PROGRESS: "实施分配",
    IMPL_PLAN_PROFILE: content,
  };
}

async function dividendRows(code: string) {
  const params = new URLSearchParams({
    reportName: "RPT_SHAREBONUS_DET",
    columns: "ALL",
    filter: `(SECURITY_CODE="${code}")`,
    pageNumber: "1",
    pageSize: "30",
    sortTypes: "-1",
    sortColumns: "EX_DIVIDEND_DATE",
  });
  const calendarParams = new URLSearchParams({
    reportName: "RPT_STOCKCALENDAR",
    columns: "ALL",
    filter: `(SECURITY_CODE="${code}")(EVENT_TYPE_CODE="004")`,
    pageNumber: "1",
    pageSize: "50",
    sortTypes: "-1",
    sortColumns: "NOTICE_DATE",
  });

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const [response, calendarResponse] = await Promise.all([
        fetch(`https://datacenter-web.eastmoney.com/api/data/v1/get?${params}`, { cache: "no-store", headers: { Accept: "application/json" } }),
        fetch(`https://datacenter-web.eastmoney.com/api/data/v1/get?${calendarParams}`, { cache: "no-store", headers: { Accept: "application/json" } }),
      ]);
      if (!response.ok || !calendarResponse.ok) throw new Error(`Dividend source returned ${response.status}/${calendarResponse.status}`);
      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
        result?: { data?: EastmoneyDividend[] };
      };
      const calendarPayload = (await calendarResponse.json()) as {
        success?: boolean;
        message?: string;
        result?: { data?: EastmoneyCalendarDividend[] };
      };
      if (payload.success === false || !Array.isArray(payload.result?.data)) {
        throw new Error(payload.message || "Dividend source returned an incomplete payload");
      }
      if (calendarPayload.success === false || !Array.isArray(calendarPayload.result?.data)) {
        throw new Error(calendarPayload.message || "Dividend calendar returned an incomplete payload");
      }
      const rows = [...payload.result.data];
      const name = rows.find((row) => row.SECURITY_NAME_ABBR)?.SECURITY_NAME_ABBR || code;
      for (const calendarItem of calendarPayload.result.data) {
        const parsed = parseCalendarDividend(calendarItem, name);
        if (!parsed) continue;
        const duplicate = rows.some((row) => day(row.EX_DIVIDEND_DATE) === day(parsed.EX_DIVIDEND_DATE) && Number(row.PRETAX_BONUS_RMB) === Number(parsed.PRETAX_BONUS_RMB));
        if (!duplicate) rows.push(parsed);
      }
      return rows;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Dividend source unavailable");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const codes = (url.searchParams.get("codes") || "")
    .split(",")
    .map((code) => code.trim())
    .filter((code) => /^\d{6}$/.test(code))
    .slice(0, 30);

  if (!codes.length) {
    return Response.json({ events: [], updatedAt: new Date().toISOString() });
  }

  const responses: PromiseSettledResult<{ code: string; rows: EastmoneyDividend[] }>[] = [];
  for (let index = 0; index < codes.length; index += 3) {
    const batch = codes.slice(index, index + 3);
    responses.push(...await Promise.allSettled(
      batch.map(async (code) => ({ code, rows: await dividendRows(code) })),
    ));
  }

  const events = responses.flatMap((result) =>
    result.status === "fulfilled"
      ? result.value.rows.map((item) => ({
          code: item.SECURITY_CODE || "",
          name: item.SECURITY_NAME_ABBR || "",
          cashPer10: Number(item.PRETAX_BONUS_RMB) || 0,
          exDate: day(item.EX_DIVIDEND_DATE),
          recordDate: day(item.EQUITY_RECORD_DATE),
          noticeDate: day(item.NOTICE_DATE || item.PLAN_NOTICE_DATE),
          reportDate: day(item.REPORT_DATE),
          status: item.ASSIGN_PROGRESS || "待公告",
          plan: item.IMPL_PLAN_PROFILE || "分红方案待公告",
        }))
      : [],
  );
  const failedCodes = responses.flatMap((result, index) =>
    result.status === "rejected" ? [codes[index]] : [],
  );

  return Response.json(
    {
      events,
      updatedAt: new Date().toISOString(),
      failed: failedCodes.length,
      failedCodes,
      source: "东方财富Choice公开数据 · 个股日历补充特别分红",
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
