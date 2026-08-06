import { env } from "cloudflare:workers";

type TradeRecord = {
  id: string;
  code: string;
  type: "buy" | "sell";
  date: string;
  shares: number;
};

type StoredState = {
  trades: TradeRecord[];
};

type StateRow = {
  ciphertext: string;
  iv: string;
  revision: number;
  updated_at: string;
};

const DEFAULT_STATE_ID = "owner-portfolio";
const AAD = new TextEncoder().encode("dividend-radar-investment-state-v1");

function runtime() {
  const bindings = env as unknown as {
    DB?: D1Database;
    INVESTMENT_DATA_KEY?: string;
  };
  if (!bindings.DB) throw new Error("D1 database binding is unavailable");
  if (!bindings.INVESTMENT_DATA_KEY) throw new Error("Investment encryption key is unavailable");
  return { db: bindings.DB, secret: bindings.INVESTMENT_DATA_KEY };
}

async function ensureSchema(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS investment_state (
      id TEXT PRIMARY KEY NOT NULL,
      ciphertext TEXT NOT NULL,
      iv TEXT NOT NULL,
      revision INTEGER DEFAULT 1 NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();
}

function bytesToBase64(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

function base64ToBytes(value: string) {
  const decoded = atob(value);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

async function encryptionKey(secret: string) {
  const raw = base64ToBytes(secret);
  if (raw.byteLength !== 32) throw new Error("Investment encryption key must contain 32 bytes");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptState(state: StoredState, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(state));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: AAD },
    await encryptionKey(secret),
    plaintext,
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
  };
}

async function decryptState(row: StateRow, secret: string): Promise<StoredState> {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(row.iv), additionalData: AAD },
    await encryptionKey(secret),
    base64ToBytes(row.ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as StoredState;
}

export async function readInvestmentState(stateId = DEFAULT_STATE_ID) {
  const { db, secret } = runtime();
  await ensureSchema(db);
  const row = await db
    .prepare("SELECT ciphertext, iv, revision, updated_at FROM investment_state WHERE id = ?")
    .bind(stateId)
    .first<StateRow>();
  if (!row) return { trades: [] as TradeRecord[], revision: 0, updatedAt: "" };
  const state = await decryptState(row, secret);
  return { trades: state.trades, revision: row.revision, updatedAt: row.updated_at };
}

export async function writeInvestmentState(
  trades: TradeRecord[],
  expectedRevision: number,
  stateId = DEFAULT_STATE_ID,
) {
  const { db, secret } = runtime();
  await ensureSchema(db);
  const encrypted = await encryptState({ trades }, secret);
  const updatedAt = new Date().toISOString();

  if (expectedRevision === 0) {
    const result = await db
      .prepare(
        "INSERT OR IGNORE INTO investment_state (id, ciphertext, iv, revision, updated_at) VALUES (?, ?, ?, 1, ?)",
      )
      .bind(stateId, encrypted.ciphertext, encrypted.iv, updatedAt)
      .run();
    if (!result.meta.changes) return null;
    return { revision: 1, updatedAt };
  }

  const result = await db
    .prepare(
      "UPDATE investment_state SET ciphertext = ?, iv = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?",
    )
    .bind(encrypted.ciphertext, encrypted.iv, updatedAt, stateId, expectedRevision)
    .run();
  if (!result.meta.changes) return null;
  return { revision: expectedRevision + 1, updatedAt };
}

export type { TradeRecord };
