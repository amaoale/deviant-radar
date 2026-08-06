import {
  readInvestmentState,
  type TradeRecord,
  writeInvestmentState,
} from "@/db/investment-state";
import { cookies, headers } from "next/headers";

export const dynamic = "force-dynamic";

const VISITOR_COOKIE = "dividend_radar_visitor";

async function digest(value: string) {
  const bytes = new TextEncoder().encode(value.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function principal() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  if (email) {
    return {
      stateId: email === "liyaowang517@gmail.com" ? "owner-portfolio" : `account-${await digest(email)}`,
      visitorId: null as string | null,
    };
  }
  const jar = await cookies();
  const existing = jar.get(VISITOR_COOKIE)?.value;
  if (existing && /^[a-f0-9-]{20,80}$/.test(existing)) return { stateId: `visitor-${existing}`, visitorId: existing };
  const visitorId = crypto.randomUUID();
  return { stateId: `visitor-${visitorId}`, visitorId };
}

function withVisitorCookie(response: Response, visitorId: string | null) {
  if (visitorId) response.headers.append("Set-Cookie", `${VISITOR_COOKIE}=${visitorId}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`);
  return response;
}

function validTrade(value: unknown): value is TradeRecord {
  if (!value || typeof value !== "object") return false;
  const trade = value as Partial<TradeRecord>;
  return Boolean(
    typeof trade.id === "string" &&
      trade.id.length <= 100 &&
      typeof trade.code === "string" &&
      /^\d{6}$/.test(trade.code) &&
      (trade.type === "buy" || trade.type === "sell") &&
      typeof trade.date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(trade.date) &&
      typeof trade.shares === "number" &&
      Number.isFinite(trade.shares) &&
      trade.shares > 0 &&
      trade.shares <= 1_000_000_000,
  );
}

export async function GET() {
  try {
    const identity = await principal();
    return withVisitorCookie(Response.json(await readInvestmentState(identity.stateId), {
      headers: { "Cache-Control": "no-store" },
    }), identity.visitorId);
  } catch {
    return Response.json({ message: "云端投资记录暂时无法读取" }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    const identity = await principal();
    const payload = (await request.json()) as {
      trades?: unknown;
      expectedRevision?: unknown;
    };
    if (
      !Array.isArray(payload.trades) ||
      payload.trades.length > 2_000 ||
      !payload.trades.every(validTrade) ||
      !Number.isInteger(payload.expectedRevision) ||
      Number(payload.expectedRevision) < 0
    ) {
      return Response.json({ message: "投资记录格式无效" }, { status: 400 });
    }

    const result = await writeInvestmentState(
      payload.trades,
      Number(payload.expectedRevision),
      identity.stateId,
    );
    if (!result) {
      return Response.json(
        { message: "云端记录已更新，请重新载入后再保存" },
        { status: 409 },
      );
    }
    return withVisitorCookie(Response.json(result, { headers: { "Cache-Control": "no-store" } }), identity.visitorId);
  } catch {
    return Response.json({ message: "云端投资记录暂时无法保存" }, { status: 503 });
  }
}
