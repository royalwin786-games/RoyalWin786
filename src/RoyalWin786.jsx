import { useState, useEffect, useRef, useCallback } from "react";

// ===== THEME =====
const C = {
  bg: "#F0F4F8",
  white: "#FFFFFF",
  primary: "#2196F3",
  primaryDark: "#1565C0",
  primaryLight: "#E3F2FD",
  accent: "#FF9800",
  accentLight: "#FFF3E0",
  success: "#4CAF50",
  successLight: "#E8F5E9",
  danger: "#F44336",
  dangerLight: "#FFEBEE",
  gold: "#F9A825",
  goldLight: "#FFF8E1",
  text: "#1A1A2E",
  textSec: "#5C6B8A",
  textMuted: "#9EA8BA",
  border: "#DDE3ED",
  shadow: "0 2px 12px rgba(33,150,243,0.08)",
  shadowMd: "0 4px 20px rgba(33,150,243,0.13)",
  cardRadius: 16,
  btnRadius: 30,
};

const LOTTERIES = [
  { id:"guru", name:"ROYALWIN GURU WEEKLY", drawTime:"13:00", days:[1,3,5], price:10, code:"1230", prizes:[500000,10000,5000,1000,500,100,50] },
  { id:"lotus", name:"ROYALWIN LOTUS WEEKLY", drawTime:"14:00", days:[2,4,6], price:20, code:"1223", prizes:[1000000,20000,10000,2000,1000,200,100] },
  { id:"mangal", name:"ROYALWIN MANGAL WEEKLY", drawTime:"15:00", days:[0,2,4], price:50, code:"1233", prizes:[5000000,50000,25000,5000,2500,500,250] },
];

const ADMIN_USER = "admin786";
const ADMIN_PASS = "royal@admin786";

function getNextDraw(lottery) {
  const now = new Date();
  const [h, m] = lottery.drawTime.split(":").map(Number);
  for (let d = 0; d <= 7; d++) {
    const c = new Date(now); c.setDate(now.getDate()+d); c.setHours(h,m,0,0);
    if (lottery.days.includes(c.getDay()) && c > now) return c;
  }
  return null;
}

function getUsers() { try { return JSON.parse(localStorage.getItem("rw786_users")||"{}"); } catch { return {}; } }
function saveUsers(u) { localStorage.setItem("rw786_users", JSON.stringify(u)); }
function getSession() { return localStorage.getItem("rw786_session")||null; }
function saveSession(u) { localStorage.setItem("rw786_session", u); }
function clearSession() { localStorage.removeItem("rw786_session"); }
function getOrders(user) { try { return JSON.parse(localStorage.getItem(`rw786_orders_${user}`)||"[]"); } catch { return []; } }
function saveOrders(user, o) { localStorage.setItem(`rw786_orders_${user}`, JSON.stringify(o)); }
function getResults() { try { return JSON.parse(localStorage.getItem("rw786_results")||"[]"); } catch { return []; } }
function saveResults(r) { localStorage.setItem("rw786_results", JSON.stringify(r)); }
function genTicketNum() { return String(Math.floor(10000+Math.random()*90000)); }
function genSeries() { const s="ABCDEFGHIJKLMNOPQRSTUVWXYZ"; return s[Math.floor(Math.random()*26)]+s[Math.floor(Math.random()*26)]; }

// ===== STYLES =====
const g = {
  app: { minHeight:"100vh", background:C.bg, fontFamily:"'Segoe UI',system-ui,sans-serif", color:C.text, paddingBottom:70 },
  card: { background:C.white, borderRadius:C.cardRadius, padding:"16px", marginBottom:12, boxShadow:C.shadow, border:`1px solid ${C.border}` },
  panel: { maxWidth:480, margin:"0 auto", padding:"0 14px" },
  header: { background:C.white, padding:"14px 16px 0", boxShadow:"0 1px 8px rgba(0,0,0,0.06)", marginBottom:0 },
  logoImg: { width:52, height:52, borderRadius:14, background:`linear-gradient(135deg, #2196F3, #FF9800)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, margin:"0 auto 6px" },
  logoText: { fontSize:22, fontWeight:800, color:C.text, textAlign:"center", letterSpacing:1 },
  logoSub: { fontSize:12, color:C.textSec, textAlign:"center", marginBottom:4 },
  primaryBtn: { width:"100%", padding:"14px", borderRadius:C.btnRadius, border:"none", background:`linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, color:C.white, fontWeight:700, fontSize:15, cursor:"pointer", boxShadow:`0 4px 14px ${C.primary}44`, letterSpacing:0.5 },
  outlineBtn: { width:"100%", padding:"13px", borderRadius:C.btnRadius, border:`2px solid ${C.primary}`, background:C.white, color:C.primary, fontWeight:700, fontSize:15, cursor:"pointer" },
  input: { width:"100%", padding:"13px 16px", borderRadius:12, border:`1.5px solid ${C.border}`, background:C.white, color:C.text, fontSize:14, outline:"none", boxSizing:"border-box", marginBottom:12 },
  label: { fontSize:12, fontWeight:600, color:C.textSec, letterSpacing:0.5, marginBottom:5, display:"block" },
  error: { background:C.dangerLight, border:`1px solid #EF9A9A`, borderRadius:10, padding:"10px 14px", color:C.danger, fontSize:13, marginBottom:12 },
  success: { background:C.successLight, border:`1px solid #A5D6A7`, borderRadius:10, padding:"10px 14px", color:"#2E7D32", fontSize:13, marginBottom:12 },
  badge: (type) => ({ display:"inline-flex", alignItems:"center", gap:4, padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:700,
    background: type==="blue"?C.primaryLight:type==="green"?C.successLight:type==="orange"?C.accentLight:type==="red"?C.dangerLight:C.goldLight,
    color: type==="blue"?C.primary:type==="green"?C.success:type==="orange"?C.accent:type==="red"?C.danger:C.gold,
  }),
  bottomNav: { position:"fixed", bottom:0, left:0, right:0, background:C.white, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-around", padding:"6px 0 8px", zIndex:100, boxShadow:"0 -2px 12px rgba(0,0,0,0.06)" },
  navBtn: (a) => ({ background:"none", border:"none", color:a?C.primary:C.textMuted, cursor:"pointer", fontSize:9, fontWeight:a?700:500, display:"flex", flexDirection:"column", alignItems:"center", gap:2, padding:"4px 6px" }),
  timerNum: { fontSize:32, fontWeight:900, color:C.danger, fontVariantNumeric:"tabular-nums", lineHeight:1 },
  timerLabel: { fontSize:9, color:C.textMuted, letterSpacing:1, textTransform:"uppercase", marginTop:2 },
  sectionTitle: { fontSize:13, fontWeight:700, color:C.text, marginBottom:10 },
  divider: { height:1, background:C.border, margin:"12px 0" },
  lotteryCard: { background:C.white, borderRadius:C.cardRadius, padding:"14px", marginBottom:10, boxShadow:C.shadow, border:`1px solid ${C.border}`, cursor:"pointer" },
  ticketCard: { background:`linear-gradient(135deg, #1565C0, #0D47A1)`, borderRadius:14, padding:"16px", marginBottom:10, color:C.white },
  menuGrid: { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:14 },
  menuItem: { background:C.white, borderRadius:14, padding:"14px 8px", textAlign:"center", cursor:"pointer", boxShadow:C.shadow, border:`1px solid ${C.border}` },
  menuIcon: { fontSize:24, marginBottom:6 },
  menuLabel: { fontSize:10, fontWeight:600, color:C.textSec },
  qtyBtn: (sel) => ({ padding:"8px 16px", borderRadius:20, border:`1.5px solid ${sel?C.primary:C.border}`, background:sel?C.primaryLight:C.white, color:sel?C.primary:C.textSec, fontWeight:700, cursor:"pointer", fontSize:13 }),
  smBtn: (type) => ({ padding:"6px 12px", borderRadius:8, border:`1px solid ${type==="green"?"#A5D6A7":type==="red"?"#EF9A9A":C.border}`, background:type==="green"?C.successLight:type==="red"?C.dangerLight:C.white, color:type==="green"?C.success:type==="red"?C.danger:C.textSec, fontWeight:700, fontSize:12, cursor:"pointer", marginLeft:4 }),
  th: { textAlign:"left", fontSize:11, fontWeight:700, color:C.textMuted, textTransform:"uppercase", letterSpacing:1, padding:"8px 10px", borderBottom:`1px solid ${C.border}` },
  td: { padding:"10px", borderBottom:`1px solid ${C.border}`, fontSize:13, verticalAlign:"middle" },
  prizeRow: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${C.border}` },
  userBar: { background:C.white, padding:"8px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" },
  logoutBtn: { background:"none", border:`1px solid ${C.border}`, borderRadius:8, color:C.textSec, padding:"5px 12px", fontSize:12, cursor:"pointer" },
};

// ===== COUNTDOWN =====
function Countdown({ target }) {
  const [t, setT] = useState({ h:"00", m:"00", s:"00" });
  useEffect(() => {
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setT({ h:"00", m:"00", s:"00" }); return; }
      const h=Math.floor(diff/3600000), m=Math.floor((diff%3600000)/60000), s=Math.floor((diff%60000)/1000);
      setT({ h:String(h).padStart(2,"0"), m:String(m).padStart(2,"0"), s:String(s).padStart(2,"0") });
    };
    tick(); const id=setInterval(tick,1000); return ()=>clearInterval(id);
  }, [target]);
  return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"flex-end", gap:4 }}>
      {[["Hour",t.h],["Minutes",t.m],["Seconds",t.s]].map(([label,val],i)=>(
        <div key={label} style={{ display:"flex", alignItems:"flex-end", gap:4 }}>
          <div style={{ textAlign:"center" }}>
            <div style={g.timerNum}>{val}</div>
            <div style={g.timerLabel}>{label}</div>
          </div>
          {i<2&&<div style={{ fontSize:28, fontWeight:900, color:C.danger, marginBottom:14, lineHeight:1 }}>:</div>}
        </div>
      ))}
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
    if (!user.trim()||!pass.trim()) return setMsg({type:"error",text:"Please fill all fields!"});
    if (user===ADMIN_USER&&pass===ADMIN_PASS) { saveSession("__admin__"); onLogin("__admin__",{name:"Admin",coins:0,isAdmin:true}); return; }
    const users = getUsers();
    if (mode==="signup") {
      if (user===ADMIN_USER) return setMsg({type:"error",text:"Username reserved!"});
      if (users[user]) return setMsg({type:"error",text:"Username already taken!"});
      if (pass.length<6) return setMsg({type:"error",text:"Password min 6 characters!"});
      users[user]={pass,name:name||user,coins:1000};
      saveUsers(users); saveSession(user);
      setTimeout(()=>onLogin(user,users[user]),600);
      return setMsg({type:"success",text:"Account created! Welcome!"});
    } else {
      if (!users[user]) return setMsg({type:"error",text:"Username not found!"});
      if (users[user].pass!==pass) return setMsg({type:"error",text:"Incorrect password!"});
      saveSession(user); onLogin(user,users[user]);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(160deg, #E3F2FD 0%, #F0F4F8 50%, #FFF8E1 100%)`, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ ...g.logoImg, width:72, height:72, borderRadius:20, fontSize:32, margin:"0 auto 12px", boxShadow:`0 8px 24px ${C.primary}33` }}>🎰</div>
          <div style={{ fontSize:28, fontWeight:800, color:C.text }}>RoyalWin786</div>
          <div style={{ fontSize:12, color:C.textSec, marginTop:2, letterSpacing:1 }}>Premium Gaming Platform</div>
        </div>
        <div style={{ ...g.card, borderRadius:20, padding:"28px 24px" }}>
          <div style={{ fontSize:18, fontWeight:700, color:C.text, marginBottom:18 }}>{mode==="login"?"Sign In":"Create Account"}</div>
          {msg&&<div style={msg.type==="error"?g.error:g.success}>{msg.text}</div>}
          {mode==="signup"&&<><label style={g.label}>Full Name</label><input style={g.input} placeholder="e.g. Raj Sharma" value={name} onChange={e=>setName(e.target.value)}/></>}
          <label style={g.label}>Username</label>
          <input style={g.input} placeholder="Enter username" value={user} onChange={e=>setUser(e.target.value)}/>
          <label style={g.label}>Password</label>
          <input style={g.input} type="password" placeholder="Enter password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          <button style={g.primaryBtn} onClick={submit}>{mode==="login"?"Sign In":"Create Account"}</button>
          <button style={{...g.linkBtn={},background:"none",border:"none",color:C.primary,cursor:"pointer",fontSize:13,marginTop:14,width:"100%",textAlign:"center",display:"block"}} onClick={()=>{setMode(mode==="login"?"signup":"login");setMsg(null);}}>
            {mode==="login"?"New User? Register":"Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== HOME =====
function HomeScreen({ coins, username, onNav }) {
  const nextDraws = LOTTERIES.map(l=>({...l,next:getNextDraw(l)})).filter(l=>l.next).sort((a,b)=>a.next-b.next);
  const nearest = nextDraws[0];
  const menus = [
    {icon:"🎫",label:"Buy Ticket",id:"buy"},
    {icon:"📋",label:"My Orders",id:"orders"},
    {icon:"🔍",label:"Verify",id:"verify"},
    {icon:"🏆",label:"Results",id:"results"},
    {icon:"📊",label:"Net Sale",id:"netsale"},
    {icon:"🎰",label:"Roulette",id:"roulette"},
    {icon:"🎯",label:"Stock",id:"stock"},
    {icon:"🎟",label:"Ticket Query",id:"query"},
  ];
  return (
    <div style={g.panel}>
      <div style={{height:14}}/>
      {nearest&&(
        <div style={g.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={g.badge("blue")}>⏱ Next Unsold</span>
            <span style={{fontSize:12,color:C.textSec,fontWeight:600}}>Remaining Time</span>
          </div>
          <Countdown target={nearest.next.getTime()}/>
          <div style={g.divider}/>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:C.primary,display:"inline-block"}}/>
            <span style={{fontSize:12,fontWeight:700,color:C.primary}}>Latest Unsold</span>
          </div>
          <div style={{fontWeight:700,color:C.text,marginTop:6,fontSize:13}}>{nearest.name} LOTTERY</div>
          <div style={{display:"flex",gap:10,marginTop:8}}>
            <div style={{background:C.bg,borderRadius:8,padding:"6px 12px",fontSize:12,color:C.textSec,display:"flex",alignItems:"center",gap:4}}>📅 {nearest.next.toLocaleDateString("en-IN")}</div>
            <div style={{background:C.bg,borderRadius:8,padding:"6px 12px",fontSize:12,color:C.textSec,display:"flex",alignItems:"center",gap:4}}>🕐 {nearest.drawTime}</div>
          </div>
        </div>
      )}
      <div style={g.menuGrid}>
        {menus.map(m=>(
          <div key={m.id} style={g.menuItem} onClick={()=>onNav(m.id)}>
            <div style={g.menuIcon}>{m.icon}</div>
            <div style={g.menuLabel}>{m.label}</div>
          </div>
        ))}
      </div>
      <div style={{...g.card,background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,color:C.white}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>Your Wallet</div>
        <div style={{fontSize:28,fontWeight:900}}>₹{(coins||0).toLocaleString()}</div>
        <div style={{fontSize:11,opacity:0.8,marginTop:2}}>Available Balance</div>
      </div>
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
    if (coins < total) return setMsg({type:"error",text:`Insufficient balance! Need ₹${total}.`});
    const newTickets = Array.from({length:qty},()=>({
      id:Date.now()+Math.random(), lottery:selLottery.name, lotteryId:selLottery.id, code:selLottery.code,
      number:genTicketNum(), series:genSeries(), price:selLottery.price,
      drawDate:getNextDraw(selLottery)?.toLocaleDateString("en-IN")||"TBD",
      drawTime:selLottery.drawTime, purchasedAt:new Date().toLocaleString("en-IN"), status:"active",
    }));
    setTickets(newTickets); setStep(3);
  };

  const confirm = () => {
    const total = selLottery.price * qty;
    setCoins(c=>c-total);
    const orders = getOrders(username);
    saveOrders(username,[...orders,{id:`ORD${Date.now()}`,lottery:selLottery.name,lotteryId:selLottery.id,tickets,total,date:new Date().toLocaleString("en-IN"),drawDate:tickets[0].drawDate,drawTime:selLottery.drawTime,status:"active"}]);
    setMsg({type:"success",text:`${qty} ticket(s) purchased!`}); setStep(4);
  };

  return (
    <div style={g.panel}>
      <div style={{height:14}}/>
      {msg&&<div style={msg.type==="error"?g.error:g.success}>{msg.text}</div>}

      {step===1&&(
        <div>
          <div style={{...g.sectionTitle,marginBottom:12}}>Select Lottery</div>
          {LOTTERIES.map(l=>{
            const next=getNextDraw(l);
            return (
              <div key={l.id} style={{...g.lotteryCard,border:`1.5px solid ${selLottery?.id===l.id?C.primary:C.border}`}} onClick={()=>{setSelLottery(l);setStep(2);}}>
                <div style={{fontWeight:700,fontSize:13,color:C.text,marginBottom:6}}>{l.name} LOTTERY</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
                  <span style={g.badge("blue")}>CODE: {l.code}</span>
                  <span style={g.badge("orange")}>₹{l.price}/ticket</span>
                  <span style={g.badge("green")}>1st: ₹{l.prizes[0].toLocaleString()}</span>
                </div>
                {next&&<div style={{fontSize:11,color:C.textMuted}}>Draw: {next.toLocaleDateString("en-IN")} at {l.drawTime}</div>}
              </div>
            );
          })}
        </div>
      )}

      {step===2&&selLottery&&(
        <div style={g.card}>
          <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>{selLottery.name}</div>
          <div style={{fontSize:12,color:C.textSec,marginBottom:14}}>Price: <strong style={{color:C.primary}}>₹{selLottery.price}/ticket</strong></div>
          <label style={g.label}>Number of Tickets</label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
            {[1,2,5,10,25,50].map(n=><button key={n} style={g.qtyBtn(qty===n)} onClick={()=>setQty(n)}>{n}</button>)}
          </div>
          <div style={{background:C.bg,borderRadius:12,padding:"12px 14px",marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{color:C.textSec,fontSize:13}}>Tickets × Price</span>
              <span style={{color:C.text,fontSize:13}}>{qty} × ₹{selLottery.price}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{color:C.textSec,fontSize:13,fontWeight:600}}>Total</span>
              <span style={{color:C.primary,fontWeight:800,fontSize:16}}>₹{selLottery.price*qty}</span>
            </div>
          </div>
          <button style={g.primaryBtn} onClick={generate}>Generate Tickets</button>
          <button style={{...g.outlineBtn,marginTop:8}} onClick={()=>setStep(1)}>← Back</button>
        </div>
      )}

      {step===3&&(
        <div style={g.card}>
          <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>Confirm Tickets</div>
          <div style={{maxHeight:280,overflowY:"auto"}}>
            {tickets.map((t,i)=>(
              <div key={t.id} style={g.ticketCard}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontSize:10,opacity:0.7,marginBottom:4}}>Ticket #{i+1} · Series {t.series}</div>
                    <div style={{fontSize:22,fontWeight:900,letterSpacing:5}}>{t.number}</div>
                    <div style={{fontSize:10,opacity:0.7,marginTop:4}}>Draw: {t.drawDate} {t.drawTime}</div>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.15)",borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:700}}>₹{t.price}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:`1px solid ${C.border}`,marginTop:8}}>
            <span style={{color:C.textSec,fontWeight:600}}>Total</span>
            <span style={{color:C.primary,fontWeight:800,fontSize:16}}>₹{selLottery.price*qty}</span>
          </div>
          <button style={g.primaryBtn} onClick={confirm}>Confirm & Pay</button>
          <button style={{...g.outlineBtn,marginTop:8}} onClick={()=>setStep(2)}>← Back</button>
        </div>
      )}

      {step===4&&(
        <div style={{...g.card,textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:10}}>🎉</div>
          <div style={{fontSize:20,fontWeight:800,color:C.success,marginBottom:6}}>Purchase Successful!</div>
          <div style={{fontSize:13,color:C.textSec,marginBottom:16}}>Good luck! Results will be announced on draw date.</div>
          {tickets.map((t,i)=>(
            <div key={t.id} style={g.ticketCard}>
              <div style={{fontSize:10,opacity:0.7}}>{t.lottery} · Series {t.series}</div>
              <div style={{fontSize:22,fontWeight:900,letterSpacing:5,margin:"6px 0"}}>{t.number}</div>
              <div style={{fontSize:10,opacity:0.7}}>Draw: {t.drawDate}</div>
            </div>
          ))}
          <button style={{...g.primaryBtn,marginTop:12}} onClick={()=>{setStep(1);setSelLottery(null);setQty(1);setTickets([]);setMsg(null);}}>Buy More Tickets</button>
        </div>
      )}
    </div>
  );
}

// ===== ORDER LIST =====
function OrderListScreen({ username }) {
  const [orders, setOrders] = useState([]);
  const [expanded, setExpanded] = useState(null);
  useEffect(()=>{setOrders(getOrders(username));},[username]);
  if (orders.length===0) return (
    <div style={g.panel}><div style={{height:14}}/><div style={{...g.card,textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:48}}>🎫</div><div style={{color:C.textSec,marginTop:10,fontSize:14}}>No orders yet. Buy a ticket!</div></div></div>
  );
  return (
    <div style={g.panel}>
      <div style={{height:14}}/>
      <div style={{...g.sectionTitle}}>Order History</div>
      {[...orders].reverse().map(order=>(
        <div key={order.id} style={g.card}>
          <div style={{display:"flex",justifyContent:"space-between",cursor:"pointer"}} onClick={()=>setExpanded(expanded===order.id?null:order.id)}>
            <div>
              <div style={{fontWeight:700,fontSize:13,color:C.text}}>{order.lottery} LOTTERY</div>
              <div style={{fontSize:11,color:C.textMuted,marginTop:3}}>Draw: {order.drawDate} · {order.drawTime}</div>
              <div style={{fontSize:11,color:C.textMuted,marginTop:2}}>{order.date}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <span style={g.badge("blue")}>₹{order.total}</span>
              <div style={{fontSize:11,color:C.textMuted,marginTop:4}}>{order.tickets.length} ticket(s)</div>
            </div>
          </div>
          {expanded===order.id&&(
            <div style={{marginTop:12,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
              {order.tickets.map((t,i)=>(
                <div key={t.id} style={g.ticketCard}>
                  <div style={{fontSize:10,opacity:0.7}}>Ticket #{i+1} · Series {t.series}</div>
                  <div style={{fontSize:20,fontWeight:900,letterSpacing:4,margin:"4px 0"}}>{t.number}</div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,opacity:0.7}}>
                    <span>Draw: {t.drawDate}</span><span>Active</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ===== VERIFY =====
function VerifyScreen({ username }) {
  const [ticketNum, setTicketNum] = useState("");
  const [result, setResult] = useState(null);
  const verify = () => {
    const orders=getOrders(username); let found=null;
    for (const order of orders) { for (const t of order.tickets) { if(t.number===ticketNum.trim()){found={...t,drawDate:order.drawDate};break;} } if(found)break; }
    const results=getResults(); const win=results.find(r=>r.winners?.includes(ticketNum.trim()));
    setResult(found?{valid:true,ticket:found,win}:{valid:false});
  };
  return (
    <div style={g.panel}>
      <div style={{height:14}}/>
      <div style={g.card}>
        <div style={g.sectionTitle}>Verify Ticket</div>
        <label style={g.label}>Enter Ticket Number</label>
        <input style={g.input} placeholder="e.g. 45823" value={ticketNum} onChange={e=>setTicketNum(e.target.value)} maxLength={5}/>
        <button style={g.primaryBtn} onClick={verify}>🔍 Verify Ticket</button>
      </div>
      {result&&(
        <div style={g.card}>
          {result.valid?(
            <>
              <div style={{textAlign:"center",marginBottom:14}}>
                <div style={{fontSize:36}}>✅</div>
                <div style={{fontWeight:700,color:C.success,fontSize:15,marginTop:6}}>Valid Ticket!</div>
              </div>
              <div style={g.ticketCard}>
                <div style={{fontSize:10,opacity:0.7}}>{result.ticket.lottery}</div>
                <div style={{fontSize:24,fontWeight:900,letterSpacing:5,margin:"6px 0"}}>{result.ticket.number}</div>
                <div style={{fontSize:10,opacity:0.7}}>Series: {result.ticket.series} · Draw: {result.ticket.drawDate}</div>
              </div>
              {result.win&&<div style={{...g.success,marginTop:10}}>🏆 This ticket is a WINNER! Prize: ₹{result.win.prizes?.[result.win.winners?.indexOf(ticketNum)]?.toLocaleString()||"—"}</div>}
            </>
          ):(
            <div style={{textAlign:"center",padding:"20px"}}>
              <div style={{fontSize:36}}>❌</div>
              <div style={{color:C.danger,fontWeight:700,marginTop:8}}>Ticket not found in your account.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== RESULTS =====
function ResultsScreen() {
  const [results, setResults] = useState([]);
  useEffect(()=>{setResults(getResults());},[]);
  if (results.length===0) return (
    <div style={g.panel}><div style={{height:14}}/><div style={{...g.card,textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:48}}>📋</div><div style={{color:C.textSec,marginTop:10}}>No results announced yet.</div></div></div>
  );
  return (
    <div style={g.panel}>
      <div style={{height:14}}/>
      {[...results].reverse().map((r,i)=>(
        <div key={i} style={g.card}>
          <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:2}}>{r.lottery} LOTTERY</div>
          <div style={{fontSize:11,color:C.textMuted,marginBottom:12}}>Draw Date: {r.date}</div>
          {r.prizes.map((prize,pi)=>(
            <div key={pi} style={g.prizeRow}>
              <span style={{color:C.textSec,fontSize:12}}>{pi===0?"🥇 1st":pi===1?"🥈 2nd":pi===2?"🥉 3rd":`${pi+1}th`} — ₹{prize.toLocaleString()}</span>
              <span style={{color:C.primary,fontWeight:800,fontSize:15,letterSpacing:2}}>{r.winners?.[pi]||"—"}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ===== NET SALE / STOCK (placeholder screens) =====
function PlaceholderScreen({ icon, title, desc }) {
  return (
    <div style={g.panel}><div style={{height:14}}/><div style={{...g.card,textAlign:"center",padding:"40px 20px"}}>
      <div style={{fontSize:48}}>{icon}</div>
      <div style={{fontWeight:700,fontSize:16,color:C.text,marginTop:10}}>{title}</div>
      <div style={{color:C.textSec,fontSize:13,marginTop:6}}>{desc}</div>
    </div></div>
  );
}

// ===== ROULETTE =====
const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
function RouletteWheel({ spinning, result, onSpinComplete }) {
  const canvasRef = useRef(null);
  const angleRef = useRef(0);
  const draw = useCallback((angle)=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d"), cx=130, cy=130, r=122, inner=38, slots=37, slice=(2*Math.PI)/slots;
    ctx.clearRect(0,0,260,260);
    ctx.beginPath(); ctx.arc(cx,cy,r+5,0,2*Math.PI); ctx.fillStyle="#1565C0"; ctx.fill(); ctx.strokeStyle="#FFD700"; ctx.lineWidth=2; ctx.stroke();
    for(let i=0;i<slots;i++){
      const start=angle+i*slice, isRed=RED_NUMS.has(i), isGreen=i===0;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start,start+slice); ctx.closePath();
      ctx.fillStyle=isGreen?"#2E7D32":isRed?"#C62828":"#1A237E"; ctx.fill(); ctx.strokeStyle="#FFD70066"; ctx.lineWidth=0.5; ctx.stroke();
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(start+slice/2); ctx.textAlign="right";
      ctx.fillStyle=isGreen?"#A5D6A7":isRed?"#FFCDD2":"#C5CAE9"; ctx.font="bold 9px 'Segoe UI',sans-serif"; ctx.fillText(i,r-6,3); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(cx,cy,inner,0,2*Math.PI); ctx.fillStyle="#0D47A1"; ctx.fill(); ctx.strokeStyle="#FFD700"; ctx.lineWidth=1.5; ctx.stroke();
    ctx.font="bold 11px 'Segoe UI',sans-serif"; ctx.fillStyle="#FFD700"; ctx.textAlign="center"; ctx.fillText("786",cx,cy+4);
    ctx.beginPath(); ctx.moveTo(cx,cy-r-2); ctx.lineTo(cx-8,cy-r+14); ctx.lineTo(cx+8,cy-r+14); ctx.closePath(); ctx.fillStyle="#F44336"; ctx.fill();
  },[]);
  useEffect(()=>{draw(angleRef.current);},[draw]);
  useEffect(()=>{
    if(!spinning)return;
    const slots=37,slice=(2*Math.PI)/slots,totalRot=Math.PI*2*(10+Math.random()*6),target=totalRot+(result*slice),duration=4500,start=performance.now(),startAngle=angleRef.current;
    function easeOut(t){return 1-Math.pow(1-t,4);}
    function frame(now){const t=Math.min((now-start)/duration,1);angleRef.current=startAngle+target*easeOut(t);draw(angleRef.current);if(t<1)requestAnimationFrame(frame);else onSpinComplete();}
    requestAnimationFrame(frame);
  },[spinning,result,draw,onSpinComplete]);
  return <canvas ref={canvasRef} width={260} height={260} style={{borderRadius:"50%",display:"block",margin:"0 auto",boxShadow:"0 8px 32px rgba(21,101,192,0.3)"}}/>;
}

function RouletteScreen({ coins, setCoins }) {
  const [bet, setBet] = useState(0);
  const [betType, setBetType] = useState("red");
  const [exactNum, setExactNum] = useState(7);
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const [resultNum, setResultNum] = useState(0);
  const [history, setHistory] = useState([]);
  const getColor=(n)=>n===0?"green":RED_NUMS.has(n)?"red":"black";
  const spin=()=>{if(bet===0||spinning||bet>coins)return;setCoins(c=>c-bet);const num=Math.floor(Math.random()*37);setResultNum(num);setSpinResult(null);setSpinning(true);};
  const onSpinComplete=useCallback(()=>{
    setSpinning(false);
    const num=resultNum,color=getColor(num);
    let win=betType==="red"?color==="red":betType==="black"?color==="black":betType==="even"?num!==0&&num%2===0:betType==="odd"?num!==0&&num%2!==0:betType==="low"?num>=1&&num<=18:betType==="high"?num>=19&&num<=36:num===exactNum;
    const prize=win?bet*(betType==="number"?35:2):0;
    if(win)setCoins(c=>c+prize);
    setSpinResult({num,color,win,prize});
    setHistory(h=>[{num,color},...h].slice(0,14));
  },[resultNum,betType,exactNum,bet,setCoins]);
  return (
    <div style={g.panel}>
      <div style={{height:14}}/>
      <div style={g.card}>
        <RouletteWheel spinning={spinning} result={resultNum} onSpinComplete={onSpinComplete}/>
        {spinResult&&(<div style={{textAlign:"center",marginTop:12}}>
          <span style={{fontSize:32,fontWeight:900,color:spinResult.color==="red"?C.danger:spinResult.color==="green"?C.success:C.text}}>{spinResult.num}</span>
          <div style={{fontSize:14,fontWeight:700,marginTop:4,color:spinResult.win?C.success:C.danger}}>{spinResult.win?`You won! +₹${spinResult.prize}`:`You lost! -₹${bet}`}</div>
        </div>)}
      </div>
      <div style={g.card}>
        <div style={g.sectionTitle}>Place Your Bet</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
          {[10,50,100,200].map((v,i)=>(
            <button key={v} onClick={()=>setBet(b=>Math.min(b+v,coins))} style={{padding:"7px 14px",borderRadius:20,fontWeight:700,fontSize:13,cursor:"pointer",border:`1.5px solid ${[C.primary,"#2E7D32",C.gold,C.danger][i]}`,background:`${[C.primaryLight,C.successLight,C.goldLight,C.dangerLight][i]}`,color:[C.primary,C.success,C.gold,C.danger][i]}}>+{v}</button>
          ))}
          <button onClick={()=>setBet(0)} style={{padding:"7px 14px",borderRadius:20,fontWeight:700,fontSize:13,cursor:"pointer",border:`1.5px solid ${C.border}`,background:C.bg,color:C.textSec}}>Clear</button>
        </div>
        <div style={{fontSize:14,color:C.textSec,marginBottom:12}}>Bet: <strong style={{color:C.primary}}>₹{bet}</strong></div>
        <select value={betType} onChange={e=>setBetType(e.target.value)} style={{width:"100%",padding:"11px 12px",borderRadius:10,marginBottom:10,background:C.white,border:`1.5px solid ${C.border}`,color:C.text,fontSize:13,outline:"none"}}>
          <option value="red">Red (2x)</option><option value="black">Black (2x)</option><option value="even">Even (2x)</option><option value="odd">Odd (2x)</option><option value="low">Low 1–18 (2x)</option><option value="high">High 19–36 (2x)</option><option value="number">Exact Number (35x)</option>
        </select>
        {betType==="number"&&<input type="number" min={0} max={36} value={exactNum} onChange={e=>setExactNum(parseInt(e.target.value))} style={{...g.input}}/>}
        <button style={g.primaryBtn} onClick={spin} disabled={spinning||bet===0}>{spinning?"Spinning...":"🎰 Spin Now!"}</button>
      </div>
      {history.length>0&&(
        <div style={g.card}>
          <div style={g.sectionTitle}>Recent Results</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {history.map((h,i)=><span key={i} style={g.badge(h.color==="red"?"red":h.color==="green"?"green":"blue")}>{h.num}</span>)}
          </div>
        </div>
      )}
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
  const [resultForm, setResultForm] = useState({lotteryId:"guru",winners:["","","","","","",""]});
  const refresh=()=>setUsers(getUsers());
  useEffect(()=>{refresh();},[]);
  const showMsg=(text,type="success")=>{setMsg({text,type});setTimeout(()=>setMsg(null),2500);};
  const addCoins=(u)=>{const amt=parseInt(coinInputs[u]||0);if(!amt||isNaN(amt))return showMsg("Enter valid amount!","error");const users=getUsers();users[u].coins=(users[u].coins||0)+amt;saveUsers(users);setCoinInputs(p=>({...p,[u]:""}));refresh();showMsg(`+${amt} added to ${u}`);};
  const removeCoins=(u)=>{const amt=parseInt(coinInputs[u]||0);if(!amt||isNaN(amt))return showMsg("Enter valid amount!","error");const users=getUsers();users[u].coins=Math.max(0,(users[u].coins||0)-amt);saveUsers(users);setCoinInputs(p=>({...p,[u]:""}));refresh();showMsg(`-${amt} removed from ${u}`);};
  const banUser=(u)=>{if(!window.confirm(`Ban "${u}"?`))return;const users=getUsers();delete users[u];saveUsers(users);refresh();showMsg(`${u} banned.`);};
  const announceResult=()=>{const l=LOTTERIES.find(l=>l.id===resultForm.lotteryId);if(!l)return;const r=getResults();r.push({lottery:l.name,lotteryId:l.id,date:new Date().toLocaleDateString("en-IN"),prizes:l.prizes,winners:resultForm.winners});saveResults(r);showMsg("Result announced!");};
  const totalUsers=Object.keys(users).length, totalCoins=Object.values(users).reduce((s,u)=>s+(u.coins||0),0);
  const filtered=Object.entries(users).filter(([k])=>k.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={{...g.app,background:C.bg}}>
      <div style={{background:C.white,padding:"14px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:C.shadow}}>
        <div>
          <div style={{fontSize:17,fontWeight:800,color:C.text}}>⚙️ Admin Panel</div>
          <div style={{fontSize:11,color:C.textMuted}}>RoyalWin786 Super Admin</div>
        </div>
        <button style={g.logoutBtn} onClick={onLogout}>Logout</button>
      </div>
      <div style={{maxWidth:900,margin:"0 auto",padding:"16px"}}>
        {msg&&<div style={msg.type==="error"?g.error:g.success}>{msg.text}</div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
          {[[totalUsers,"Total Users",C.primary],[totalCoins.toLocaleString(),"Total Balance",C.success],[totalUsers>0?Math.round(totalCoins/totalUsers):0,"Avg Balance",C.accent]].map(([v,l,c])=>(
            <div key={l} style={{...g.card,textAlign:"center"}}>
              <div style={{fontSize:26,fontWeight:800,color:c}}>{v}</div>
              <div style={{fontSize:11,color:C.textMuted,marginTop:4}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {[["users","👥 Users"],["results","🏆 Announce Result"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{padding:"8px 18px",borderRadius:20,border:`1.5px solid ${tab===id?C.primary:C.border}`,background:tab===id?C.primaryLight:C.white,color:tab===id?C.primary:C.textSec,fontWeight:700,cursor:"pointer",fontSize:13}}>{label}</button>
          ))}
        </div>
        {tab==="users"&&(
          <div style={g.card}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
              <div style={{fontWeight:700,fontSize:14,color:C.text}}>All Users</div>
              <input style={{...g.input,width:180,marginBottom:0}} placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            {filtered.length===0?<div style={{textAlign:"center",color:C.textMuted,padding:"20px"}}>No users found.</div>:(
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>{["Username","Name","Balance","Manage","Action"].map(h=><th key={h} style={g.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filtered.map(([un,data])=>(
                      <tr key={un}>
                        <td style={g.td}><strong style={{color:C.primary}}>{un}</strong></td>
                        <td style={g.td}>{data.name||"—"}</td>
                        <td style={g.td}><strong style={{color:C.success}}>₹{(data.coins||0).toLocaleString()}</strong></td>
                        <td style={g.td}>
                          <input style={{...g.smInput={},padding:"6px 8px",borderRadius:8,border:`1px solid ${C.border}`,background:C.white,color:C.text,fontSize:12,outline:"none",width:70}} type="number" placeholder="Amt" value={coinInputs[un]||""} onChange={e=>setCoinInputs(p=>({...p,[un]:e.target.value}))}/>
                          <button style={g.smBtn("green")} onClick={()=>addCoins(un)}>+ Add</button>
                          <button style={g.smBtn("red")} onClick={()=>removeCoins(un)}>− Remove</button>
                        </td>
                        <td style={g.td}><button style={g.smBtn("red")} onClick={()=>banUser(un)}>🚫 Ban</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {tab==="results"&&(
          <div style={g.card}>
            <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:14}}>Announce Draw Result</div>
            <label style={g.label}>Select Lottery</label>
            <select value={resultForm.lotteryId} onChange={e=>setResultForm(p=>({...p,lotteryId:e.target.value}))} style={{width:"100%",padding:"11px 12px",borderRadius:10,marginBottom:14,background:C.white,border:`1.5px solid ${C.border}`,color:C.text,fontSize:13,outline:"none"}}>
              {LOTTERIES.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            {LOTTERIES.find(l=>l.id===resultForm.lotteryId)?.prizes.map((prize,i)=>(
              <div key={i} style={{marginBottom:10}}>
                <label style={g.label}>{i===0?"🥇 1st":i===1?"🥈 2nd":i===2?"🥉 3rd":`${i+1}th`} Prize — ₹{prize.toLocaleString()}</label>
                <input style={g.input} placeholder="Winning ticket number" value={resultForm.winners[i]||""} onChange={e=>{const w=[...resultForm.winners];w[i]=e.target.value;setResultForm(p=>({...p,winners:w}));}}/>
              </div>
            ))}
            <button style={g.primaryBtn} onClick={announceResult}>🏆 Announce Result</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== MAIN =====
export default function RoyalWin786() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [screen, setScreen] = useState("home");

  useEffect(()=>{
    const sess=getSession();
    if(sess==="__admin__"){setUser("__admin__");setUserData({name:"Admin",coins:0,isAdmin:true});return;}
    if(sess){const users=getUsers();if(users[sess]){setUser(sess);setUserData(users[sess]);}}
  },[]);

  const handleLogin=(username,data)=>{setUser(username);setUserData(data);};
  const setCoins=(fn)=>{
    setUserData(prev=>{
      const newCoins=typeof fn==="function"?fn(prev.coins):fn;
      const users=getUsers();users[user].coins=newCoins;saveUsers(users);
      return {...prev,coins:newCoins};
    });
  };
  const logout=()=>{clearSession();setUser(null);setUserData(null);setScreen("home");};

  if(!user) return <AuthScreen onLogin={handleLogin}/>;
  if(userData?.isAdmin) return <AdminPanel onLogout={logout}/>;

  const NAV=[
    {id:"home",icon:"🏠",label:"Home"},
    {id:"buy",icon:"🎫",label:"Buy"},
    {id:"orders",icon:"📋",label:"Orders"},
    {id:"results",icon:"🏆",label:"Results"},
    {id:"roulette",icon:"🎰",label:"Roulette"},
  ];

  const screenTitles={home:"Home",buy:"Buy Ticket",orders:"My Orders",verify:"Verify Ticket",results:"Results",roulette:"Roulette",netsale:"Net Sale Report",stock:"Stock Report",query:"Ticket Query"};

  return (
    <div style={g.app}>
      <div style={{background:C.white,boxShadow:C.shadow}}>
        <div style={g.userBar}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,display:"flex",alignItems:"center",justifyContent:"center",color:C.white,fontWeight:700,fontSize:14}}>{(userData.name||user)[0].toUpperCase()}</div>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.text}}>{userData.name||user}</div>
              <div style={{fontSize:10,color:C.textMuted}}>Balance: <strong style={{color:C.primary}}>₹{(userData.coins||0).toLocaleString()}</strong></div>
            </div>
          </div>
          <button style={g.logoutBtn} onClick={logout}>Logout</button>
        </div>
        <div style={{textAlign:"center",padding:"10px 16px 0"}}>
          <div style={{fontSize:20,fontWeight:800,color:C.text,letterSpacing:1}}>RoyalWin786</div>
          <div style={{fontSize:10,color:C.textMuted,letterSpacing:2,marginBottom:10}}>PREMIUM GAMING PLATFORM</div>
        </div>
        {screen!=="home"&&(
          <div style={{display:"flex",alignItems:"center",padding:"0 16px 10px",gap:8}}>
            <button onClick={()=>setScreen("home")} style={{background:"none",border:"none",color:C.primary,cursor:"pointer",fontSize:18,padding:0}}>←</button>
            <div style={{fontWeight:700,fontSize:14,color:C.text}}>{screenTitles[screen]||screen}</div>
          </div>
        )}
      </div>

      {screen==="home"&&<HomeScreen coins={userData.coins||0} username={user} onNav={setScreen}/>}
      {screen==="buy"&&<BuyTicketScreen coins={userData.coins||0} setCoins={setCoins} username={user}/>}
      {screen==="orders"&&<OrderListScreen username={user}/>}
      {screen==="verify"&&<VerifyScreen username={user}/>}
      {screen==="results"&&<ResultsScreen/>}
      {screen==="roulette"&&<RouletteScreen coins={userData.coins||0} setCoins={setCoins}/>}
      {screen==="netsale"&&<PlaceholderScreen icon="📊" title="Net Sale Report" desc="Net sale report will be available after first draw."/>}
      {screen==="stock"&&<PlaceholderScreen icon="🎯" title="Stock Report" desc="Full stock report will appear here."/>}
      {screen==="query"&&<PlaceholderScreen icon="🎟" title="Ticket Query" desc="Search and query tickets here."/>}

      <div style={g.bottomNav}>
        {NAV.map(n=>(
          <button key={n.id} style={g.navBtn(screen===n.id)} onClick={()=>setScreen(n.id)}>
            <span style={{fontSize:20}}>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </div>
    </div>
  );
}
