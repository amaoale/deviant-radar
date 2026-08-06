function quoteCode(code: string) {
  return `${code.startsWith("6") ? "sh" : "sz"}${code}`;
}

function quoteTime(value: string) {
  if (!/^\d{14}$/.test(value)) return "";
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)} ${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}`;
}

function shanghaiClock() {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date()).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, month: `${values.year}-${values.month}`, hour: Number(values.hour) };
}

function currentWeekStart(date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  const offset = (value.getUTCDay() + 6) % 7;
  value.setUTCDate(value.getUTCDate() - offset);
  return value.toISOString().slice(0, 10);
}

type WeeklyBand = {
  lower: number;
  middle: number;
  upper: number;
  bollAsOf: string;
  bollPeriods: number;
};

type MonthlyBand = WeeklyBand & {
  previousMiddle: number;
  trend: "up" | "flat" | "down";
};

type DailyBand = WeeklyBand & { recentCloses: number[] };

type DailyAverage = {
  ma250: number;
  ma250AsOf: string;
  ma250AboveDays: number;
};

async function dailyAverage250(code: string): Promise<DailyAverage | null> {
  try {
    const symbol = quoteCode(code);
    const response = await fetch(
      `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${symbol},day,,,270,`,
      {
        cache: "no-store",
        headers: {
          Accept: "application/json,text/plain,*/*",
          Referer: "https://finance.qq.com/",
        },
      },
    );
    if (!response.ok) return null;

    const payload = await response.json() as {
      data?: Record<string, { qfqday?: unknown; day?: unknown }>;
    };
    const block = payload.data?.[symbol];
    const rawRows = block?.day;
    if (!Array.isArray(rawRows)) return null;

    const clock = shanghaiClock();
    const rows = rawRows
      .filter((row): row is unknown[] => Array.isArray(row))
      .map((row) => ({ date: String(row[0] || ""), close: Number(row[2]) }))
      .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && (row.date < clock.date || (row.date === clock.date && clock.hour >= 15)) && Number.isFinite(row.close) && row.close > 0)
      .slice(-250);
    if (rows.length < 250) return null;

    const ma250 = Number((rows.reduce((sum, row) => sum + row.close, 0) / rows.length).toFixed(3));
    return {
      ma250,
      ma250AsOf: rows.at(-1)?.date || "",
      ma250AboveDays: rows.slice(-3).filter((row) => row.close >= ma250).length,
    };
  } catch {
    return null;
  }
}

async function weeklyBand(code: string): Promise<WeeklyBand | null> {
  try {
    const symbol = quoteCode(code);
    const response = await fetch(
      `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${symbol},week,,,31,qfq`,
      {
        cache: "no-store",
        headers: {
          Accept: "application/json,text/plain,*/*",
          Referer: "https://finance.qq.com/",
        },
      },
    );
    if (!response.ok) return null;

    const payload = await response.json() as {
      data?: Record<string, { qfqweek?: unknown; week?: unknown }>;
    };
    const block = payload.data?.[symbol];
    const rawRows = block?.qfqweek ?? block?.week;
    if (!Array.isArray(rawRows)) return null;

    const weekStart = currentWeekStart(shanghaiClock().date);
    const rows = rawRows
      .filter((row): row is unknown[] => Array.isArray(row))
      .map((row) => ({ date: String(row[0] || ""), close: Number(row[2]) }))
      .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && row.date < weekStart && Number.isFinite(row.close) && row.close > 0)
      .slice(-20);
    if (rows.length < 20) return null;

    const middle = rows.reduce((sum, row) => sum + row.close, 0) / rows.length;
    const variance = rows.reduce((sum, row) => sum + (row.close - middle) ** 2, 0) / rows.length;
    const standardDeviation = Math.sqrt(variance);
    const round = (value: number) => Number(value.toFixed(3));

    return {
      lower: round(middle - standardDeviation * 2),
      middle: round(middle),
      upper: round(middle + standardDeviation * 2),
      bollAsOf: rows.at(-1)?.date || "",
      bollPeriods: rows.length,
    };
  } catch {
    return null;
  }
}

async function dailyBand(code: string): Promise<DailyBand | null> {
  try {
    const symbol = quoteCode(code);
    const response = await fetch(
      `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${symbol},day,,,31,qfq`,
      { cache: "no-store", headers: { Accept: "application/json,text/plain,*/*", Referer: "https://finance.qq.com/" } },
    );
    if (!response.ok) return null;
    const payload = await response.json() as { data?: Record<string, { qfqday?: unknown; day?: unknown }> };
    const rawRows = payload.data?.[symbol]?.qfqday ?? payload.data?.[symbol]?.day;
    if (!Array.isArray(rawRows)) return null;
    const clock = shanghaiClock();
    const rows = rawRows
      .filter((row): row is unknown[] => Array.isArray(row))
      .map((row) => ({ date: String(row[0] || ""), close: Number(row[2]) }))
      .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && (row.date < clock.date || (row.date === clock.date && clock.hour >= 15)) && Number.isFinite(row.close) && row.close > 0)
      .slice(-20);
    if (rows.length < 20) return null;
    return { ...boll(rows), bollAsOf: rows.at(-1)?.date || "", bollPeriods: rows.length, recentCloses: rows.slice(-3).map((row) => row.close) };
  } catch {
    return null;
  }
}

function boll(rows: { date: string; close: number }[]) {
  const middle = rows.reduce((sum, row) => sum + row.close, 0) / rows.length;
  const variance = rows.reduce((sum, row) => sum + (row.close - middle) ** 2, 0) / rows.length;
  const standardDeviation = Math.sqrt(variance);
  const round = (value: number) => Number(value.toFixed(3));
  return { lower: round(middle - standardDeviation * 2), middle: round(middle), upper: round(middle + standardDeviation * 2) };
}

async function monthlyBand(code: string): Promise<MonthlyBand | null> {
  try {
    const symbol = quoteCode(code);
    const response = await fetch(
      `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${symbol},month,,,46,qfq`,
      { cache: "no-store", headers: { Accept: "application/json,text/plain,*/*", Referer: "https://finance.qq.com/" } },
    );
    if (!response.ok) return null;
    const payload = await response.json() as { data?: Record<string, { qfqmonth?: unknown; month?: unknown }> };
    const rawRows = payload.data?.[symbol]?.qfqmonth ?? payload.data?.[symbol]?.month;
    if (!Array.isArray(rawRows)) return null;
    const currentMonth = shanghaiClock().month;
    const rows = rawRows
      .filter((row): row is unknown[] => Array.isArray(row))
      .map((row) => ({ date: String(row[0] || ""), close: Number(row[2]) }))
      .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && row.date.slice(0, 7) < currentMonth && Number.isFinite(row.close) && row.close > 0);
    if (rows.length < 21) return null;
    const currentRows = rows.slice(-20);
    const previousRows = rows.slice(-21, -1);
    const current = boll(currentRows);
    const previous = boll(previousRows);
    const change = (current.middle - previous.middle) / previous.middle;
    return {
      ...current,
      previousMiddle: previous.middle,
      trend: change > 0.005 ? "up" : change < -0.005 ? "down" : "flat",
      bollAsOf: currentRows.at(-1)?.date || "",
      bollPeriods: currentRows.length,
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const codes = (url.searchParams.get("codes") || "")
    .split(",")
    .map((code) => code.trim())
    .filter((code) => /^\d{6}$/.test(code))
    .slice(0, 30);
  const selectedCodes = (name: string) => new Set((url.searchParams.has(name) ? url.searchParams.get(name) || "" : codes.join(","))
    .split(",")
    .map((code) => code.trim())
    .filter((code) => /^\d{6}$/.test(code) && codes.includes(code))
    .slice(0, 30));
  const requestedDayCodes = selectedCodes("dayCodes");
  const requestedWeekCodes = selectedCodes("weekCodes");
  const requestedMonthCodes = selectedCodes("monthCodes");
  const requestedMaCodes = new Set((url.searchParams.get("maCodes") || "")
    .split(",")
    .map((code) => code.trim())
    .filter((code) => /^\d{6}$/.test(code) && codes.includes(code))
    .slice(0, 30));

  if (!codes.length) {
    return Response.json({ quotes: [], updatedAt: new Date().toISOString() });
  }

  const [response, bands, dailyBands, monthlyBands, averages] = await Promise.all([
    fetch(
      `https://qt.gtimg.cn/q=${codes.map(quoteCode).join(",")}`,
      {
        cache: "no-store",
        headers: {
          Accept: "text/plain,*/*",
          Referer: "https://finance.qq.com/",
        },
      },
    ),
    Promise.all([...requestedWeekCodes].map(async (code) => [code, await weeklyBand(code)] as const)),
    Promise.all([...requestedDayCodes].map(async (code) => [code, await dailyBand(code)] as const)),
    Promise.all([...requestedMonthCodes].map(async (code) => [code, await monthlyBand(code)] as const)),
    Promise.all([...requestedMaCodes].map(async (code) => [code, await dailyAverage250(code)] as const)),
  ]);

  if (!response.ok) {
    return Response.json(
      { quotes: [], message: `行情源返回 ${response.status}` },
      { status: 502 },
    );
  }

  const bandsByCode = new Map(bands);
  const dailyBandsByCode = new Map(dailyBands);
  const monthlyBandsByCode = new Map(monthlyBands);
  const averagesByCode = new Map(averages);
  const calculatedAt = new Date().toISOString();
  const text = await response.text();
  const quotes: {
    code: string;
    price: number;
    previousClose: number;
    change: number;
    quoteTime: string;
    lower: number | null;
    middle: number | null;
    upper: number | null;
    bollAsOf: string;
    bollPeriods: number;
    weekBollUpdatedAt: string;
    ma250: number | null;
    ma250AsOf: string;
    ma250UpdatedAt: string;
    ma250Basis: "raw" | "";
    ma250AboveDays: number;
    monthLower: number | null;
    monthMiddle: number | null;
    monthUpper: number | null;
    monthPreviousMiddle: number | null;
    monthTrend: "up" | "flat" | "down" | "";
    monthBollAsOf: string;
    monthBollUpdatedAt: string;
    dayLower: number | null;
    dayMiddle: number | null;
    dayUpper: number | null;
    dayBollAsOf: string;
    dayBollUpdatedAt: string;
    dayRecentCloses: number[];
  }[] = [];
  const rows = text.matchAll(/v_([a-z]{2})(\d{6})="([^"]*)"/g);

  for (const row of rows) {
    const fields = row[3].split("~");
    const price = Number(fields[3]);
    if (!Number.isFinite(price) || price <= 0) continue;
    const band = bandsByCode.get(row[2]);
    const average = averagesByCode.get(row[2]);
    const monthBand = monthlyBandsByCode.get(row[2]);
    const dayBand = dailyBandsByCode.get(row[2]);
    quotes.push({
      code: row[2],
      price,
      previousClose: Number(fields[4]) || price,
      change: Number(fields[32]) || 0,
      quoteTime: quoteTime(fields[30] || ""),
      lower: band?.lower ?? null,
      middle: band?.middle ?? null,
      upper: band?.upper ?? null,
      bollAsOf: band?.bollAsOf ?? "",
      bollPeriods: band?.bollPeriods ?? 0,
      weekBollUpdatedAt: band ? calculatedAt : "",
      ma250: average?.ma250 ?? null,
      ma250AsOf: average?.ma250AsOf ?? "",
      ma250UpdatedAt: average ? new Date().toISOString() : "",
      ma250Basis: average ? "raw" : "",
      ma250AboveDays: average?.ma250AboveDays ?? 0,
      monthLower: monthBand?.lower ?? null,
      monthMiddle: monthBand?.middle ?? null,
      monthUpper: monthBand?.upper ?? null,
      monthPreviousMiddle: monthBand?.previousMiddle ?? null,
      monthTrend: monthBand?.trend ?? "",
      monthBollAsOf: monthBand?.bollAsOf ?? "",
      monthBollUpdatedAt: monthBand ? calculatedAt : "",
      dayLower: dayBand?.lower ?? null,
      dayMiddle: dayBand?.middle ?? null,
      dayUpper: dayBand?.upper ?? null,
      dayBollAsOf: dayBand?.bollAsOf ?? "",
      dayBollUpdatedAt: dayBand ? calculatedAt : "",
      dayRecentCloses: dayBand?.recentCloses ?? [],
    });
  }

  return Response.json(
    {
      quotes,
      updatedAt: quotes.map((quote) => quote.quoteTime).filter(Boolean).sort().at(-1) || new Date().toISOString(),
      source: `腾讯证券行情 · 实时股价${requestedDayCodes.size ? " · 日线BOLL" : ""}${requestedWeekCodes.size ? " · 周线BOLL" : ""}${requestedMonthCodes.size ? " · 月线BOLL" : ""}${requestedMaCodes.size ? " · MA250" : ""}`,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
