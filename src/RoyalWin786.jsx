import { useState, useEffect, useRef, useCallback } from "react";

const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C76A";
const GOLD_DARK = "#8B6914";
const ROYAL_DARK = "#0D0A1A";
const ROYAL_MID = "#160D2E";
const ROYAL_CARD = "#1C1035";
const ROYAL_BORDER = "#2E1F5E";
const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const ADMIN_USER = "admin786";
const ADMIN_PASS = "royal@admin786";

// Lottery games config
const LOTTERIES = [
  { id:"guru", name:"ROYALWIN GURU WEEKLY LOTTERY", drawTime:"13:00", days:[1,3,5], price:10, prizes:[500000,10000,5000,1000,500,100,50] },
  { id:"lotus", name:"ROYALWIN LOTUS WEEKLY LOTTERY", drawTime:"14:00", days:[2,4,6], price:20, prizes:[1000000,20000,10000,2000,1000,200,100] },
  { id:"mangal", name:"ROYALWIN MANGAL WEEKLY LOTTERY", drawTime:"15:00", days:[0,2,4], price:50, prizes:[5000000,50000,25000,5000,2500,500,250] },
];

function getNextDraw(lottery) {
  const now = new Date();
  const [h, m] = lottery.drawTime.split(":").map(Number);
  for (let d = 0; d <= 7; d++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + d);
    candidate.setHours(h, m, 0, 0);
    if (lottery.days.includes(candidate.getDay()) && candidate > now) return candidate;
  }
  return null;
}

const s = {
  app: { minHeight:"100vh", background:`radial-gradient(ellipse at 20% 0%, #1a0a3a 0%, ${ROYAL_DARK} 60%)`, fontFamily:"'Segoe UI', system-ui, sans-serif", color:"#e8e0f0", paddingBottom:60 },
  center: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:"0 16px" },
  authCard: { background:`linear-gradient(135deg, ${ROYAL_CARD} 0%, #170e30 100%)`, border:`1px solid ${ROYAL_BORDER}`, borderRadius:20, padding:"40px 36px", width:"100%", maxWidth:400 },
  logo: { fontSize:30, fontWeight:800, letterSpacing:2, background:`linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 50%, ${GOLD_DARK} 100%)`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", margin:0, textAlign:"center" },
  logoSub: { fontSize:11, letterSpacing:6, color:GOLD, opacity:0.7, marginTop:2, textTransform:"uppercase", textAlign:"center" },
  input: { width:"100%", padding:"12px 14px", borderRadius:10, border:`1px solid ${ROYAL_BORDER}`, background:"rgba(0,0,0,0.3)", color:"#e8e0f0", fontSize:14, outline:"none", marginBottom:12, boxSizing:"border-box" },
  goldBtn: { width:"100%", padding:"13px", borderRadius:10, border:`1px solid ${GOLD_DARK}`, background:`linear-gradient(135deg, ${GOLD_DARK} 0%, ${GOLD} 100%)`, color:"#0D0A1A", fontWeight:800, fontSize:15, cursor:"pointer", letterSpacing:1, boxShadow:`0 4px 20px ${GOLD}44`, marginTop:4 },
  linkBtn: { background:"none", border:"none", color:GOLD, cursor:"pointer", fontSize:13, textDecoration:"underline", marginTop:12, display:"block", width:"100%", textAlign:"center" },
  error: { background:"rgba(220,50,50,0.15)", border:"1px solid #6b1a1a", borderRadius:8, padding:"10px 14px", color:"#e87070", fontSize:13, marginBottom:12 },
  success: { background:"rgba(30,150,80,0.15)", border:"1px solid #1a6b3a", borderRadius:8, padding:"10px 14px", color:"#5ddb8a", fontSize:13, marginBottom:12 },
  label: { fontSize:12, color:GOLD, opacity:0.8, letterSpacing:2, textTransform:"uppercase", marginBottom:6, display:"block" },
  header: { textAlign:"center", padding:"20px 16px 12px", borderBottom:`1px solid ${ROYAL_BORDER}`, background:`linear-gradient(180deg, #1a0838 0%, transparent 100%)` },
  coinBadge: { background:`linear-gradient(135deg, #2a1a00 0%, #3d2800 100%)`, border:`1px solid ${GOLD_DARK}`, borderRadius:20, padding:"5px 14px", fontSize:13, fontWeight:700, color:GOLD },
  panel: { maxWidth:560, margin:"0 auto", padding:"0 14px" },
  card: { background:`linear-gradient(135deg, ${ROYAL_CARD} 0%, #170e30 100%)`, border:`1px solid ${ROYAL_BORDER}`, borderRadius:16, padding:"18px", marginBottom:12 },
  cardTitle: { fontSize:11, fontWeight:700, letterSpacing:3, color:GOLD, opacity:0.8, textTransform:"uppercase", marginBottom:12 },
  actionBtn: (v) => ({ width:"100%", padding:"12px", borderRadius:10, border:`1px solid ${v==="green"?"#1a6b3a":v==="red"?"#6b1a1a":v==="gold"?GOLD_DARK:v==="blue"?"#1a3a6b":ROYAL_BORDER}`, background:v==="green"?"linear-gradient(135deg,#0d3a1e,#1a5c30)":v==="red"?"linear-gradient(135deg,#3a0d0d,#5c1a1a)":v==="gold"?`linear-gradient(135deg,${GOLD_DARK},${GOLD})`:v==="blue"?"linear-gradient(135deg,#0d1a3a,#1a305c)":"rgba(255,255,255,0.05)", color:v==="gold"?"#0D0A1A":v==="green"?"#5ddb8a":v==="red"?"#e87070":v==="blue"?"#70a0e8":"#8070a0", fontWeight:700, fontSize:14, cursor:"pointer", letterSpacing:1, boxShadow:v==="gold"?`0 4px 20px ${GOLD}44`:"none", marginTop:4 }),
  userBar: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 16px", background:"rgba(0,0,0,0.3)", borderBottom:`1px solid ${ROYAL_BORDER}` },
  logoutBtn: { background:"none", border:`1px solid ${ROYAL_BORDER}`, borderRadius:8, color:"#8070a0", padding:"4px 12px", fontSize:12, cursor:"pointer" },
  bottomNav: { position:"fixed", bottom:0, left:0, right:0, background:`linear-gradient(180deg, ${ROYAL_MID} 0%, #0a0518 100%)`, borderTop:`1px solid ${ROYAL_BORDER}`, display:"flex", justifyContent:"space-around", padding:"8px 0 10px", zIndex:100 },
  navBtn: (a) => ({ background:"none", border:"none", color: a ? GOLD : "#6050a0", cursor:"pointer", fontSize:10, fontWeight: a ? 700 : 500, display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"4px 8px" }),
  navIcon: { fontSize:20 },
  timerBox: { background:"rgba(0,0,0,0.4)", border:`1px solid ${ROYAL_BORDER}`, borderRadius:12, padding:"12px 16px", textAlign:"center", marginBottom:10 },
  timerNum: { fontSize:28, fontWeight:900, color:"#e87070", fontVariantNumeric:"tabular-nums" },
  timerLabel: { fontSize:10, color:"#8070a0", letterSpacing:2, textTransform:"uppercase", marginTop:2 },
  lotteryCard: { background:`linear-gradient(135deg, ${ROYAL_CARD} 0%, #170e30 100%)`, border:`1px solid ${ROYAL_BORDER}`, borderRadius:14, padding:"16px", marginBottom:10, cursor:"pointer" },
  badge: (c) => ({ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background: c==="gold"?`${GOLD}22`:c==="green"?"rgba(30,150,80,0.2)":"rgba(55,138,221,0.2)", color: c==="gold"?GOLD:c==="green"?"#5ddb8a":"#70a0e8", border:`1px solid ${c==="gold"?GOLD_DARK:c==="green"?"#1a6b3a":"#1a3a6b"}` }),
  ticketRow: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", border:`1px solid ${ROYAL_BORDER}`, borderRadius:10, marginBottom:8, background:"rgba(0,0,0,0.2)" },
  smInput: { padding:"8px 10px", borderRadius:8, border:`1px solid ${ROYAL_BORDER}`, background:"rgba(0,0,0,0.3)", color:"#e8e0f0", fontSize:13, outline:"none" },
  th: { textAlign:"left", fontSize:11, fontWeight:700, letterSpacing:2, color:GOLD, opacity:0.7, textTransform:"uppercase", padding:"8px 10px", borderBottom:`1px solid ${ROYAL_BORDER}` },
  td: { padding:"9px 10px", borderBottom:`1px solid rgba(46,31,94,0.4)`, fontSize:13, verticalAlign:"middle" },
  prizeRow: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid rgba(46,31,94,0.3)` },
};

function getUsers() { try { return JSON.parse(localStorage.getItem("rw786_users") || "{}"); } catch { return {}; } }
function saveUsers(u) { localStorage.setItem("rw786_users", JSON.stringify(u)); }
function getSession() { return localStorage.getItem("rw786_session") || null; }
function saveSession(u) { localStorage.setItem("rw786_session", u); }
function clearSession() { localStorage.removeItem("rw786_session"); }
function getOrders(user) { try { return JSON.parse(localStorage.getItem(`rw786_orders_${user}`) || "[]"); } catch { return []; } }
function saveOrders(user, o) { localStorage.setItem(`rw786_orders_${user}`, JSON.stringify(o)); }
function getResults() { try { return JSON.parse(localStorage.getItem("rw786_results") || "[]"); } catch { return []; } }
function saveResults(r) { localStorage.setItem("rw786_results", JSON.stringify(r)); }

function genTicketNum() { return String(Math.floor(10000 + Math.random() * 90000)); }
function genSeries() { const s = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; return s[Math.floor(Math.random()*26)] + s[Math.floor(Math.random()*26)]; }

// ===== COUNTDOWN =====
function Countdown({ target }) {
  const [time, setTime] = useState({ h:"00", m:"00", s:"00" });
  useEffect(() => {
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setTime({ h:"00", m:"00", s:"00" }); return; }
      const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
      setTime({ h: String(h).padStart(2,"0"), m: String(m).padStart(2,"0"), s: String(s).padStart(2,"0") });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return (
    <div style={{ display:"flex", justifyContent:"center", gap:8, margin:"8px 0" }}>
      {[["Hour", time.h], ["Minutes", time.m], ["Seconds", time.s]].map(([label, val], i) => (
        <div key={label} style={{ textAlign:"center" }}>
          <div style={s.timerNum}>{val}</div>
          <div style={s.timerLabel}>{label}</div>
          {i < 2 && <div style={{ position:"absolute", fontSize:24, color:"#e87070", marginTop:-46, marginLeft:52 }}>:</div>}
        </div>
      ))}
    </div>
  );
}

// ===== HOME =====
function HomeScreen({ coins, onBuyTicket, onViewResult }) {
  const nextDraws = LOTTERIES.map(l => ({ ...l, next: getNextDraw(l) })).filter(l => l.next).sort((a,b) => a.next - b.next);
  const nearest = nextDraws[0];
  return (
    <div style={s.panel}>
      <div style={{ height:14 }} />
      {nearest && (
        <div style={s.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <span style={s.badge("green")}>⏱ Next Draw</span>
            <span style={{ fontSize:11, color:"#8070a0" }}>Remaining Time</span>
          </div>
          <Countdown target={nearest.next.getTime()} />
          <div style={{ height:1, background:`linear-gradient(90deg, transparent, ${ROYAL_BORDER}, transparent)`, margin:"10px 0" }} />
          <span style={s.badge("gold")}>● Live</span>
          <div style={{ fontWeight:700, color:"#e0d0f0", marginTop:8, fontSize:13 }}>{nearest.name}</div>
          <div style={{ display:"flex", gap:10, marginTop:8 }}>
            <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:8, padding:"6px 12px", fontSize:12, color:"#a090c0" }}>
              📅 {nearest.next.toLocaleDateString("en-IN")}
            </div>
            <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:8, padding:"6px 12px", fontSize:12, color:"#a090c0" }}>
              🕐 {nearest.drawTime}
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10, marginBottom:12 }}>
        {[
          { icon:"🎫", label:"Buy Ticket", action:onBuyTicket, color:"gold" },
          { icon:"🏆", label:"View Result", action:onViewResult, color:"green" },
        ].map(item => (
          <button key={item.label} onClick={item.action} style={{ ...s.actionBtn(item.color), padding:"18px 10px", fontSize:13 }}>
            <div style={{ fontSize:24, marginBottom:4 }}>{item.icon}</div>
            {item.label}
          </button>
        ))}
      </div>

      {LOTTERIES.map(l => {
        const next = getNextDraw(l);
        return (
          <div key={l.id} style={s.lotteryCard} onClick={onBuyTicket}>
            <div style={{ fontWeight:700, fontSize:13, color:"#e0d0f0", marginBottom:6 }}>{l.name}</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <span style={s.badge("gold")}>₹{l.price}/ticket</span>
              <span style={s.badge("green")}>1st Prize: ₹{l.prizes[0].toLocaleString()}</span>
              {next && <span style={s.badge("blue")}>Draw: {next.toLocaleDateString("en-IN")}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===== BUY TICKET =====
function BuyTicketScreen({ coins, setCoins, username }) {
  const [step, setStep] = useState(1);
  const [selLottery, setSelLottery] = useState(null);
  const [qty, setQty] = useState(1);
  const [tickets, setTickets] = useState([]);
  const [msg, setMsg] = useState(null);

  const generate = () => {
    if (!selLottery) return;
    const total = selLottery.price * qty;
    if (coins < total) return setMsg({ type:"error", text:`Not enough coins! Need ${total}, have ${coins}.` });
    const newTickets = Array.from({ length: qty }, () => ({
      id: Date.now() + Math.random(),
      lottery: selLottery.name,
      lotteryId: selLottery.id,
      number: genTicketNum(),
      series: genSeries(),
      price: selLottery.price,
      drawDate: getNextDraw(selLottery)?.toLocaleDateString("en-IN") || "TBD",
      drawTime: selLottery.drawTime,
      purchasedAt: new Date().toLocaleString("en-IN"),
      status: "active",
    }));
    setTickets(newTickets);
    setStep(3);
  };

  const confirm = () => {
    const total = selLottery.price * qty;
    setCoins(c => c - total);
    const orders = getOrders(username);
    const newOrder = {
      id: `ORD${Date.now()}`,
      lottery: selLottery.name,
      lotteryId: selLottery.id,
      tickets,
      total,
      date: new Date().toLocaleString("en-IN"),
      drawDate: tickets[0].drawDate,
      drawTime: selLottery.drawTime,
      status: "active",
    };
    saveOrders(username, [...orders, newOrder]);
    setMsg({ type:"success", text:`${qty} ticket(s) purchased successfully!` });
    setStep(4);
  };

  return (
    <div style={s.panel}>
      <div style={{ height:14 }} />
      {msg && <div style={msg.type==="error" ? s.error : s.success}>{msg.text}</div>}

      {step === 1 && (
        <div style={s.card}>
          <div style={s.cardTitle}>Select Lottery</div>
          {LOTTERIES.map(l => {
            const next = getNextDraw(l);
            return (
              <div key={l.id} onClick={() => { setSelLottery(l); setStep(2); }}
                style={{ ...s.lotteryCard, border:`1px solid ${selLottery?.id===l.id ? GOLD : ROYAL_BORDER}`, marginBottom:10 }}>
                <div style={{ fontWeight:700, fontSize:13, color:"#e0d0f0" }}>{l.name}</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:6 }}>
                  <span style={s.badge("gold")}>₹{l.price}/ticket</span>
                  <span style={s.badge("green")}>1st Prize: ₹{l.prizes[0].toLocaleString()}</span>
                  {next && <span style={s.badge("blue")}>Draw: {next.toLocaleDateString("en-IN")} {l.drawTime}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {step === 2 && selLottery && (
        <div style={s.card}>
          <div style={s.cardTitle}>{selLottery.name}</div>
          <div style={{ fontSize:13, color:"#a090c0", marginBottom:14 }}>Price: <span style={{ color:GOLD, fontWeight:700 }}>₹{selLottery.price}/ticket</span></div>
          <label style={s.label}>Number of Tickets</label>
          <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
            {[1,2,5,10,25,50].map(n => (
              <button key={n} onClick={() => setQty(n)} style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${qty===n ? GOLD : ROYAL_BORDER}`, background: qty===n ? `${GOLD}22` : "rgba(0,0,0,0.2)", color: qty===n ? GOLD : "#a090c0", fontWeight:700, cursor:"pointer", fontSize:13 }}>{n}</button>
            ))}
          </div>
          <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:10, padding:"12px", marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ color:"#8070a0", fontSize:13 }}>Tickets × Price</span>
              <span style={{ color:"#e0d0f0", fontSize:13 }}>{qty} × ₹{selLottery.price}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ color:"#8070a0", fontSize:13 }}>Total</span>
              <span style={{ color:GOLD, fontWeight:800, fontSize:15 }}>₹{selLottery.price * qty}</span>
            </div>
          </div>
          <button style={s.actionBtn("gold")} onClick={generate}>✦ Generate Tickets</button>
          <button style={{ ...s.actionBtn(""), marginTop:6 }} onClick={() => setStep(1)}>← Back</button>
        </div>
      )}

      {step === 3 && (
        <div style={s.card}>
          <div style={s.cardTitle}>Confirm Your Tickets</div>
          <div style={{ maxHeight:300, overflowY:"auto" }}>
            {tickets.map((t, i) => (
              <div key={t.id} style={s.ticketRow}>
                <div>
                  <div style={{ fontSize:11, color:"#6050a0" }}>Ticket #{i+1} • Series {t.series}</div>
                  <div style={{ fontSize:18, fontWeight:900, color:GOLD, letterSpacing:4 }}>{t.number}</div>
                  <div style={{ fontSize:11, color:"#8070a0" }}>Draw: {t.drawDate} {t.drawTime}</div>
                </div>
                <span style={s.badge("gold")}>₹{t.price}</span>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderTop:`1px solid ${ROYAL_BORDER}`, marginTop:8 }}>
            <span style={{ color:"#8070a0" }}>Total Amount</span>
            <span style={{ color:GOLD, fontWeight:800, fontSize:16 }}>₹{selLottery.price * qty}</span>
          </div>
          <button style={s.actionBtn("gold")} onClick={confirm}>✦ Confirm & Pay</button>
          <button style={{ ...s.actionBtn(""), marginTop:6 }} onClick={() => setStep(2)}>← Back</button>
        </div>
      )}

      {step === 4 && (
        <div style={s.card}>
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:40, marginBottom:10 }}>🎉</div>
            <div style={{ fontSize:20, fontWeight:800, color:GOLD }}>Tickets Purchased!</div>
            <div style={{ fontSize:13, color:"#8070a0", marginTop:6 }}>Good luck! Draw results will be announced soon.</div>
          </div>
          {tickets.map((t, i) => (
            <div key={t.id} style={{ ...s.ticketRow, background:`linear-gradient(135deg, #1a0e30 0%, #120a22 100%)` }}>
              <div>
                <div style={{ fontSize:11, color:"#6050a0" }}>{t.lottery}</div>
                <div style={{ fontSize:20, fontWeight:900, color:GOLD, letterSpacing:4 }}>{t.number}</div>
                <div style={{ fontSize:11, color:"#8070a0" }}>Series: {t.series} | Draw: {t.drawDate}</div>
              </div>
            </div>
          ))}
          <button style={{ ...s.actionBtn("gold"), marginTop:10 }} onClick={() => { setStep(1); setSelLottery(null); setQty(1); setTickets([]); setMsg(null); }}>Buy More Tickets</button>
        </div>
      )}
    </div>
  );
}

// ===== ORDER LIST =====
function OrderListScreen({ username }) {
  const [orders, setOrders] = useState([]);
  const [expanded, setExpanded] = useState(null);
  useEffect(() => { setOrders(getOrders(username)); }, [username]);
  if (orders.length === 0) return (
    <div style={s.panel}><div style={{ height:14 }} /><div style={s.card}><div style={{ textAlign:"center", color:"#6050a0", padding:"30px 0" }}><div style={{ fontSize:40 }}>🎫</div><div style={{ marginTop:10 }}>No orders yet. Buy a ticket!</div></div></div></div>
  );
  return (
    <div style={s.panel}>
      <div style={{ height:14 }} />
      {[...orders].reverse().map(order => (
        <div key={order.id} style={s.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", cursor:"pointer" }} onClick={() => setExpanded(expanded===order.id ? null : order.id)}>
            <div>
              <div style={{ fontWeight:700, fontSize:13, color:"#e0d0f0" }}>{order.lottery}</div>
              <div style={{ fontSize:11, color:"#8070a0", marginTop:3 }}>Draw: {order.drawDate} {order.drawTime}</div>
              <div style={{ fontSize:11, color:"#6050a0", marginTop:2 }}>{order.date}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <span style={s.badge("gold")}>₹{order.total}</span>
              <div style={{ fontSize:11, color:"#6050a0", marginTop:4 }}>{order.tickets.length} ticket(s)</div>
            </div>
          </div>
          {expanded === order.id && (
            <div style={{ marginTop:12, borderTop:`1px solid ${ROYAL_BORDER}`, paddingTop:12 }}>
              {order.tickets.map((t, i) => (
                <div key={t.id} style={{ ...s.ticketRow, marginBottom:6 }}>
                  <div>
                    <div style={{ fontSize:11, color:"#6050a0" }}>Ticket #{i+1} | Series: {t.series}</div>
                    <div style={{ fontSize:18, fontWeight:900, color:GOLD, letterSpacing:3 }}>{t.number}</div>
                  </div>
                  <span style={s.badge("green")}>Active</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ===== VERIFY TICKET =====
function VerifyScreen({ username }) {
  const [ticketNum, setTicketNum] = useState("");
  const [result, setResult] = useState(null);
  const verify = () => {
    const orders = getOrders(username);
    let found = null;
    for (const order of orders) {
      for (const t of order.tickets) {
        if (t.number === ticketNum.trim()) { found = { ...t, orderId: order.id, drawDate: order.drawDate }; break; }
      }
      if (found) break;
    }
    setResult(found ? { valid:true, ticket:found } : { valid:false });
  };
  const results = getResults();
  const checkWin = (ticketNum) => results.find(r => r.winners?.includes(ticketNum));

  return (
    <div style={s.panel}>
      <div style={{ height:14 }} />
      <div style={s.card}>
        <div style={s.cardTitle}>Verify Ticket</div>
        <label style={s.label}>Enter Ticket Number</label>
        <input style={s.input} placeholder="e.g. 45823" value={ticketNum} onChange={e => setTicketNum(e.target.value)} maxLength={5} />
        <button style={s.actionBtn("gold")} onClick={verify}>🔍 Verify Ticket</button>
      </div>
      {result && (
        <div style={s.card}>
          {result.valid ? (
            <>
              <div style={{ textAlign:"center", marginBottom:12 }}>
                <div style={{ fontSize:30 }}>✅</div>
                <div style={{ fontWeight:700, color:"#5ddb8a", fontSize:15, marginTop:4 }}>Valid Ticket!</div>
              </div>
              <div style={{ fontSize:20, fontWeight:900, color:GOLD, letterSpacing:4, textAlign:"center", marginBottom:12 }}>{result.ticket.number}</div>
              {[["Lottery", result.ticket.lottery], ["Series", result.ticket.series], ["Draw Date", result.ticket.drawDate], ["Price", `₹${result.ticket.price}`], ["Purchased", result.ticket.purchasedAt]].map(([k,v]) => (
                <div key={k} style={s.prizeRow}><span style={{ color:"#8070a0", fontSize:13 }}>{k}</span><span style={{ color:"#e0d0f0", fontSize:13, fontWeight:600 }}>{v}</span></div>
              ))}
              {checkWin(ticketNum) && <div style={{ ...s.success, marginTop:12 }}>🏆 This ticket is a WINNER!</div>}
            </>
          ) : (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ fontSize:30 }}>❌</div>
              <div style={{ color:"#e87070", fontWeight:700, marginTop:8 }}>Ticket not found in your account.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== VIEW RESULTS =====
function ResultsScreen() {
  const [results, setResults] = useState([]);
  useEffect(() => { setResults(getResults()); }, []);
  if (results.length === 0) return (
    <div style={s.panel}><div style={{ height:14 }} /><div style={s.card}><div style={{ textAlign:"center", color:"#6050a0", padding:"30px 0" }}><div style={{ fontSize:40 }}>📋</div><div style={{ marginTop:10 }}>No results announced yet.</div></div></div></div>
  );
  return (
    <div style={s.panel}>
      <div style={{ height:14 }} />
      {[...results].reverse().map((r, i) => (
        <div key={i} style={s.card}>
          <div style={{ fontWeight:700, fontSize:13, color:"#e0d0f0", marginBottom:4 }}>{r.lottery}</div>
          <div style={{ fontSize:11, color:"#8070a0", marginBottom:10 }}>Draw Date: {r.date}</div>
          {r.prizes.map((prize, pi) => (
            <div key={pi} style={s.prizeRow}>
              <span style={{ color:"#8070a0", fontSize:12 }}>{pi===0?"🥇 1st":pi===1?"🥈 2nd":pi===2?"🥉 3rd":`${pi+1}th`} Prize — ₹{prize.toLocaleString()}</span>
              <span style={{ color:GOLD, fontWeight:800, fontSize:14, letterSpacing:2 }}>{r.winners?.[pi] || "—"}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ===== ROULETTE =====
function RouletteWheel({ spinning, result, onSpinComplete }) {
  const canvasRef = useRef(null);
  const angleRef = useRef(0);
  const draw = useCallback((angle) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cx = 130, cy = 130, r = 122, inner = 38;
    const slots = 37, slice = (2 * Math.PI) / slots;
    ctx.clearRect(0, 0, 260, 260);
    ctx.beginPath(); ctx.arc(cx, cy, r+5, 0, 2*Math.PI); ctx.fillStyle="#1a0838"; ctx.fill(); ctx.strokeStyle=GOLD; ctx.lineWidth=2; ctx.stroke();
    for (let i = 0; i < slots; i++) {
      const start = angle + i*slice, isRed = RED_NUMS.has(i), isGreen = i===0;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start,start+slice); ctx.closePath();
      ctx.fillStyle = isGreen?"#0d3a1e":isRed?"#3a0d0d":"#0d0a1a"; ctx.fill(); ctx.strokeStyle=GOLD_DARK; ctx.lineWidth=0.5; ctx.stroke();
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(start+slice/2); ctx.textAlign="right";
      ctx.fillStyle=isGreen?"#5ddb8a":isRed?"#e87070":"#a090c0"; ctx.font="bold 9px 'Segoe UI',sans-serif"; ctx.fillText(i,r-6,3); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(cx,cy,inner,0,2*Math.PI); ctx.fillStyle=ROYAL_MID; ctx.fill(); ctx.strokeStyle=GOLD; ctx.lineWidth=1.5; ctx.stroke();
    ctx.font="bold 12px 'Segoe UI',sans-serif"; ctx.fillStyle=GOLD; ctx.textAlign="center"; ctx.fillText("786",cx,cy+4);
    ctx.beginPath(); ctx.moveTo(cx,cy-r-2); ctx.lineTo(cx-8,cy-r+14); ctx.lineTo(cx+8,cy-r+14); ctx.closePath(); ctx.fillStyle="#e84444"; ctx.fill();
  }, []);
  useEffect(() => { draw(angleRef.current); }, [draw]);
  useEffect(() => {
    if (!spinning) return;
    const slots=37, slice=(2*Math.PI)/slots, totalRot=Math.PI*2*(10+Math.random()*6), target=totalRot+(result*slice), duration=4500, start=performance.now(), startAngle=angleRef.current;
    function easeOut(t){return 1-Math.pow(1-t,4);}
    function frame(now){const t=Math.min((now-start)/duration,1);angleRef.current=startAngle+target*easeOut(t);draw(angleRef.current);if(t<1)requestAnimationFrame(frame);else onSpinComplete();}
    requestAnimationFrame(frame);
  }, [spinning, result, draw, onSpinComplete]);
  return <canvas ref={canvasRef} width={260} height={260} style={{borderRadius:"50%",display:"block",margin:"0 auto"}}/>;
}

function RouletteScreen({ coins, setCoins }) {
  const [bet, setBet] = useState(0);
  const [betType, setBetType] = useState("red");
  const [exactNum, setExactNum] = useState(7);
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const [resultNum, setResultNum] = useState(0);
  const [history, setHistory] = useState([]);
  const getColor = (n) => n===0?"green":RED_NUMS.has(n)?"red":"black";
  const spin = () => { if(bet===0||spinning||bet>coins)return; setCoins(c=>c-bet); const num=Math.floor(Math.random()*37); setResultNum(num); setSpinResult(null); setSpinning(true); };
  const onSpinComplete = useCallback(() => {
    setSpinning(false);
    const num=resultNum, color=getColor(num);
    let win=betType==="red"?color==="red":betType==="black"?color==="black":betType==="even"?num!==0&&num%2===0:betType==="odd"?num!==0&&num%2!==0:betType==="low"?num>=1&&num<=18:betType==="high"?num>=19&&num<=36:num===exactNum;
    const prize=win?bet*(betType==="number"?35:2):0;
    if(win)setCoins(c=>c+prize);
    setSpinResult({num,color,win,prize});
    setHistory(h=>[{num,color},...h].slice(0,14));
  }, [resultNum,betType,exactNum,bet,setCoins]);
  return (
    <div style={s.panel}>
      <div style={{height:14}}/>
      <div style={s.card}>
        <div style={s.cardTitle}>Roulette Wheel</div>
        <RouletteWheel spinning={spinning} result={resultNum} onSpinComplete={onSpinComplete}/>
        {spinResult&&(<div style={{textAlign:"center",marginTop:12}}><span style={{fontSize:30,fontWeight:900,color:spinResult.color==="red"?"#e87070":spinResult.color==="green"?"#5ddb8a":"#c0b0e0"}}>{spinResult.num}</span><div style={{fontSize:14,fontWeight:700,marginTop:4,color:spinResult.win?"#5ddb8a":"#e87070"}}>{spinResult.win?`You won! +${spinResult.prize} Coins`:`You lost! -${bet} Coins`}</div></div>)}
      </div>
      <div style={s.card}>
        <div style={s.cardTitle}>Place Your Bet</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
          {[10,50,100,200].map((v,i)=>(<button key={v} style={{padding:"6px 14px",borderRadius:20,fontSize:13,fontWeight:700,cursor:"pointer",border:`1px solid ${["#378ADD","#1D9E75",GOLD,"#D85A30"][i]}44`,background:`${["#378ADD","#1D9E75",GOLD,"#D85A30"][i]}18`,color:["#378ADD","#1D9E75",GOLD,"#D85A30"][i]}} onClick={()=>setBet(b=>Math.min(b+v,coins))}>+{v}</button>))}
          <button style={{padding:"6px 14px",borderRadius:20,fontSize:13,fontWeight:700,cursor:"pointer",border:"1px solid #8070a044",background:"#8070a018",color:"#8070a0"}} onClick={()=>setBet(0)}>Clear</button>
        </div>
        <div style={{fontSize:14,color:"#a090c0",marginBottom:12}}>Bet: <span style={{color:GOLD,fontWeight:700}}>{bet} Coins</span></div>
        <select value={betType} onChange={e=>setBetType(e.target.value)} style={{width:"100%",padding:"9px 12px",borderRadius:8,marginBottom:10,background:ROYAL_MID,border:`1px solid ${ROYAL_BORDER}`,color:"#e0d0f0",fontSize:13,outline:"none"}}>
          <option value="red">Red (2x)</option><option value="black">Black (2x)</option><option value="even">Even (2x)</option><option value="odd">Odd (2x)</option><option value="low">Low 1–18 (2x)</option><option value="high">High 19–36 (2x)</option><option value="number">Exact Number (35x)</option>
        </select>
        {betType==="number"&&<input type="number" min={0} max={36} value={exactNum} onChange={e=>setExactNum(parseInt(e.target.value))} style={{width:"100%",padding:"9px 12px",borderRadius:8,marginBottom:10,background:ROYAL_MID,border:`1px solid ${ROYAL_BORDER}`,color:"#e0d0f0",fontSize:13,outline:"none"}}/>}
        <button style={s.actionBtn("gold")} onClick={spin} disabled={spinning||bet===0}>{spinning?"Spinning...":"◈ Spin Now!"}</button>
      </div>
      {history.length>0&&(<div style={s.card}><div style={s.cardTitle}>Recent Results</div><div style={{display:"flex",flexWrap:"wrap"}}>{history.map((h,i)=><span key={i} style={{borderRadius:6,padding:"3px 9px",fontSize:12,fontWeight:700,background:h.color==="red"?"#3a100a":h.color==="green"?"#0a2a12":"#1a1a2e",color:h.color==="red"?"#e87070":h.color==="green"?"#5ddb8a":"#a090c0",border:`1px solid ${h.color==="red"?"#6b1a1a":h.color==="green"?"#1a6b3a":ROYAL_BORDER}`,marginRight:5,marginBottom:5}}>{h.num}</span>)}</div></div>)}
    </div>
  );
}

// ===== ADMIN =====
function AdminPanel({ onLogout }) {
  const [users, setUsers] = useState({});
  const [coinInputs, setCoinInputs] = useState({});
  const [msg, setMsg] = useState(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("users");
  const [resultForm, setResultForm] = useState({ lotteryId:"guru", winners:["","","","","","",""] });
  const refresh = () => setUsers(getUsers());
  useEffect(()=>{ refresh(); },[]);
  const showMsg=(text,type="success")=>{ setMsg({text,type}); setTimeout(()=>setMsg(null),2500); };
  const addCoins=(username)=>{ const amt=parseInt(coinInputs[username]||0); if(!amt||isNaN(amt))return showMsg("Enter valid amount!","error"); const u=getUsers(); u[username].coins=(u[username].coins||0)+amt; saveUsers(u); setCoinInputs(p=>({...p,[username]:""})); refresh(); showMsg(`+${amt} coins added to ${username}`); };
  const removeCoins=(username)=>{ const amt=parseInt(coinInputs[username]||0); if(!amt||isNaN(amt))return showMsg("Enter valid amount!","error"); const u=getUsers(); u[username].coins=Math.max(0,(u[username].coins||0)-amt); saveUsers(u); setCoinInputs(p=>({...p,[username]:""})); refresh(); showMsg(`-${amt} coins removed from ${username}`); };
  const banUser=(username)=>{ if(!window.confirm(`Ban "${username}"?`))return; const u=getUsers(); delete u[username]; saveUsers(u); refresh(); showMsg(`${username} banned.`); };
  const announceResult=()=>{
    const lottery=LOTTERIES.find(l=>l.id===resultForm.lotteryId);
    if(!lottery)return;
    const results=getResults();
    results.push({ lottery:lottery.name, lotteryId:lottery.id, date:new Date().toLocaleDateString("en-IN"), prizes:lottery.prizes, winners:resultForm.winners });
    saveResults(results);
    showMsg("Result announced successfully!");
  };
  const totalUsers=Object.keys(users).length;
  const totalCoins=Object.values(users).reduce((s,u)=>s+(u.coins||0),0);
  const filtered=Object.entries(users).filter(([k])=>k.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={{...s.app}}>
      <div style={{background:`linear-gradient(135deg,#1a0030,#0d0020)`,borderBottom:`1px solid #4a1060`,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,background:`linear-gradient(135deg,${GOLD_LIGHT},${GOLD})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>⚙ Admin Panel</div>
          <div style={{fontSize:10,color:"#8060a0",letterSpacing:2}}>ROYALWIN786 SUPER ADMIN</div>
        </div>
        <button style={s.logoutBtn} onClick={onLogout}>Logout</button>
      </div>
      <div style={{maxWidth:900,margin:"0 auto",padding:"16px"}}>
        {msg&&<div style={msg.type==="error"?s.error:s.success}>{msg.text}</div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
          {[[totalUsers,"TOTAL USERS",GOLD],[totalCoins.toLocaleString(),"TOTAL COINS","#5ddb8a"],[totalUsers>0?Math.round(totalCoins/totalUsers):0,"AVG COINS","#378ADD"]].map(([v,l,c])=>(
            <div key={l} style={{background:"rgba(0,0,0,0.2)",border:`1px solid ${ROYAL_BORDER}`,borderRadius:12,padding:"14px",textAlign:"center"}}>
              <div style={{fontSize:24,fontWeight:800,color:c}}>{v}</div>
              <div style={{fontSize:10,color:"#8070a0",letterSpacing:2,marginTop:4}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {[["users","👥 Users"],["results","🏆 Announce Result"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{padding:"8px 18px",borderRadius:8,border:`1px solid ${tab===id?GOLD_DARK:ROYAL_BORDER}`,background:tab===id?`${GOLD}22`:"transparent",color:tab===id?GOLD:"#8070a0",fontWeight:700,cursor:"pointer",fontSize:13}}>{label}</button>
          ))}
        </div>
        {tab==="users"&&(
          <div style={s.card}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div style={s.cardTitle}>All Users</div>
              <input style={{...s.smInput,width:180}} placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            {filtered.length===0?<div style={{color:"#6050a0",fontSize:13,textAlign:"center",padding:"20px"}}>No users found.</div>:(
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>{["Username","Name","Coins","Manage","Action"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filtered.map(([username,data])=>(
                      <tr key={username}>
                        <td style={s.td}><span style={{color:GOLD,fontWeight:700}}>{username}</span></td>
                        <td style={s.td}><span style={{color:"#c0b0e0"}}>{data.name||"—"}</span></td>
                        <td style={s.td}><span style={{color:"#5ddb8a",fontWeight:700}}>{(data.coins||0).toLocaleString()}</span></td>
                        <td style={s.td}>
                          <input style={{...s.smInput,width:70}} type="number" placeholder="Amt" value={coinInputs[username]||""} onChange={e=>setCoinInputs(p=>({...p,[username]:e.target.value}))}/>
                          <button onClick={()=>addCoins(username)} style={{padding:"5px 10px",borderRadius:7,border:"1px solid #1a6b3a",background:"#0d3a1e",color:"#5ddb8a",fontWeight:700,fontSize:12,cursor:"pointer",marginLeft:4}}>+</button>
                          <button onClick={()=>removeCoins(username)} style={{padding:"5px 10px",borderRadius:7,border:"1px solid #6b1a1a",background:"#3a0d0d",color:"#e87070",fontWeight:700,fontSize:12,cursor:"pointer",marginLeft:4}}>−</button>
                        </td>
                        <td style={s.td}><button onClick={()=>banUser(username)} style={{padding:"5px 10px",borderRadius:7,border:"1px solid #6b1a1a",background:"#3a0d0d",color:"#e87070",fontWeight:700,fontSize:12,cursor:"pointer"}}>🚫 Ban</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {tab==="results"&&(
          <div style={s.card}>
            <div style={s.cardTitle}>Announce Draw Result</div>
            <label style={s.label}>Select Lottery</label>
            <select value={resultForm.lotteryId} onChange={e=>setResultForm(p=>({...p,lotteryId:e.target.value}))} style={{width:"100%",padding:"9px 12px",borderRadius:8,marginBottom:12,background:ROYAL_MID,border:`1px solid ${ROYAL_BORDER}`,color:"#e0d0f0",fontSize:13,outline:"none"}}>
              {LOTTERIES.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            {LOTTERIES.find(l=>l.id===resultForm.lotteryId)?.prizes.map((prize,i)=>(
              <div key={i} style={{marginBottom:10}}>
                <label style={s.label}>{i===0?"🥇 1st":i===1?"🥈 2nd":i===2?"🥉 3rd":`${i+1}th`} Prize — ₹{prize.toLocaleString()}</label>
                <input style={s.input} placeholder="Winning ticket number" value={resultForm.winners[i]||""} onChange={e=>{ const w=[...resultForm.winners]; w[i]=e.target.value; setResultForm(p=>({...p,winners:w})); }}/>
              </div>
            ))}
            <button style={s.actionBtn("gold")} onClick={announceResult}>🏆 Announce Result</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== AUTH =====
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState(null);
  const submit = () => {
    setMsg(null);
    if(!user.trim()||!pass.trim()) return setMsg({type:"error",text:"Please fill all fields!"});
    if(user===ADMIN_USER&&pass===ADMIN_PASS){ saveSession("__admin__"); onLogin("__admin__",{name:"Admin",coins:0,isAdmin:true}); return; }
    const users=getUsers();
    if(mode==="signup"){
      if(user===ADMIN_USER) return setMsg({type:"error",text:"Username reserved!"});
      if(users[user]) return setMsg({type:"error",text:"Username taken!"});
      if(pass.length<6) return setMsg({type:"error",text:"Password min 6 characters!"});
      users[user]={pass,name:name||user,coins:1000};
      saveUsers(users); saveSession(user);
      setMsg({type:"success",text:"Account created! Welcome!"});
      setTimeout(()=>onLogin(user,users[user]),700);
    } else {
      if(!users[user]) return setMsg({type:"error",text:"Username not found!"});
      if(users[user].pass!==pass) return setMsg({type:"error",text:"Incorrect password!"});
      saveSession(user); onLogin(user,users[user]);
    }
  };
  return (
    <div style={s.center}>
      <div style={s.authCard}>
        <h1 style={s.logo}>ROYALWIN786</h1>
        <div style={s.logoSub}>Premium Gaming Experience</div>
        <div style={{height:24}}/>
        <div style={{fontSize:17,fontWeight:700,color:GOLD,textAlign:"center",marginBottom:18}}>{mode==="login"?"Welcome Back":"Create Account"}</div>
        {msg&&<div style={msg.type==="error"?s.error:s.success}>{msg.text}</div>}
        {mode==="signup"&&<><label style={s.label}>Full Name</label><input style={s.input} placeholder="e.g. Raj Sharma" value={name} onChange={e=>setName(e.target.value)}/></>}
        <label style={s.label}>Username</label>
        <input style={s.input} placeholder="Enter username" value={user} onChange={e=>setUser(e.target.value)}/>
        <label style={s.label}>Password</label>
        <input style={s.input} placeholder="Enter password" type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
        <button style={s.goldBtn} onClick={submit}>{mode==="login"?"✦ Login":"✦ Create Account"}</button>
        <button style={s.linkBtn} onClick={()=>{setMode(mode==="login"?"signup":"login");setMsg(null);}}>{mode==="login"?"Don't have an account? Sign Up":"Already have an account? Login"}</button>
      </div>
    </div>
  );
}

// ===== MAIN APP =====
export default function RoyalWin786() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [screen, setScreen] = useState("home");

  useEffect(() => {
    const sess=getSession();
    if(sess==="__admin__"){setUser("__admin__");setUserData({name:"Admin",coins:0,isAdmin:true});return;}
    if(sess){const users=getUsers();if(users[sess]){setUser(sess);setUserData(users[sess]);}}
  }, []);

  const handleLogin=(username,data)=>{setUser(username);setUserData(data);};
  const setCoins=(fn)=>{
    setUserData(prev=>{
      const newCoins=typeof fn==="function"?fn(prev.coins):fn;
      const users=getUsers(); users[user].coins=newCoins; saveUsers(users);
      return {...prev,coins:newCoins};
    });
  };
  const logout=()=>{clearSession();setUser(null);setUserData(null);setScreen("home");};

  if(!user) return <AuthScreen onLogin={handleLogin}/>;
  if(userData?.isAdmin) return <AdminPanel onLogout={logout}/>;

  const NAV=[
    {id:"home",icon:"🏠",label:"Home"},
    {id:"buy",icon:"🎫",label:"Buy Ticket"},
    {id:"orders",icon:"📋",label:"My Orders"},
    {id:"verify",icon:"🔍",label:"Verify"},
    {id:"results",icon:"🏆",label:"Results"},
    {id:"roulette",icon:"🎰",label:"Roulette"},
  ];

  return (
    <div style={s.app}>
      <div style={s.userBar}>
        <span style={{fontSize:12,color:"#a090c0"}}>👤 <span style={{color:GOLD,fontWeight:700}}>{userData.name||user}</span></span>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={s.coinBadge}>✦ {(userData.coins||0).toLocaleString()} Coins</span>
          <button style={s.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </div>
      <div style={s.header}>
        <h1 style={s.logo}>ROYALWIN786</h1>
        <div style={s.logoSub}>Premium Gaming Experience</div>
      </div>

      {screen==="home"&&<HomeScreen coins={userData.coins||0} onBuyTicket={()=>setScreen("buy")} onViewResult={()=>setScreen("results")}/>}
      {screen==="buy"&&<BuyTicketScreen coins={userData.coins||0} setCoins={setCoins} username={user}/>}
      {screen==="orders"&&<OrderListScreen username={user}/>}
      {screen==="verify"&&<VerifyScreen username={user}/>}
      {screen==="results"&&<ResultsScreen/>}
      {screen==="roulette"&&<RouletteScreen coins={userData.coins||0} setCoins={setCoins}/>}

      <div style={s.bottomNav}>
        {NAV.map(n=>(
          <button key={n.id} style={s.navBtn(screen===n.id)} onClick={()=>setScreen(n.id)}>
            <span style={s.navIcon}>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </div>
    </div>
  );
}
