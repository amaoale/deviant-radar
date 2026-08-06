"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Stock = { code: string; name: string; exchange: "SH" | "SZ" | "HK"; group: string; price: number; previousClose?: number; change: number; marketCap: number; dividend: number; lower: number; middle?: number; upper: number; bollAsOf?: string; weekBollUpdatedAt?: string; dayLower?: number; dayMiddle?: number; dayUpper?: number; dayBollAsOf?: string; dayBollUpdatedAt?: string; dayRecentCloses?: number[]; monthLower?: number; monthMiddle?: number; monthUpper?: number; monthPreviousMiddle?: number; monthTrend?: "up" | "flat" | "down" | ""; monthBollAsOf?: string; monthBollUpdatedAt?: string; ma250?: number; ma250AsOf?: string; ma250UpdatedAt?: string; ma250Basis?: "raw"; ma250AboveDays?: number; events: { date: string; cash: number }[] };
type Trade = { id: string; code: string; type: "buy" | "sell"; date: string; shares: number };
type LegacyTrade = { id: string; code: string; buyDate: string; sellDate?: string; shares: number; sellShares?: number };
type DividendEvent = { code: string; name: string; cashPer10: number; exDate: string; recordDate: string; noticeDate: string; reportDate: string; status: string; plan: string };

const seed: Stock[] = [
  { code: "600036", name: "招商银行", exchange: "SH", group: "金融", price: 41.82, change: 0.82, marketCap: 10537, dividend: 4.81, lower: 38.10, upper: 46.80, events: [{date:"2025-01-24",cash:1.972},{date:"2025-07-15",cash:1.970}] },
  { code: "601318", name: "中国平安", exchange: "SH", group: "金融", price: 56.26, change: -0.36, marketCap: 10247, dividend: 4.29, lower: 51.20, upper: 62.40, events: [{date:"2025-01-23",cash:0.93},{date:"2025-07-16",cash:0.93},{date:"2025-10-31",cash:0.95}] },
  { code: "600795", name: "国电电力", exchange: "SH", group: "公用事业", price: 4.39, change: 1.15, marketCap: 783, dividend: 3.18, lower: 4.05, upper: 4.92, events: [{date:"2025-06-27",cash:0.11},{date:"2025-12-19",cash:0.03}] },
  { code: "601985", name: "中国核电", exchange: "SH", group: "公用事业", price: 9.42, change: 0.64, marketCap: 1781, dividend: 2.12, lower: 8.76, upper: 10.46, events: [{date:"2025-07-04",cash:0.19}] },
  { code: "003816", name: "中国广核", exchange: "SZ", group: "公用事业", price: 3.72, change: 0.27, marketCap: 1878, dividend: 2.68, lower: 3.48, upper: 4.13, events: [{date:"2025-07-04",cash:0.09}] },
  { code: "000423", name: "东阿阿胶", exchange: "SZ", group: "医药", price: 54.88, change: -1.06, marketCap: 356, dividend: 2.41, lower: 50.14, upper: 62.20, events: [{date:"2025-07-11",cash:1.27}] },
  { code: "600941", name: "中国移动", exchange: "SH", group: "通信", price: 108.42, change: 0.46, marketCap: 23192, dividend: 4.05, lower: 101.00, upper: 117.80, events: [{date:"2025-06-30",cash:2.49},{date:"2025-12-20",cash:2.38}] },
  { code: "601728", name: "中国电信", exchange: "SH", group: "通信", price: 7.52, change: 0.94, marketCap: 6882, dividend: 3.06, lower: 6.96, upper: 8.29, events: [{date:"2025-07-14",cash:0.167}] },
  { code: "601857", name: "中国石油", exchange: "SH", group: "能源", price: 9.21, change: -0.32, marketCap: 16854, dividend: 4.71, lower: 8.69, upper: 10.14, events: [{date:"2025-06-30",cash:0.22},{date:"2025-09-25",cash:0.22},{date:"2025-12-19",cash:0.22}] },
  { code: "600938", name: "中国海油", exchange: "SH", group: "能源", price: 26.78, change: 1.18, marketCap: 12747, dividend: 5.02, lower: 24.80, upper: 29.70, events: [{date:"2025-06-30",cash:0.66},{date:"2025-09-25",cash:0.66}] },
  { code: "601919", name: "中远海控", exchange: "SH", group: "航运", price: 14.12, change: -0.77, marketCap: 2241, dividend: 5.51, lower: 12.70, upper: 16.10, events: [{date:"2025-06-26",cash:0.51},{date:"2025-09-25",cash:0.24}] },
  { code: "000538", name: "云南白药", exchange: "SZ", group: "医药", price: 55.31, change: 0.22, marketCap: 996, dividend: 3.72, lower: 51.21, upper: 61.29, events: [{date:"2025-07-10",cash:2.05}] },
  { code: "000807", name: "云铝股份", exchange: "SZ", group: "有色", price: 16.37, change: 1.05, marketCap: 568, dividend: 2.38, lower: 14.75, upper: 18.43, events: [{date:"2025-06-25",cash:0.16}] },
];

const copyDefaults = {
 heroTitle:"股息雷达",
 strategyEyebrow:"月线定风险 · 周线定位置 · 日线做确认",
 strategyTitle:"网格策略筛选器",
 strategyDescription:"月线只控制风险开关，周线判断价格位置，日线确认执行时点；\n三者各司其职，最终只输出一个操作建议。",
 manualTitle:"查看月线—周线—日线判断说明",
 manualHint:"展开查看判断顺序",
 step1Title:"1 · 基本面与收益率",step1Body:"完整财年分红及周上轨股息率达到门槛，才进入操作判断。",
 step2Title:"2 · 月线风险开关",step2Body:"只输出允许、谨慎或暂停；月中轨下方且中轨下行时暂停加仓。",
 step3Title:"3 · 周线价格位置",step3Body:"判断处于周下轨、中轨或上轨区域，确定买入、等待或不追涨的大方向。",
 step4Title:"4 · 日线执行确认",step4Body:"周下轨区域仍需日线止跌回升才分批买入，避免在下跌过程中直接摊平。",
 bollNotice:"日/周/月 BOLL 均使用最近20根已完成周期的前复权收盘价；日线每日、周线每周、月线每月更新，月中轨变化超过 0.5% 标记为上行或下行。",
 maNote:"MA250 使用不复权价格，保留除权除息价格缺口",
 footnote:"年度股息率按最近一个已完成财年合并中期和年度分红；\n个人股息收入按实际除息日及登记日持仓计算。请以公司公告和券商结算为准。",
 incomeTitle:"股息收入",monthlyTitle:"月度股息",incomeDetailsTitle:"本年度收入明细",upcomingTitle:"即将到来的分红",
 taxNote:"红利税测算采用先进先出：先买入的股份视为先卖出；持股不超过1个月按20%，1个月以上至1年按10%，超过1年暂免。是否取得分红以股权登记日收盘后的持仓为准，结果仅供核对，以中国结算和券商实际结算为准。",
};

function bandSignal(s: Stock) {
 const p=s.price;
 if(!p||!s.lower||!s.upper||s.upper<=s.lower)return "normal";
 const nearLow=p<=s.lower*1.1,nearHigh=p>=s.upper*.9;
 if(nearLow&&nearHigh)return Math.abs(p-s.lower)<=Math.abs(s.upper-p)?"near-low":"near-high";
 if(nearLow)return "near-low";
 if(nearHigh)return "near-high";
 return "normal";
}
function needsWeeklyMaUpdate(stock: Stock) {
 const updatedAt=stock.ma250UpdatedAt?Date.parse(stock.ma250UpdatedAt):0;
 return stock.ma250Basis!=="raw"||!stock.ma250||!updatedAt||Date.now()-updatedAt>=7*24*60*60*1000;
}
function shanghaiDate(value: string | number | Date = Date.now()) {
 return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value));
}
function shanghaiHour() {
 return Number(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Shanghai",hour:"2-digit",hourCycle:"h23"}).format(new Date()));
}
function weekKey(date:string) {
 const value=new Date(`${date}T00:00:00Z`),offset=(value.getUTCDay()+6)%7;
 value.setUTCDate(value.getUTCDate()-offset);
 return value.toISOString().slice(0,10);
}
function needsDailyBollUpdate(stock:Stock) {
 const today=shanghaiDate(),updated=stock.dayBollUpdatedAt?shanghaiDate(stock.dayBollUpdatedAt):"";
 return !stock.dayLower||!stock.dayMiddle||!stock.dayUpper||updated!==today||(shanghaiHour()>=15&&stock.dayBollAsOf!==today);
}
function needsWeeklyBollUpdate(stock:Stock) {
 return !stock.lower||!stock.middle||!stock.upper||!stock.weekBollUpdatedAt||weekKey(shanghaiDate(stock.weekBollUpdatedAt))!==weekKey(shanghaiDate());
}
function needsMonthlyBollUpdate(stock:Stock) {
 return !stock.monthLower||!stock.monthMiddle||!stock.monthUpper||!stock.monthBollUpdatedAt||shanghaiDate(stock.monthBollUpdatedAt).slice(0,7)!==shanghaiDate().slice(0,7);
}
function orderedTrades(trades: Trade[], code: string, through="9999-12-31") {
 return trades.filter(t=>t&&t.code===code&&typeof t.date==="string"&&t.date<=through&&Number(t.shares)>0).sort((a,b)=>a.date.localeCompare(b.date)||(a.type==="buy"?-1:1));
}
function fifoLots(trades: Trade[], code: string, through="9999-12-31") {
 const lots:{date:string;remaining:number}[]=[];
 for(const trade of orderedTrades(trades,code,through)){
  if(trade.type==="buy"){lots.push({date:trade.date,remaining:trade.shares});continue;}
  let left=trade.shares;
  for(const lot of lots){const used=Math.min(lot.remaining,left);lot.remaining-=used;left-=used;if(!left)break;}
 }
 return lots.filter(l=>l.remaining>0);
}
function holdingsAt(trades: Trade[], code: string, date: string) {
 return fifoLots(trades,code,date).reduce((sum,lot)=>sum+lot.remaining,0);
}
function fifoMatches(trades: Trade[], code: string) {
 const lots:{date:string;remaining:number}[]=[],matches:{buyDate:string;sellDate:string;shares:number}[]=[];
 for(const trade of orderedTrades(trades,code)){
  if(trade.type==="buy"){lots.push({date:trade.date,remaining:trade.shares});continue;}
  let left=trade.shares;
  for(const lot of lots){const used=Math.min(lot.remaining,left);if(used){matches.push({buyDate:lot.date,sellDate:trade.date,shares:used});lot.remaining-=used;left-=used;}if(!left)break;}
 }
 return matches;
}
function transactionsValid(trades: Trade[], code: string) {
 let held=0;
 for(const trade of orderedTrades(trades,code)){held+=trade.type==="buy"?trade.shares:-trade.shares;if(held<0)return false;}
 return true;
}
function addCalendarMonths(date:string,months:number){
 const [year,month,day]=date.split("-").map(Number),targetMonth=month-1+months,targetYear=year+Math.floor(targetMonth/12),normalizedMonth=((targetMonth%12)+12)%12;
 const lastDay=new Date(Date.UTC(targetYear,normalizedMonth+1,0)).getUTCDate();
 return `${targetYear}-${String(normalizedMonth+1).padStart(2,"0")}-${String(Math.min(day,lastDay)).padStart(2,"0")}`;
}
function dividendTaxRate(buyDate:string,sellDate:string){
 if(sellDate<=addCalendarMonths(buyDate,1))return .2;
 if(sellDate<=addCalendarMonths(buyDate,12))return .1;
 return 0;
}
function fiscalDividendSummary(events:DividendEvent[],code:string){
 const reported=events.filter(event=>event&&event.code===code&&event.cashPer10>0&&/^\d{4}-\d{2}-\d{2}$/.test(event.reportDate));
 const reportYears=[...new Set(reported.map(event=>event.reportDate.slice(0,4)))].sort((a,b)=>b.localeCompare(a));
 const completeYear=reportYears.find(reportYear=>reported.some(event=>event.reportDate===`${reportYear}-12-31`));
 const fiscalYear=completeYear||reportYears[0]||"";
 const included=fiscalYear?reported.filter(event=>event.reportDate.startsWith(`${fiscalYear}-`)):[];
 return {fiscalYear,cashPer10:included.reduce((sum,event)=>sum+event.cashPer10,0),complete:Boolean(completeYear)};
}
function monthStrategy(stock: Stock) {
 const middle=stock.monthMiddle, trend=stock.monthTrend;
 if(!middle||!trend||!stock.price)return {key:"pending",label:"待判断",detail:"尚无月线 BOLL 数据"};
 if(stock.price<middle&&trend==="down")return {key:"pause",label:"暂停",detail:"月中轨下方 · 中轨下行"};
 if(stock.price<middle)return {key:"cautious",label:"谨慎",detail:`月中轨下方 · 中轨${trend==="up"?"上行":"走平"}`};
 if(trend==="down")return {key:"cautious",label:"谨慎",detail:"月中轨上方 · 中轨下行"};
 return {key:"allow",label:"允许",detail:`月中轨上方 · 中轨${trend==="up"?"上行":"走平"}`};
}
function executionSignal(stock:Stock,monthly:ReturnType<typeof monthStrategy>,qualification:{complete:boolean;upperYield:number;minimumYield:number}){
 const validDay=Boolean(stock.dayLower&&stock.dayMiddle&&stock.dayUpper&&stock.dayUpper>stock.dayLower);
 if(monthly.key==="pending")return {label:"待月线数据",detail:"月线风险开关尚未形成",tone:"pending",day:"日线暂不判断"};
 if(monthly.key==="pause")return {label:"暂停加仓",detail:"月线风险开关已暂停",tone:"pause",day:"不做向下摊平"};
 if(!qualification.complete)return {label:"分红未完整",detail:"最近财年分红尚未完整公告",tone:"pending",day:"日线信号暂不触发交易"};
 if(qualification.upperYield<qualification.minimumYield)return {label:"收益率未达标",detail:`周上轨股息率 ${qualification.upperYield.toFixed(2)}% · 门槛 ${qualification.minimumYield.toFixed(2)}%`,tone:"pending",day:"日线信号暂不触发交易"};
 if(!validDay)return {label:"待日线数据",detail:"刷新后再确认执行时点",tone:"pending",day:"尚无日线 BOLL 数据"};
 const weekly=bandSignal(stock),dayRebound=stock.price<=stock.dayLower!*1.05&&stock.change>0,dayStrong=stock.price>=stock.dayMiddle!&&stock.change>0;
 const day=stock.price<=stock.dayLower!*1.05?`日线下轨附近${stock.change>0?" · 出现回升":" · 尚未止跌"}`:stock.price>=stock.dayUpper!*.95?"日线上轨附近":stock.price>=stock.dayMiddle!?"日线中轨上方":"日线中轨下方";
 if(weekly==="near-high")return {label:"不追涨",detail:"周线上轨区，等待回撤或分批止盈",tone:"wait",day};
 if(weekly==="near-low")return dayRebound?{label:"分批买入",detail:"周线下轨区，日线出现止跌确认",tone:"ready",day}:{label:"等待止跌",detail:"周线下轨区，但日线尚未确认",tone:"watch",day};
 if(stock.middle&&stock.price<=stock.middle&&dayStrong)return {label:"小仓试探",detail:"周中轨下方，日线转强",tone:"watch",day};
 return {label:"持有等待",detail:"周线位于区间中部，暂不追价",tone:"wait",day};
}
function ma250Signal(stock:Stock){
 if(!stock.ma250||stock.ma250Basis!=="raw"||!stock.price)return {key:"none",label:"",detail:""};
 const gap=(stock.ma250-stock.price)/stock.ma250*100;
 const aboveDays=stock.dayRecentCloses?.slice(-3).filter((close)=>close>=stock.ma250!).length??stock.ma250AboveDays??0;
 if(stock.price>=stock.ma250&&aboveDays>=3)return {key:"confirmed",label:"突破确认",detail:"最近3个交易日收盘站上MA250"};
 if(stock.price>=stock.ma250&&stock.previousClose&&stock.previousClose<stock.ma250)return {key:"testing",label:"尝试突破",detail:"上一收盘在MA250下方，现价已经触及或站上"};
 if(stock.price>=stock.ma250)return {key:"testing",label:"站上待确认",detail:"尚未连续3个交易日收盘确认"};
 if(gap<=5&&stock.change>0)return {key:"approaching",label:"接近突破",detail:`距离MA250 ${gap.toFixed(1)}% · 当日上涨`};
 return {key:"none",label:"",detail:""};
}
function normalizeTrades(value:unknown){
 const source=value&&typeof value==="object"&&!Array.isArray(value)&&"trades" in value?(value as {trades:unknown}).trades:value;
 const raw=Array.isArray(source)?source.filter((item):item is Trade|LegacyTrade=>Boolean(item)&&typeof item==="object"&&typeof item.code==="string"):[];
 return raw.flatMap(item=>"type" in item&&("date" in item)&&typeof item.date==="string"&&Number(item.shares)>0
  ?[{...item,shares:Number(item.shares)}]
  :("buyDate" in item&&typeof item.buyDate==="string"&&Number(item.shares)>0
   ?[{id:`${item.id}-buy`,code:item.code,type:"buy" as const,date:item.buyDate,shares:Number(item.shares)},...(item.sellDate&&Number(item.sellShares??item.shares)>0?[{id:`${item.id}-sell`,code:item.code,type:"sell" as const,date:item.sellDate,shares:Number(item.sellShares??item.shares)}]:[])]
   :[]));
}

export default function Home() {
 const [stocks, setStocks] = useState<Stock[]>(seed); const [open, setOpen] = useState(false); const [search, setSearch] = useState(""); const [onlyEligible, setOnlyEligible] = useState(false); const [minimumYield, setMinimumYield] = useState(5); const [updated, setUpdated] = useState(""); const [loading, setLoading] = useState(false);
 const [stockQuery, setStockQuery] = useState("");
 const [addLoading, setAddLoading] = useState(false);
 const [addMessage, setAddMessage] = useState("");
 const [trades, setTrades] = useState<Trade[]>([]);
 const [tradesLoaded, setTradesLoaded] = useState(false);
 const [tradeSaving, setTradeSaving] = useState(false);
 const [cloudRevision, setCloudRevision] = useState(0);
 const [tradeSyncStatus, setTradeSyncStatus] = useState("正在读取云端投资记录…");
 const [tradeForm, setTradeForm] = useState({code:"600036",type:"buy" as "buy"|"sell",date:"",shares:""});
 const [tradeMessage, setTradeMessage] = useState("");
 const [batchText, setBatchText] = useState("");
 const [backupMessage, setBackupMessage] = useState("");
 const [lastBackup, setLastBackup] = useState("");
 const [backupDue, setBackupDue] = useState(false);
 const backupInput = useRef<HTMLInputElement>(null);
 const [dividendEvents, setDividendEvents] = useState<DividendEvent[]>([]);
 const [dividendStatus, setDividendStatus] = useState("正在同步分红公告…");
 const [dividendLoading, setDividendLoading] = useState(false);
 const dividendRequestId = useRef(0);
 useEffect(()=>{ const saved=localStorage.getItem("sovereign-stock-pool"); if(saved){try{const raw=JSON.parse(saved) as unknown;if(Array.isArray(raw)){const valid=raw.filter((item):item is Stock=>Boolean(item)&&typeof item==="object"&&typeof item.code==="string"&&typeof item.name==="string");setStocks(valid);}}catch{setUpdated("本地股票池数据异常 · 已使用默认股票池");}} },[]);
 useEffect(()=>{ localStorage.setItem("sovereign-stock-pool",JSON.stringify(stocks)); },[stocks]);
 useEffect(()=>{const saved=localStorage.getItem("dividend-radar-last-backup")||"";setLastBackup(saved);setBackupDue(!saved||saved.slice(0,7)!==new Date().toISOString().slice(0,7));},[]);
 useEffect(()=>{let cancelled=false;(async()=>{
  let local:Trade[]=[],localRevision=0,pendingCloudSync=false;
  try{
   const saved=localStorage.getItem("dividend-trades-backup-v2")||localStorage.getItem("dividend-trades");
   if(saved){const parsed=JSON.parse(saved) as unknown;local=normalizeTrades(parsed);if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed)){localRevision=Number((parsed as {revision?:unknown}).revision)||0;pendingCloudSync=(parsed as {pendingCloudSync?:unknown}).pendingCloudSync===true;}}
  }catch{setTradeMessage("本地备份格式异常，正在尝试读取云端记录");}
  try{
   const response=await fetch("/api/portfolio",{cache:"no-store"});
   if(!response.ok)throw new Error("cloud unavailable");
   const cloud=await response.json() as {trades:Trade[];revision:number;updatedAt:string};
   let selected=normalizeTrades(cloud.trades),revision=cloud.revision;
   if(revision===0&&local.length){
    const migrated=await fetch("/api/portfolio",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({trades:local,expectedRevision:0})});
    if(!migrated.ok)throw new Error("migration failed");
    const saved=await migrated.json() as {revision:number;updatedAt:string};selected=local;revision=saved.revision;
   }else if(pendingCloudSync){
    let recovered=local;
    if(localRevision!==revision){
     const known=new Set(local.map(item=>item.id));
     recovered=[...local,...selected.filter(item=>!known.has(item.id))];
    }
    const recovery=await fetch("/api/portfolio",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({trades:recovered,expectedRevision:revision})});
    if(!recovery.ok)throw new Error("recovery failed");
    const saved=await recovery.json() as {revision:number;updatedAt:string};selected=recovered;revision=saved.revision;
   }
   if(cancelled)return;
   setTrades(selected);setCloudRevision(revision);setTradeSyncStatus("云端已同步 · 本地双重备份");
   localStorage.setItem("dividend-trades",JSON.stringify(selected));
   localStorage.setItem("dividend-trades-backup-v2",JSON.stringify({version:2,trades:selected,revision,pendingCloudSync:false}));
  }catch{
   if(cancelled)return;
   setTrades(local);setTradeSyncStatus("云端暂不可用 · 已启用本地备份，恢复后会继续同步");
  }finally{if(!cancelled)setTradesLoaded(true);}
 })();return()=>{cancelled=true;};},[]);
 const safeStocks=stocks.filter((s):s is Stock=>Boolean(s)&&typeof s.code==="string");
 const safeTrades=trades.filter((t):t is Trade=>Boolean(t)&&typeof t.code==="string"&&typeof t.date==="string");
 const stockCodes=safeStocks.map(s=>s.code).join(",");
 async function loadDividendData(force=false){
  const requestId=++dividendRequestId.current;
  if(!force){
   try{
    const cached=JSON.parse(localStorage.getItem("dividend-events-cache-v1")||"null") as {codes?:string;events?:DividendEvent[];updatedAt?:string;source?:string;failed?:number;fetchedAt?:number}|null;
    if(cached?.codes===stockCodes&&Array.isArray(cached.events)&&cached.fetchedAt&&Date.now()-cached.fetchedAt<24*60*60*1000){
     setDividendEvents(cached.events);setDividendStatus(`${cached.updatedAt?new Date(cached.updatedAt).toLocaleString("zh-CN",{hour12:false}):"最近缓存"} · ${cached.source||"分红公告缓存"}${cached.failed?` · ${cached.failed}只股票同步失败`:""}`);return;
    }
   }catch{/* 缓存异常时直接重新同步 */}
  }
  setDividendLoading(true);
  try{
   const response=await fetch(`/api/dividends?version=3&codes=${stockCodes}`,{cache:"no-store"});
   if(!response.ok) throw new Error("dividend source unavailable");
   const payload=await response.json() as {events:DividendEvent[];updatedAt:string;failed:number;failedCodes?:string[];source:string};
   if(requestId!==dividendRequestId.current)return;
   const mergedEvents=payload.failedCodes?.length?[...payload.events,...dividendEvents.filter(event=>payload.failedCodes!.includes(event.code))]:payload.events;
   setDividendEvents(mergedEvents);
   setDividendStatus(`${new Date(payload.updatedAt).toLocaleString("zh-CN",{hour12:false})} · ${payload.source}${payload.failed?` · ${payload.failed}只股票同步失败`:""}`);
   localStorage.setItem("dividend-events-cache-v1",JSON.stringify({codes:stockCodes,events:mergedEvents,updatedAt:payload.updatedAt,source:payload.source,failed:payload.failed,fetchedAt:Date.now()}));
  }catch{if(requestId===dividendRequestId.current)setDividendStatus("分红公告暂时无法同步，收入模块保留最近一次有效数据");}
  finally{if(requestId===dividendRequestId.current)setDividendLoading(false);}
 }
 useEffect(()=>{if(stockCodes) void loadDividendData(false);},[stockCodes]);
 async function loadQuotes(){
 try {
   const dayCodes=safeStocks.filter(needsDailyBollUpdate).map(stock=>stock.code).join(",");
   const weekCodes=safeStocks.filter(needsWeeklyBollUpdate).map(stock=>stock.code).join(",");
   const monthCodes=safeStocks.filter(needsMonthlyBollUpdate).map(stock=>stock.code).join(",");
   const maCodes=safeStocks.filter(needsWeeklyMaUpdate).map(stock=>stock.code).join(",");
   const params=new URLSearchParams({codes:stockCodes,dayCodes,weekCodes,monthCodes,maCodes});
   const res=await fetch(`/api/quotes?${params}`,{cache:"no-store"});
   if(!res.ok)throw new Error("quote source unavailable");
   const payload=await res.json() as {quotes:{code:string;price:number;previousClose:number;change:number;lower:number|null;middle:number|null;upper:number|null;bollAsOf:string;weekBollUpdatedAt:string;dayLower:number|null;dayMiddle:number|null;dayUpper:number|null;dayBollAsOf:string;dayBollUpdatedAt:string;dayRecentCloses:number[];monthLower:number|null;monthMiddle:number|null;monthUpper:number|null;monthPreviousMiddle:number|null;monthTrend:"up"|"flat"|"down"|"";monthBollAsOf:string;monthBollUpdatedAt:string;ma250:number|null;ma250AsOf:string;ma250UpdatedAt:string;ma250Basis:"raw"|"";ma250AboveDays:number}[];updatedAt:string;source:string};
   const quotes=new Map(payload.quotes.map(quote=>[quote.code,quote]));
   setStocks(prev=>prev.filter(Boolean).map(s=>{
    const quote=quotes.get(s.code);
    if(!quote)return s;
    return {...s,price:quote.price,previousClose:quote.previousClose,change:quote.change,
     ...(quote.lower!==null?{lower:quote.lower,middle:quote.middle??undefined,upper:quote.upper??0,bollAsOf:quote.bollAsOf,weekBollUpdatedAt:quote.weekBollUpdatedAt}:{}),
     ...(quote.dayLower!==null?{dayLower:quote.dayLower,dayMiddle:quote.dayMiddle??undefined,dayUpper:quote.dayUpper??undefined,dayBollAsOf:quote.dayBollAsOf,dayBollUpdatedAt:quote.dayBollUpdatedAt,dayRecentCloses:quote.dayRecentCloses}:{}),
     ...(quote.monthLower!==null?{monthLower:quote.monthLower,monthMiddle:quote.monthMiddle??undefined,monthUpper:quote.monthUpper??undefined,monthPreviousMiddle:quote.monthPreviousMiddle??undefined,monthTrend:quote.monthTrend,monthBollAsOf:quote.monthBollAsOf,monthBollUpdatedAt:quote.monthBollUpdatedAt}:{}),
     ...(quote.ma250?{ma250:quote.ma250,ma250AsOf:quote.ma250AsOf,ma250UpdatedAt:quote.ma250UpdatedAt,ma250Basis:"raw" as const,ma250AboveDays:quote.ma250AboveDays}:{})};
   }));
   setUpdated(`${payload.updatedAt} · ${payload.source}`);
  } catch { setUpdated("行情接口暂不可用 · 保留最近快照"); }
 }
 async function refresh(){
  setLoading(true);
  await Promise.all([loadQuotes(),loadDividendData()]);
  setLoading(false);
 }
 const strategyRows=useMemo(()=>safeStocks.map(stock=>{const annual=fiscalDividendSummary(dividendEvents,stock.code);const upperYield=stock.upper&&annual.cashPer10?annual.cashPer10/10/stock.upper*100:0;const monthly=monthStrategy(stock);return {stock,annual,upperYield,monthly,eligible:Boolean(annual.complete&&upperYield>=minimumYield&&monthly.key!=="pause"&&monthly.key!=="pending")};}),[safeStocks,dividendEvents,minimumYield]);
 const strategyByCode=useMemo(()=>new Map(strategyRows.map(row=>[row.stock.code,row])),[strategyRows]);
 const list=useMemo(()=>safeStocks.filter(s=>(!onlyEligible || strategyByCode.get(s.code)?.eligible) && `${s.name}${s.code}${s.group}`.includes(search.trim())),[safeStocks,onlyEligible,search,strategyByCode]);
 const eligible=strategyRows.filter(row=>row.eligible).length;
 async function add(){
  const query=stockQuery.trim();
  if(!query){setAddMessage("请输入股票名称或6位代码");return;}
  setAddLoading(true);setAddMessage("正在识别股票…");
  try{
   const response=await fetch(`/api/stock-search?q=${encodeURIComponent(query)}`,{cache:"no-store"});
   const payload=await response.json() as {stock?:{name:string;code:string;exchange:"SH"|"SZ"};message?:string};
   if(!response.ok||!payload.stock) throw new Error(payload.message||"未找到对应的A股股票");
   if(safeStocks.some(s=>s.code===payload.stock!.code)){setAddMessage(`${payload.stock.name} 已在股票池中`);return;}
   setStocks(x=>[...x,{...payload.stock!,group:"自定义",price:0,change:0,marketCap:0,dividend:0,lower:0,middle:0,upper:0,events:[]}]);
   setStockQuery("");setAddMessage(`已添加 ${payload.stock.name}（${payload.stock.code}）`);
  }catch(error){setAddMessage(error instanceof Error?error.message:"添加失败，请稍后重试");}
  finally{setAddLoading(false);}
 }
 async function persistTrades(next:Trade[]){
  setTrades(next);
  setTradeSaving(true);
  try{
   localStorage.setItem("dividend-trades",JSON.stringify(next));
   localStorage.setItem("dividend-trades-backup-v2",JSON.stringify({version:2,trades:next,revision:cloudRevision,pendingCloudSync:true}));
  }catch{setTradeMessage("记录已更新，但当前浏览器无法保存本地备份");}
  try{
   const save=async(records:Trade[],revision:number)=>fetch("/api/portfolio",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({trades:records,expectedRevision:revision})});
   let records=next,response=await save(records,cloudRevision);
   if(response.status===409){
    const latestResponse=await fetch("/api/portfolio",{cache:"no-store"});
    if(!latestResponse.ok)throw new Error("cloud conflict");
    const latest=await latestResponse.json() as {trades:Trade[];revision:number};
    const removed=new Set(safeTrades.filter(previous=>!next.some(item=>item.id===previous.id)).map(item=>item.id));
    const merged=[...normalizeTrades(latest.trades).filter(item=>!removed.has(item.id)),...next.filter(item=>!latest.trades.some(existing=>existing.id===item.id))];
    records=merged;setTrades(records);response=await save(records,latest.revision);
   }
   if(!response.ok)throw new Error("cloud save failed");
   const saved=await response.json() as {revision:number;updatedAt:string};
   setCloudRevision(saved.revision);setTradeSyncStatus(`云端已同步 · ${new Date(saved.updatedAt).toLocaleString("zh-CN",{hour12:false})}`);
   localStorage.setItem("dividend-trades",JSON.stringify(records));
   localStorage.setItem("dividend-trades-backup-v2",JSON.stringify({version:2,trades:records,revision:saved.revision,pendingCloudSync:false}));
   return true;
  }catch{
   setTradeSyncStatus("云端同步失败 · 本地双重备份仍保留，请稍后再次保存");
   return false;
  }finally{setTradeSaving(false);}
 }
 function downloadFile(filename:string,content:string,type:string){
  const url=URL.createObjectURL(new Blob([content],{type})); const anchor=document.createElement("a"); anchor.href=url; anchor.download=filename; anchor.click(); URL.revokeObjectURL(url);
 }
 function exportJson(){
  const exportedAt=new Date().toISOString();
  downloadFile(`股息雷达备份-${exportedAt.slice(0,10)}.json`,JSON.stringify({version:1,exportedAt,stocks:safeStocks,trades:safeTrades},null,2),"application/json;charset=utf-8");
  setLastBackup(exportedAt); localStorage.setItem("dividend-radar-last-backup",exportedAt); setBackupMessage("JSON 备份已下载，请保存到电脑或云盘");
  setBackupDue(false);
 }
 function csvCell(value:string|number){return `"${String(value).replaceAll('"','""')}"`;}
 function exportCsv(){
  const rows=[["股票代码","股票名称","操作","日期","份额"],...safeTrades.map(trade=>{const stock=safeStocks.find(item=>item.code===trade.code);return [trade.code,stock?.name||"",trade.type==="buy"?"买入":"卖出",trade.date,trade.shares];})];
  downloadFile(`股息雷达交易记录-${new Date().toISOString().slice(0,10)}.csv`,rows.map(row=>row.map(csvCell).join(",")).join("\n"),"text/csv;charset=utf-8");
  setBackupMessage("CSV 交易记录已下载");
 }
 async function importJson(file:File){
  try{
   const parsed=JSON.parse(await file.text()) as {trades?:unknown;stocks?:unknown};
   const importedTrades=normalizeTrades(parsed.trades);
   if(!Array.isArray(parsed.trades)||importedTrades.length!==parsed.trades.length||importedTrades.some(item=>!transactionsValid([...importedTrades],item.code)))throw new Error("交易记录格式无效");
   const importedStocks=Array.isArray(parsed.stocks)?parsed.stocks.filter((item):item is Stock=>Boolean(item)&&typeof item==="object"&&typeof (item as Stock).code==="string"&&typeof (item as Stock).name==="string"):[];
   if(importedStocks.length){setStocks(importedStocks);localStorage.setItem("sovereign-stock-pool",JSON.stringify(importedStocks));}
   const cloudSaved=await persistTrades(importedTrades);
   setBackupMessage(`已恢复 ${importedTrades.length} 笔交易${cloudSaved?"并同步云端":"，已保存在本地备份"}`);
  }catch(error){setBackupMessage(error instanceof Error?error.message:"备份文件无法读取");}
  finally{if(backupInput.current)backupInput.current.value="";}
 }
 async function addTrade(){
  const shares=Number(tradeForm.shares);
  if(!tradeForm.code||!tradeForm.date||!shares||shares<=0){setTradeMessage(`请填写${tradeForm.type==="buy"?"买入":"卖出"}日期和份额`);return;}
  const next={id:crypto.randomUUID(),code:tradeForm.code,type:tradeForm.type,date:tradeForm.date,shares};
  if(tradeForm.type==="sell"&&!transactionsValid([...safeTrades,next],tradeForm.code)){setTradeMessage(`卖出份额超过该日期可用持仓（${holdingsAt(safeTrades,tradeForm.code,tradeForm.date)} 股）`);return;}
  const cloudSaved=await persistTrades([...safeTrades,next]);
  setTradeMessage(`${tradeForm.type==="buy"?"买入":"卖出"}记录已保存${cloudSaved?"并同步云端":"到本地备份"}`); setTradeForm(x=>({...x,date:"",shares:""}));
 }
 async function addTradeBatch(){
  const lines=batchText.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  if(!lines.length){setTradeMessage("请先粘贴批量交易记录");return;}
  const parsed:Trade[]=[];
  for(let index=0;index<lines.length;index++){
   const parts=lines[index].split(/[\s,，\t]+/).filter(Boolean);
   const [date,typeText,sharesText]=parts;
   const type=typeText==="买入"||typeText?.toLowerCase()==="buy"?"buy":typeText==="卖出"||typeText?.toLowerCase()==="sell"?"sell":null;
   const shares=Number(sharesText);
   if(parts.length!==3||!/^\d{4}-\d{2}-\d{2}$/.test(date||"")||!type||!Number.isFinite(shares)||shares<=0){
    setTradeMessage(`第 ${index+1} 行格式不正确，请使用：日期 买入/卖出 份额`);
    return;
   }
   parsed.push({id:crypto.randomUUID(),code:tradeForm.code,type,date,shares});
  }
  const signatures=new Set(safeTrades.map(item=>`${item.code}|${item.type}|${item.date}|${item.shares}`));
  const additions=parsed.filter(item=>!signatures.has(`${item.code}|${item.type}|${item.date}|${item.shares}`));
  if(!additions.length){setTradeMessage("这些交易记录已经存在，没有重复写入");return;}
  const next=[...safeTrades,...additions];
  if(!transactionsValid(next,tradeForm.code)){
   setTradeMessage("批量记录中存在卖出份额超过当日可用持仓，请核对顺序和份额");
   return;
  }
  const cloudSaved=await persistTrades(next);
  setBatchText("");
  setTradeMessage(`已批量保存 ${additions.length} 笔记录${parsed.length!==additions.length?`，跳过 ${parsed.length-additions.length} 笔重复记录`:""}${cloudSaved?"并同步云端":"到本地备份"}`);
 }
 const today=new Date().toISOString().slice(0,10), year=new Date().getFullYear();
 const datedEvents=dividendEvents.filter(e=>e&&typeof e.exDate==="string"&&e.exDate.startsWith(`${year}-`)).map(e=>({date:e.exDate,entitlementDate:e.recordDate||e.exDate,cash:e.cashPer10/10,stock:safeStocks.find(s=>s?.code===e.code)!})).filter(e=>e.stock);
 const incomeRows=safeStocks.map(stock=>{
  const owned=safeTrades.filter(t=>t.code===stock.code);
  const value=(pastOnly:boolean)=>datedEvents.filter(e=>e.stock.code===stock.code&&(!pastOnly||e.date<=today)).reduce((sum,e)=>sum+e.cash*holdingsAt(owned,stock.code,e.entitlementDate),0);
  const expected=value(false),received=value(true);
  const tax=fifoMatches(owned,stock.code).filter(match=>match.sellDate<=today).reduce((sum,match)=>sum+datedEvents.filter(e=>e.stock.code===stock.code&&e.entitlementDate>=match.buyDate&&e.entitlementDate<match.sellDate).reduce((eventSum,e)=>eventSum+e.cash*match.shares*dividendTaxRate(match.buyDate,match.sellDate),0),0);
  const currentShares=holdingsAt(owned,stock.code,today);
  const boughtShares=owned.filter(t=>t.type==="buy"&&t.date<=today).reduce((sum,t)=>sum+t.shares,0);
  const soldShares=owned.filter(t=>t.type==="sell"&&t.date<=today).reduce((sum,t)=>sum+t.shares,0);
  const hasFuture=datedEvents.some(e=>e.stock.code===stock.code&&e.date>today&&holdingsAt(owned,stock.code,e.entitlementDate)>0);
  return {stock,expected,received,tax,currentShares,boughtShares,soldShares,status:received>0&&hasFuture?"已发放部分":received>0?"已发放完毕":"未发放"};
 }).filter(r=>safeTrades.some(t=>t.code===r.stock.code));
 const totalExpected=incomeRows.reduce((a,r)=>a+r.expected,0), totalReceived=incomeRows.reduce((a,r)=>a+r.received,0), totalTax=incomeRows.reduce((a,r)=>a+r.tax,0);
 const receivedDetails=datedEvents.filter(e=>e.date<=today).flatMap(e=>{const shares=holdingsAt(safeTrades,e.stock.code,e.entitlementDate),amount=e.cash*shares;return amount?[{...e,shares,amount}]:[]}).sort((a,b)=>b.date.localeCompare(a.date));
 const monthly=Array.from({length:12},(_,m)=>receivedDetails.filter(e=>new Date(e.date).getMonth()===m).reduce((a,e)=>a+e.amount,0));
 const todayIncome=receivedDetails.filter(e=>e.date===today).reduce((a,e)=>a+e.amount,0), monthIncome=monthly[new Date().getMonth()];
 const upcomingCutoff=addCalendarMonths(today,1);
 const upcoming=dividendEvents.filter(e=>
  e.exDate>today&&
  e.exDate<=upcomingCutoff&&
  e.cashPer10>0&&
  Boolean(e.recordDate)&&
  Boolean(e.noticeDate)&&
  e.status.includes("实施")
 ).sort((a,b)=>a.exDate.localeCompare(b.exDate));
 const bollAsOf=safeStocks.map(stock=>stock.bollAsOf||"").filter(Boolean).sort().at(-1)||"";
 const ma250AsOf=safeStocks.map(stock=>stock.ma250AsOf||"").filter(Boolean).sort().at(-1)||"";
 const tradeGroups=safeStocks.map(stock=>{
  const records=safeTrades.filter(trade=>trade.code===stock.code).sort((a,b)=>b.date.localeCompare(a.date)||(a.type==="sell"?-1:1));
  return {stock,records,currentShares:holdingsAt(records,stock.code,today)};
 }).filter(group=>group.records.length);
  return <main data-ui-version="47">
  <section className="hero"><div><h1 className="sectionTitle">{copyDefaults.heroTitle}</h1></div></section>
  <section className="toolbar"><div className="summary"><b>{eligible}</b><span>只股票通过当前网格准入</span></div><label className="search">⌕ <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜索名称、代码或行业" /></label><label className="switch"><input type="checkbox" checked={onlyEligible} onChange={e=>setOnlyEligible(e.target.checked)}/><i/>仅看准入</label><button className="ghost" onClick={()=>setOpen(true)}>管理股票池</button><button className="refresh" onClick={refresh} disabled={loading||dividendLoading}>{loading||dividendLoading?"更新中…":"↻ 刷新数据"}</button></section>
  <section className="strategyGuide"><div><p className="eyebrow">{copyDefaults.strategyEyebrow}</p><h2>{copyDefaults.strategyTitle}</h2><p>{copyDefaults.strategyDescription}</p></div><label>最低周上轨股息率<input aria-label="最低周上轨股息率" type="number" min="0" max="30" step="0.1" value={minimumYield} onChange={e=>setMinimumYield(Math.max(0,Number(e.target.value)||0))}/><span>%</span></label></section>
  <details className="strategyManual"><summary><b>{copyDefaults.manualTitle}</b><span>{copyDefaults.manualHint}</span></summary><div className="strategySteps"><article><b>{copyDefaults.step1Title}</b><p>{copyDefaults.step1Body}</p></article><article><b>{copyDefaults.step2Title}</b><p>{copyDefaults.step2Body}</p></article><article><b>{copyDefaults.step3Title}</b><p>{copyDefaults.step3Body}</p></article><article><b>{copyDefaults.step4Title}</b><p>{copyDefaults.step4Body}</p></article></div></details>
  <div className="notice">{updated&&<><span className="dot"/> <span>{updated}</span><span>·</span></>}<span>{copyDefaults.bollNotice}</span></div>
  <section className="tableWrap"><table><thead><tr><th>股票 / 行业</th><th>实时股价</th><th>年度股息率</th><th>周上轨股息率</th><th className="bollHead">周线 BOLL(20,2){bollAsOf&&<small>截至 {bollAsOf}</small>}</th><th>月线风险开关</th><th>操作建议</th><th>年度分红总额</th><th>MA250（不复权）</th></tr></thead><tbody>{list.map(s=>{const sig=bandSignal(s); const strategy=strategyByCode.get(s.code); const annual=strategy?.annual??fiscalDividendSummary(dividendEvents,s.code); const cashPer10=annual.cashPer10; const realYield=s.price?cashPer10/10/s.price*100:0; const validBand=Boolean(s.lower&&s.middle&&s.upper&&s.upper>s.lower); const bandPosition=validBand?Math.max(4,Math.min(96,(s.price-s.lower)/(s.upper-s.lower)*100)):50; const monthly=strategy?.monthly??monthStrategy(s); const maSignal=ma250Signal(s); const execution=executionSignal(s,monthly,{complete:annual.complete,upperYield:strategy?.upperYield??(s.upper&&cashPer10?cashPer10/10/s.upper*100:0),minimumYield}); return <tr key={s.code} className={sig}><td><b>{s.name}</b><small>{s.exchange}{s.code}{s.group!=="自定义"?` · ${s.group}`:""}</small></td><td><strong className={s.change>=0?"up":"down"}>{s.price?s.price.toFixed(2):"--"}</strong><small className={s.change>=0?"up":"down"}>{s.change>=0?"+":""}{s.change.toFixed(2)}%</small></td><td><b>{dividendLoading?"同步中…":cashPer10?`${realYield.toFixed(2)}%`:"暂无完整数据"}</b>{cashPer10&&!annual.complete&&<small>该财年尚未完整公告</small>}</td><td><b className={strategy?.upperYield&&strategy.upperYield>=minimumYield?"yieldPass":"yieldWait"}>{cashPer10&&s.upper?`${strategy?.upperYield.toFixed(2)}%`:"暂无完整数据"}</b></td><td><div className="bands"><div className="bandValues"><span>下 {validBand?s.lower.toFixed(2):"--"}</span><span>中 {validBand?s.middle!.toFixed(2):"--"}</span><span>上 {validBand?s.upper.toFixed(2):"--"}</span></div><div className="bandTrack">{validBand&&<i style={{left:`${bandPosition}%`}}/>}</div></div><mark className={sig}>{!validBand?"待计算":sig==="near-low"?"接近下轨":sig==="near-high"?"接近上轨":"区间中部"}</mark></td><td><details className="monthTrendFold"><summary><b className={`strategyState ${monthly.key}`}>{monthly.label}</b><span className="detailToggle"><em className="whenClosed">展开</em><em className="whenOpen">收起</em></span></summary><div className="monthTrendDetail"><small>{monthly.detail}</small>{s.monthMiddle&&<small className="monthMiddle">月中轨 {s.monthMiddle.toFixed(2)}</small>}{s.monthLower&&s.monthUpper&&<small>月下 {s.monthLower.toFixed(2)} · 月上 {s.monthUpper.toFixed(2)}</small>}</div></details></td><td><details className="executionFold"><summary><b className={`execution ${execution.tone}`}>{execution.label}</b><span className="detailToggle"><em className="whenClosed">展开</em><em className="whenOpen">收起</em></span></summary><div className="executionDetail"><small>{execution.detail}</small><small>{execution.day}</small>{s.dayLower&&s.dayMiddle&&s.dayUpper&&<small>日下 {s.dayLower.toFixed(2)} · 中 {s.dayMiddle.toFixed(2)} · 上 {s.dayUpper.toFixed(2)}</small>}</div></details></td><td>{cashPer10?`${cashPer10.toFixed(3)} 元/10股`:"暂无完整数据"}{cashPer10&&<small>{annual.fiscalYear} 财年</small>}</td><td>{s.ma250&&s.ma250Basis==="raw"?<><b className={maSignal.key!=="none"?`ma250Signal ${maSignal.key}`:""}>{s.ma250.toFixed(2)}</b>{maSignal.label&&<small className={`ma250SignalNote ${maSignal.key}`}><b>{maSignal.label}</b> · {maSignal.detail}</small>}</>:"点击刷新获取"}</td></tr>})}</tbody></table></section>
  <p className="tableMeta">{copyDefaults.maNote}{ma250AsOf?`；截至 ${ma250AsOf}，每周更新`:"；每周更新"}。</p>
  <p className="footnote">分红数据：{dividendStatus}。{copyDefaults.footnote}</p>
  <section className="incomeSection">
   <div className="incomeHead"><div><h2 className="sectionTitle">{copyDefaults.incomeTitle}</h2></div><span>{year} 年</span></div>
   <div className="incomeCards">
    <article><small>截至目前已收到</small><strong>¥{totalReceived.toFixed(2)}</strong><div className="progress"><i style={{width:`${totalExpected?Math.min(100,totalReceived/totalExpected*100):0}%`}}/></div><em>全年预计 ¥{totalExpected.toFixed(2)}</em></article>
    <article><small>卖出后税后净收入</small><strong>¥{Math.max(0,totalReceived-totalTax).toFixed(2)}</strong><em>卖出触发补扣红利税 ¥{totalTax.toFixed(2)}</em></article>
    <article className="periodCard"><small>分红收入周期</small><div className="periodStats"><div><span>今日</span><b>¥{todayIncome.toFixed(2)}</b></div><div><span>本月</span><b>¥{monthIncome.toFixed(2)}</b></div><div><span>本年</span><b>¥{totalReceived.toFixed(2)}</b></div></div></article>
   </div>
   <div className="tradeForm">
    <select aria-label="股票" value={tradeForm.code} onChange={e=>setTradeForm(current=>({...current,code:e.target.value}))}>{safeStocks.map(s=><option key={s.code} value={s.code}>{s.name} · {s.code}</option>)}</select>
    <label>操作<select aria-label="操作类型" value={tradeForm.type} onChange={e=>{setTradeForm(current=>({...current,type:e.target.value as "buy"|"sell",date:"",shares:""}));setTradeMessage("");}}><option value="buy">买入</option><option value="sell">卖出</option></select></label>
    <label>{tradeForm.type==="buy"?"买入日期":"卖出日期"}<input type="date" max={today} value={tradeForm.date} onChange={e=>setTradeForm(current=>({...current,date:e.target.value}))}/></label>
    <label>{tradeForm.type==="buy"?"买入份额":"卖出份额"}<input type="number" min="1" placeholder="股数" value={tradeForm.shares} onChange={e=>setTradeForm(current=>({...current,shares:e.target.value}))}/></label>
    <button className="refresh" type="button" onClick={addTrade} disabled={!tradesLoaded||tradeSaving}>{tradeSaving?"云端保存中…":`保存${tradeForm.type==="buy"?"买入":"卖出"}`}</button>
   </div>
   <details className="backupPanel">
    <summary><b>数据备份</b><span>{backupDue?"本月尚未备份 · 建议现在下载":lastBackup?`上次备份：${new Date(lastBackup).toLocaleString("zh-CN",{hour12:false})}`:"建议定期下载保存"}</span></summary>
    <div className="backupActions"><p>备份包含股票池和全部买入卖出记录。JSON 可完整恢复，CSV 适合用 Excel 查看。</p>{backupDue&&<div className="backupReminder">本月还没有备份记录，建议下载一份 JSON 文件保存到电脑或云盘。</div>}<div><button className="ghost" type="button" onClick={exportJson}>下载 JSON 备份</button><button className="ghost" type="button" onClick={exportCsv}>下载 CSV</button><button className="refresh" type="button" onClick={()=>backupInput.current?.click()}>导入 JSON 备份</button><input ref={backupInput} type="file" accept="application/json,.json" hidden onChange={event=>{const file=event.target.files?.[0];if(file)void importJson(file);}}/></div>{backupMessage&&<small className="backupMessage">{backupMessage}</small>}</div>
   </details>
   <details className="batchEntry">
    <summary><b>批量录入交易</b><span>适合从截图或表格一次粘贴多笔</span></summary>
    <div><p>当前股票：{safeStocks.find(stock=>stock.code===tradeForm.code)?.name||tradeForm.code}。每行输入“日期　买入/卖出　份额”，例如：2026-07-20 卖出 500。</p><textarea aria-label="批量交易记录" value={batchText} onChange={e=>setBatchText(e.target.value)} placeholder={"2025-09-16 买入 200\n2025-11-25 卖出 400"}/><button className="refresh" type="button" onClick={addTradeBatch} disabled={!tradesLoaded||tradeSaving}>{tradeSaving?"云端保存中…":"批量保存"}</button></div>
   </details>
   {tradeMessage&&<p className="formMessage">{tradeMessage}</p>}
   <p className="syncStatus"><span className="dot"/> {tradeSyncStatus}</p>
   <details className="tradeHistory">
    <summary><b>买入卖出记录</b><span className="detailToggle"><em className="whenClosed">{safeTrades.length} 笔 · 点击展开</em><em className="whenOpen">{safeTrades.length} 笔 · 点击收起</em></span></summary>
    <div className="tradeGroups">{tradeGroups.length?tradeGroups.map(group=><details className="stockTradeGroup" key={group.stock.code}>
     <summary><span><b>{group.stock.name}</b><small>{group.stock.code}</small></span><em>{group.records.length} 笔 · 当前持仓 {group.currentShares} 股</em></summary>
     <div className="tradeList">{group.records.map(t=><div key={t.id}><span>{t.date}　{t.type==="buy"?"买入":"卖出"} {t.shares} 股</span><button type="button" disabled={tradeSaving} onClick={()=>void persistTrades(safeTrades.filter(i=>i.id!==t.id))}>删除</button></div>)}</div>
    </details>):<div className="emptyTrades">{tradesLoaded?"暂无买入卖出记录":"正在读取云端记录…"}</div>}</div>
   </details>
   <details className="tradeHistory incomeOverview">
    <summary><b>各股票股息收入</b><span className="detailToggle"><em className="whenClosed">{incomeRows.length} 只 · 点击展开</em><em className="whenOpen">{incomeRows.length} 只 · 点击收起</em></span></summary>
    <div className="incomeTable"><table><thead><tr><th>股票</th><th>当前持仓</th><th>本年已发放</th><th>卖出补扣税</th><th>税后净收入</th><th>状态</th><th>贡献率</th><th>年度进度</th></tr></thead><tbody>{incomeRows.map(r=><tr key={r.stock.code}><td><b>{r.stock.name}</b><small>{r.stock.code}</small></td><td><b>{r.currentShares} 股</b><small>累计买入 {r.boughtShares} · 卖出 {r.soldShares}</small></td><td>¥{r.received.toFixed(2)}</td><td>{r.tax?`-¥${r.tax.toFixed(2)}`:"¥0.00"}</td><td>¥{Math.max(0,r.received-r.tax).toFixed(2)}</td><td>{r.status}</td><td>{totalReceived?(r.received/totalReceived*100).toFixed(1):"0.0"}%</td><td><div className="progress"><i style={{width:`${r.expected?Math.min(100,r.received/r.expected*100):0}%`}}/></div><small>¥{r.received.toFixed(2)} / ¥{r.expected.toFixed(2)}</small></td></tr>)}</tbody></table></div>
   </details>
   <h3 className="subsectionTitle">{copyDefaults.monthlyTitle}</h3><div className="monthGrid">{monthly.map((v,i)=><div key={i}><small>{i+1}月</small><b>¥{v.toFixed(2)}</b></div>)}</div>
   <details className="batchEntry incomeDetails"><summary><b>{copyDefaults.incomeDetailsTitle}</b><span className="detailToggle"><em className="whenClosed">{receivedDetails.length} 笔 · 点击展开</em><em className="whenOpen">{receivedDetails.length} 笔 · 点击收起</em></span></summary><div><div className="tradeList">{receivedDetails.length?receivedDetails.map(e=><div key={`${e.stock.code}-${e.date}`}><span><b>{e.stock.name}</b>　{e.date}　登记日持仓 {e.shares} 股　每股 ¥{e.cash.toFixed(4)}</span><b>¥{e.amount.toFixed(2)}</b></div>):<div><span>录入持仓后，这里会按股权登记日的实际剩余份额列出收到的分红。</span></div>}</div></div></details>
   <h3 className="subsectionTitle">{copyDefaults.upcomingTitle}</h3><div className="tradeList">{upcoming.length>0?upcoming.map(e=>{const shares=holdingsAt(safeTrades,e.code,e.recordDate);const estimate=e.cashPer10/10*shares;return <div key={`${e.code}-${e.exDate}-${e.cashPer10}`}><span><b>{safeStocks.find(s=>s.code===e.code)?.name||e.name||e.code}</b>　除息日 {e.exDate}　{e.cashPer10.toFixed(3)} 元/10股　登记日 {e.recordDate}</span><b>{shares?`预计 ¥${estimate.toFixed(2)}`:e.status}</b></div>}):<div><span>暂无</span></div>}</div>
   <p className="taxNote">{copyDefaults.taxNote}</p>
  </section>
  {open&&<div className="modal"><div className="panel"><button className="close" onClick={()=>setOpen(false)}>×</button><p className="eyebrow">本地股票池</p><h2>管理监控标的</h2><p>输入股票名称或6位代码，系统会自动识别名称、代码和交易所。修改保存在当前浏览器。</p><div className="add"><input aria-label="股票名称或代码" value={stockQuery} onChange={e=>{setStockQuery(e.target.value);setAddMessage("");}} onKeyDown={e=>{if(e.key==="Enter")void add();}} placeholder="例如：长江电力 或 600900"/><button className="refresh" type="button" onClick={add} disabled={addLoading}>{addLoading?"识别中…":"新增股票"}</button></div>{addMessage&&<p className="formMessage">{addMessage}</p>}<div className="pool">{safeStocks.map(s=><div key={s.code}><span><b>{s.name}</b> {s.exchange}{s.code}</span><button type="button" onClick={()=>setStocks(x=>x.filter(i=>i&&i.code!==s.code))}>删除</button></div>)}</div></div></div>}
 </main>;
}
