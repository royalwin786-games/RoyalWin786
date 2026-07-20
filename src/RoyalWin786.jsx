import { useState, useEffect, useRef, useCallback } from "react";

const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C76A";
const GOLD_DARK = "#8B6914";
const ROYAL_DARK = "#0D0A1A";
const ROYAL_MID = "#160D2E";
const ROYAL_CARD = "#1C1035";
const ROYAL_BORDER = "#2E1F5E";
const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

const s = {
  app: { minHeight:"100vh", background:`radial-gradient(ellipse at 20% 0%, #1a0a3a 0%, ${ROYAL_DARK} 60%)`, fontFamily:"'Segoe UI', system-ui, sans-serif", color:"#e8e0f0", paddingBottom:40 },
  center: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:"0 16px" },
  authCard: { background:`linear-gradient(135deg, ${ROYAL_CARD} 0%, #170e30 100%)`, border:`1px solid ${ROYAL_BORDER}`, borderRadius:20, padding:"40px 36px", width:"100%", maxWidth:400 },
  logo: { fontSize:34, fontWeight:800, letterSpacing:2, background:`linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 50%, ${GOLD_DARK} 100%)`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", margin:0, textAlign:"center" },
  logoSub: { fontSize:11, letterSpacing:6, color:GOLD, opacity:0.7, marginTop:2, textTransform:"uppercase", textAlign:"center" },
  input: { width:"100%", padding:"12px 14px", borderRadius:10, border:`1px solid ${ROYAL_BORDER}`, background:"rgba(0,0,0,0.3)", color:"#e8e0f0", fontSize:14, outline:"none", marginBottom:12, boxSizing:"border-box" },
  goldBtn: { width:"100%", padding:"13px", borderRadius:10, border:`1px solid ${GOLD_DARK}`, background:`linear-gradient(135deg, ${GOLD_DARK} 0%, ${GOLD} 100%)`, color:"#0D0A1A", fontWeight:800, fontSize:15, cursor:"pointer", letterSpacing:1, boxShadow:`0 4px 20px ${GOLD}44`, marginTop:4 },
  linkBtn: { background:"none", border:"none", color:GOLD, cursor:"pointer", fontSize:13, textDecoration:"underline", marginTop:12, display:"block", width:"100%", textAlign:"center" },
  error: { background:"rgba(220,50,50,0.15)", border:"1px solid #6b1a1a", borderRadius:8, padding:"10px 14px", color:"#e87070", fontSize:13, marginBottom:12 },
  success: { background:"rgba(30,150,80,0.15)", border:"1px solid #1a6b3a", borderRadius:8, padding:"10px 14px", color:"#5ddb8a", fontSize:13, marginBottom:12 },
  label: { fontSize:12, color:GOLD, opacity:0.8, letterSpacing:2, textTransform:"uppercase", marginBottom:6, display:"block" },
  header: { textAlign:"center", padding:"28px 16px 14px", borderBottom:`1px solid ${ROYAL_BORDER}`, background:`linear-gradient(180deg, #1a0838 0%, transparent 100%)` },
  coinBadge: { background:`linear-gradient(135deg, #2a1a00 0%, #3d2800 100%)`, border:`1px solid ${GOLD_DARK}`, borderRadius:20, padding:"6px 18px", fontSize:14, fontWeight:700, color:GOLD },
  tabs: { display:"flex", justifyContent:"center", gap:4, padding:"16px 16px 0" },
  tab: (a) => ({ padding:"10px 28px", borderRadius:"10px 10px 0 0", border:`1px solid ${a ? GOLD_DARK : ROYAL_BORDER}`, borderBottom: a ? `1px solid ${ROYAL_CARD}` : `1px solid ${ROYAL_BORDER}`, background: a ? ROYAL_CARD : "transparent", color: a ? GOLD : "#8070a0", fontWeight:700, fontSize:14, cursor:"pointer", letterSpacing:1 }),
  panel: { maxWidth:520, margin:"0 auto", padding:"0 16px" },
  card: { background:`linear-gradient(135deg, ${ROYAL_CARD} 0%, #170e30 100%)`, border:`1px solid ${ROYAL_BORDER}`, borderRadius:16, padding:"20px", marginBottom:14 },
  cardTitle: { fontSize:11, fontWeight:700, letterSpacing:3, color:GOLD, opacity:0.8, textTransform:"uppercase", marginBottom:14 },
  numGrid: { display:"grid", gridTemplateColumns:"repeat(6, 1fr)", gap:7, marginBottom:12 },
  numBtn: (sel) => ({ background: sel ? `linear-gradient(135deg, ${GOLD_DARK} 0%, ${GOLD} 100%)` : "rgba(255,255,255,0.04)", border:`1px solid ${sel ? GOLD : ROYAL_BORDER}`, borderRadius:8, color: sel ? "#0D0A1A" : "#c0b0e0", fontWeight: sel ? 800 : 500, fontSize:13, padding:"9px 0", cursor:"pointer", boxShadow: sel ? `0 0 12px ${GOLD}44` : "none" }),
  selRow: { minHeight:40, background:"rgba(0,0,0,0.3)", border:`1px dashed ${ROYAL_BORDER}`, borderRadius:10, padding:"8px 12px", display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:12 },
  selPill: { background:`linear-gradient(135deg, ${GOLD_DARK} 0%, ${GOLD} 100%)`, color:"#0D0A1A", borderRadius:6, padding:"3px 10px", fontSize:12, fontWeight:800 },
  actionBtn: (v) => ({ width:"100%", padding:"13px", borderRadius:10, border:`1px solid ${v==="green"?"#1a6b3a":v==="red"?"#6b1a1a":v==="gold"?GOLD_DARK:ROYAL_BORDER}`, background:v==="green"?"linear-gradient(135deg,#0d3a1e,#1a5c30)":v==="red"?"linear-gradient(135deg,#3a0d0d,#5c1a1a)":v==="gold"?`linear-gradient(135deg,${GOLD_DARK},${GOLD})`:"rgba(255,255,255,0.05)", color:v==="gold"?"#0D0A1A":v==="green"?"#5ddb8a":v==="red"?"#e87070":"#8070a0", fontWeight:700, fontSize:14, cursor:"pointer", letterSpacing:1, boxShadow:v==="gold"?`0 4px 20px ${GOLD}44`:"none", marginTop:4 }),
  ticketRow: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", border:`1px solid ${ROYAL_BORDER}`, borderRadius:10, marginBottom:8, background:"rgba(0,0,0,0.2)" },
  tPill: { background:"rgba(201,168,76,0.15)", border:`1px solid ${GOLD_DARK}`, color:GOLD, borderRadius:6, padding:"2px 8px", fontSize:12, fontWeight:700, marginRight:4 },
  winPill: { background:`linear-gradient(135deg,${GOLD_DARK},${GOLD})`, color:"#0D0A1A", borderRadius:8, padding:"8px 16px", fontSize:20, fontWeight:900, marginRight:8, marginBottom:4, boxShadow:`0 0 18px ${GOLD}55` },
  betChip: (c) => ({ padding:"6px 16px", borderRadius:20, fontSize:13, fontWeight:700, cursor:"pointer", border:`1px solid ${c}44`, background:`${c}18`, color:c }),
  histPill: (c) => ({ borderRadius:6, padding:"3px 9px", fontSize:12, fontWeight:700, background:c==="red"?"#3a100a":c==="green"?"#0a2a12":"#1a1a2e", color:c==="red"?"#e87070":c==="green"?"#5ddb8a":"#a090c0", border:`1px solid ${c==="red"?"#6b1a1a":c==="green"?"#1a6b3a":ROYAL_BORDER}`, marginRight:5, marginBottom:5, display:"inline-block" }),
  userBar: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 20px", background:"rgba(0,0,0,0.2)", borderBottom:`1px solid ${ROYAL_BORDER}` },
  logoutBtn: { background:"none", border:`1px solid ${ROYAL_BORDER}`, borderRadius:8, color:"#8070a0", padding:"5px 14px", fontSize:12, cursor:"pointer" },
};

function getUsers() {
  try { return JSON.parse(localStorage.getItem("rw786_users") || "{}"); } catch { return {}; }
}
function saveUsers(u) { localStorage.setItem("rw786_users", JSON.stringify(u)); }
function getSession() { return localStorage.getItem("rw786_session") || null; }
function saveSession(u) { localStorage.setItem("rw786_session", u); }
function clearSession() { localStorage.removeItem("rw786_session"); }

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState(null);

  const submit = () => {
    setMsg(null);
    if (!user.trim() || !pass.trim()) return setMsg({ type:"error", text:"Please enter username and password!" });
    const users = getUsers();
    if (mode === "signup") {
      if (users[user]) return setMsg({ type:"error", text:"This username is already taken!" });
      if (pass.length < 6) return setMsg({ type:"error", text:"Password must be at least 6 characters!" });
      users[user] = { pass, name: name || user, coins: 1000 };
      saveUsers(users);
      saveSession(user);
      setMsg({ type:"success", text:"Account created! Welcome to RoyalWin786!" });
      setTimeout(() => onLogin(user, users[user]), 800);
    } else {
      if (!users[user]) return setMsg({ type:"error", text:"Username not found!" });
      if (users[user].pass !== pass) return setMsg({ type:"error", text:"Incorrect password!" });
      saveSession(user);
      onLogin(user, users[user]);
    }
  };

  return (
    <div style={s.center}>
      <div style={s.authCard}>
        <h1 style={s.logo}>ROYALWIN786</h1>
        <div style={s.logoSub}>Premium Gaming Experience</div>
        <div style={{ height:28 }} />
        <div style={{ fontSize:18, fontWeight:700, color:GOLD, textAlign:"center", marginBottom:20 }}>
          {mode === "login" ? "Welcome Back" : "Create Account"}
        </div>
        {msg && <div style={msg.type==="error" ? s.error : s.success}>{msg.text}</div>}
        {mode === "signup" && (
          <>
            <label style={s.label}>Full Name</label>
            <input style={s.input} placeholder="e.g. John Smith" value={name} onChange={e => setName(e.target.value)} />
          </>
        )}
        <label style={s.label}>Username</label>
        <input style={s.input} placeholder="Enter username" value={user} onChange={e => setUser(e.target.value)} />
        <label style={s.label}>Password</label>
        <input style={s.input} placeholder="Enter password" type="password" value={pass} onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()} />
        <button style={s.goldBtn} onClick={submit}>
          {mode === "login" ? "✦ Login" : "✦ Create Account"}
        </button>
        <button style={s.linkBtn} onClick={() => { setMode(mode==="login"?"signup":"login"); setMsg(null); }}>
          {mode === "login" ? "Don't have an account? Sign Up" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
}

function RouletteWheel({ spinning, result, onSpinComplete }) {
  const canvasRef = useRef(null);
  const angleRef = useRef(0);

  const draw = useCallback((angle) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cx = 140, cy = 140, r = 132, inner = 42;
    const slots = 37, slice = (2 * Math.PI) / slots;
    ctx.clearRect(0, 0, 280, 280);
    ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, 2 * Math.PI);
    ctx.fillStyle = "#1a0838"; ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < slots; i++) {
      const start = angle + i * slice;
      const isRed = RED_NUMS.has(i), isGreen = i === 0;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, start + slice); ctx.closePath();
      ctx.fillStyle = isGreen ? "#0d3a1e" : isRed ? "#3a0d0d" : "#0d0a1a"; ctx.fill();
      ctx.strokeStyle = GOLD_DARK; ctx.lineWidth = 0.5; ctx.stroke();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(start + slice / 2);
      ctx.textAlign = "right"; ctx.fillStyle = isGreen ? "#5ddb8a" : isRed ? "#e87070" : "#a090c0";
      ctx.font = "bold 10px 'Segoe UI', sans-serif"; ctx.fillText(i, r - 8, 4); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(cx, cy, inner, 0, 2 * Math.PI);
    ctx.fillStyle = ROYAL_MID; ctx.fill(); ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font = "bold 13px 'Segoe UI', sans-serif"; ctx.fillStyle = GOLD; ctx.textAlign = "center"; ctx.fillText("786", cx, cy + 5);
    ctx.beginPath(); ctx.moveTo(cx, cy - r - 2); ctx.lineTo(cx - 9, cy - r + 16); ctx.lineTo(cx + 9, cy - r + 16); ctx.closePath();
    ctx.fillStyle = "#e84444"; ctx.fill();
  }, []);

  useEffect(() => { draw(angleRef.current); }, [draw]);

  useEffect(() => {
    if (!spinning) return;
    const slots = 37, slice = (2 * Math.PI) / slots;
    const totalRot = Math.PI * 2 * (10 + Math.random() * 6);
    const target = totalRot + (result * slice);
    const duration = 4500, start = performance.now(), startAngle = angleRef.current;
    function easeOut(t) { return 1 - Math.pow(1 - t, 4); }
    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      angleRef.current = startAngle + target * easeOut(t);
      draw(angleRef.current);
      if (t < 1) requestAnimationFrame(frame); else onSpinComplete();
    }
    requestAnimationFrame(frame);
  }, [spinning, result, draw, onSpinComplete]);

  return <canvas ref={canvasRef} width={280} height={280} style={{ borderRadius:"50%", display:"block", margin:"0 auto" }} />;
}

function LotteryPanel({ coins, setCoins }) {
  const [selected, setSelected] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [ticketId, setTicketId] = useState(1);
  const [result, setResult] = useState(null);

  const toggle = (n) => setSelected(prev => prev.includes(n) ? prev.filter(x => x !== n) : prev.length < 5 ? [...prev, n] : prev);

  const buy = () => {
    if (selected.length < 5 || coins < 50) return;
    setCoins(c => c - 50);
    setTickets(prev => [...prev, { id: ticketId, nums: [...selected].sort((a,b)=>a-b) }]);
    setTicketId(i => i + 1); setSelected([]);
  };

  const draw = () => {
    const pool = Array.from({length:30},(_,i)=>i+1);
    const winning = [];
    while (winning.length < 5) { const idx = Math.floor(Math.random()*pool.length); winning.push(pool.splice(idx,1)[0]); }
    winning.sort((a,b)=>a-b);
    const winners = tickets.filter(t => t.nums.every(n => winning.includes(n)));
    if (winners.length > 0) setCoins(c => c + 500);
    setResult({ winning, winners });
  };

  return (
    <div style={s.panel}>
      <div style={{height:16}}/>
      <div style={s.card}>
        <div style={s.cardTitle}>Pick 5 Numbers (1–30)</div>
        <div style={s.numGrid}>
          {Array.from({length:30},(_,i)=>i+1).map(n => (
            <button key={n} style={s.numBtn(selected.includes(n))} onClick={()=>toggle(n)}>{n}</button>
          ))}
        </div>
        <div style={s.selRow}>
          {selected.length === 0
            ? <span style={{color:"#6050a0",fontSize:13}}>No numbers selected...</span>
            : selected.slice().sort((a,b)=>a-b).map(n=><span key={n} style={s.selPill}>{n}</span>)}
        </div>
        <button style={s.actionBtn("gold")} disabled={selected.length<5||coins<50} onClick={buy}>✦ Buy Ticket — 50 Coins</button>
      </div>
      {tickets.length > 0 && (
        <div style={s.card}>
          <div style={s.cardTitle}>My Tickets</div>
          {tickets.map(t => (
            <div key={t.id} style={s.ticketRow}>
              <div>{t.nums.map(n=><span key={n} style={s.tPill}>{n}</span>)}</div>
              <span style={{fontSize:11,color:"#6050a0"}}>#{String(t.id).padStart(3,"0")}</span>
            </div>
          ))}
          {!result && <button style={{...s.actionBtn("red"),marginTop:12}} onClick={draw}>◆ Run Lucky Draw!</button>}
        </div>
      )}
      {result && (
        <div style={s.card}>
          <div style={s.cardTitle}>Winning Numbers</div>
          <div style={{display:"flex",flexWrap:"wrap",marginBottom:16}}>
            {result.winning.map(n=><span key={n} style={s.winPill}>{n}</span>)}
          </div>
          {result.winners.length > 0
            ? <div style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:800,color:GOLD,marginBottom:4}}>🏆 Jackpot!</div><div style={{color:"#5ddb8a",fontSize:14}}>You won +500 Coins!</div></div>
            : <div style={{textAlign:"center",color:"#8070a0",fontSize:14}}>Better luck next time!</div>}
          <button style={{...s.actionBtn(""),marginTop:16}} onClick={()=>{setTickets([]);setSelected([]);setResult(null);}}>Play Again</button>
        </div>
      )}
    </div>
  );
}

function RoulettePanel({ coins, setCoins }) {
  const [bet, setBet] = useState(0);
  const [betType, setBetType] = useState("red");
  const [exactNum, setExactNum] = useState(7);
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const [resultNum, setResultNum] = useState(0);
  const [history, setHistory] = useState([]);

  const getColor = (n) => n === 0 ? "green" : RED_NUMS.has(n) ? "red" : "black";

  const spin = () => {
    if (bet === 0 || spinning || bet > coins) return;
    setCoins(c => c - bet);
    const num = Math.floor(Math.random() * 37);
    setResultNum(num); setSpinResult(null); setSpinning(true);
  };

  const onSpinComplete = useCallback(() => {
    setSpinning(false);
    const num = resultNum, color = getColor(num);
    let win = betType==="red"?color==="red":betType==="black"?color==="black":betType==="even"?num!==0&&num%2===0:betType==="odd"?num!==0&&num%2!==0:betType==="low"?num>=1&&num<=18:betType==="high"?num>=19&&num<=36:num===exactNum;
    const prize = win ? bet * (betType==="number"?35:2) : 0;
    if (win) setCoins(c => c + prize);
    setSpinResult({ num, color, win, prize });
    setHistory(h => [{num,color},...h].slice(0,14));
  }, [resultNum, betType, exactNum, bet, setCoins]);

  return (
    <div style={s.panel}>
      <div style={{height:16}}/>
      <div style={s.card}>
        <div style={s.cardTitle}>Roulette Wheel</div>
        <RouletteWheel spinning={spinning} result={resultNum} onSpinComplete={onSpinComplete} />
        {spinResult && (
          <div style={{textAlign:"center",marginTop:14}}>
            <span style={{fontSize:32,fontWeight:900,color:spinResult.color==="red"?"#e87070":spinResult.color==="green"?"#5ddb8a":"#c0b0e0"}}>{spinResult.num}</span>
            <div style={{fontSize:15,fontWeight:700,marginTop:4,color:spinResult.win?"#5ddb8a":"#e87070"}}>
              {spinResult.win ? `You won! +${spinResult.prize} Coins` : `You lost! -${bet} Coins`}
            </div>
          </div>
        )}
      </div>
      <div style={s.card}>
        <div style={s.cardTitle}>Place Your Bet</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
          {[10,50,100,200].map((v,i)=>(
            <button key={v} style={s.betChip(["#378ADD","#1D9E75",GOLD,"#D85A30"][i])} onClick={()=>setBet(b=>Math.min(b+v,coins))}>+{v}</button>
          ))}
          <button style={s.betChip("#8070a0")} onClick={()=>setBet(0)}>Clear</button>
        </div>
        <div style={{fontSize:14,color:"#a090c0",marginBottom:12}}>Bet: <span style={{color:GOLD,fontWeight:700}}>{bet} Coins</span></div>
        <select value={betType} onChange={e=>setBetType(e.target.value)} style={{width:"100%",padding:"9px 12px",borderRadius:8,marginBottom:10,background:ROYAL_MID,border:`1px solid ${ROYAL_BORDER}`,color:"#e0d0f0",fontSize:13,outline:"none"}}>
          <option value="red">Red (2x)</option>
          <option value="black">Black (2x)</option>
          <option value="even">Even (2x)</option>
          <option value="odd">Odd (2x)</option>
          <option value="low">Low 1–18 (2x)</option>
          <option value="high">High 19–36 (2x)</option>
          <option value="number">Exact Number (35x)</option>
        </select>
        {betType==="number" && <input type="number" min={0} max={36} value={exactNum} onChange={e=>setExactNum(parseInt(e.target.value))} style={{width:"100%",padding:"9px 12px",borderRadius:8,marginBottom:10,background:ROYAL_MID,border:`1px solid ${ROYAL_BORDER}`,color:"#e0d0f0",fontSize:13,outline:"none"}} />}
        <button style={s.actionBtn("gold")} onClick={spin} disabled={spinning||bet===0}>{spinning?"Spinning...":"◈ Spin Now!"}</button>
      </div>
      {history.length > 0 && (
        <div style={s.card}>
          <div style={s.cardTitle}>Recent Results</div>
          <div style={{display:"flex",flexWrap:"wrap"}}>{history.map((h,i)=><span key={i} style={s.histPill(h.color)}>{h.num}</span>)}</div>
        </div>
      )}
    </div>
  );
}

export default function RoyalWin786() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [tab, setTab] = useState("lottery");

  useEffect(() => {
    const sess = getSession();
    if (sess) {
      const users = getUsers();
      if (users[sess]) { setUser(sess); setUserData(users[sess]); }
    }
  }, []);

  const handleLogin = (username, data) => { setUser(username); setUserData(data); };

  const setCoins = (fn) => {
    setUserData(prev => {
      const newCoins = typeof fn === "function" ? fn(prev.coins) : fn;
      const users = getUsers();
      users[user].coins = newCoins;
      saveUsers(users);
      return { ...prev, coins: newCoins };
    });
  };

  const logout = () => { clearSession(); setUser(null); setUserData(null); };

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div style={s.app}>
      <div style={s.userBar}>
        <span style={{fontSize:13,color:"#a090c0"}}>Welcome, <span style={{color:GOLD,fontWeight:700}}>{userData.name || user}</span></span>
        <button style={s.logoutBtn} onClick={logout}>Logout</button>
      </div>
      <div style={s.header}>
        <h1 style={s.logo}>ROYALWIN786</h1>
        <div style={s.logoSub}>Premium Gaming Experience</div>
        <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:8,margin:"12px 0 0"}}>
          <span style={{fontSize:18,color:GOLD}}>✦</span>
          <div style={s.coinBadge}>{(userData.coins||0).toLocaleString()} Coins</div>
          <span style={{fontSize:18,color:GOLD}}>✦</span>
        </div>
      </div>
      <div style={s.tabs}>
        <button style={s.tab(tab==="lottery")} onClick={()=>setTab("lottery")}>◆ Lottery</button>
        <button style={s.tab(tab==="roulette")} onClick={()=>setTab("roulette")}>◈ Roulette</button>
      </div>
      <div style={{maxWidth:552,margin:"0 auto",borderTop:`1px solid ${ROYAL_BORDER}`}}>
        {tab==="lottery"
          ? <LotteryPanel coins={userData.coins||0} setCoins={setCoins}/>
          : <RoulettePanel coins={userData.coins||0} setCoins={setCoins}/>}
      </div>
      <div style={{textAlign:"center",marginTop:24,color:"#4a3a6a",fontSize:11,letterSpacing:2}}>ROYALWIN786 · ENTERTAINMENT ONLY · 18+</div>
    </div>
  );
}
