import { useState, useEffect, useRef, useCallback } from "react";

const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C76A";
const GOLD_DARK = "#8B6914";
const ROYAL_DARK = "#0D0A1A";
const ROYAL_MID = "#160D2E";
const ROYAL_CARD = "#1C1035";
const ROYAL_BORDER = "#2E1F5E";
const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

const styles = {
  app: {
    minHeight: "100vh",
    background: `radial-gradient(ellipse at 20% 0%, #1a0a3a 0%, ${ROYAL_DARK} 60%)`,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: "#e8e0f0",
    paddingBottom: 40,
  },
  header: {
    textAlign: "center",
    padding: "32px 16px 16px",
    borderBottom: `1px solid ${ROYAL_BORDER}`,
    background: `linear-gradient(180deg, #1a0838 0%, transparent 100%)`,
  },
  logo: {
    fontSize: 36,
    fontWeight: 800,
    letterSpacing: 2,
    background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 50%, ${GOLD_DARK} 100%)`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    margin: 0,
  },
  logoSub: {
    fontSize: 11,
    letterSpacing: 6,
    color: GOLD,
    opacity: 0.7,
    marginTop: 2,
    textTransform: "uppercase",
  },
  coinBar: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    margin: "12px 0 0",
  },
  coinBadge: {
    background: `linear-gradient(135deg, #2a1a00 0%, #3d2800 100%)`,
    border: `1px solid ${GOLD_DARK}`,
    borderRadius: 20,
    padding: "6px 18px",
    fontSize: 14,
    fontWeight: 700,
    color: GOLD,
  },
  tabs: {
    display: "flex",
    justifyContent: "center",
    gap: 4,
    padding: "16px 16px 0",
  },
  tab: (active) => ({
    padding: "10px 32px",
    borderRadius: "10px 10px 0 0",
    border: `1px solid ${active ? GOLD_DARK : ROYAL_BORDER}`,
    borderBottom: active ? `1px solid ${ROYAL_CARD}` : `1px solid ${ROYAL_BORDER}`,
    background: active ? ROYAL_CARD : "transparent",
    color: active ? GOLD : "#8070a0",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    letterSpacing: 1,
    transition: "all 0.2s",
  }),
  panel: {
    maxWidth: 520,
    margin: "0 auto",
    padding: "0 16px",
  },
  card: {
    background: `linear-gradient(135deg, ${ROYAL_CARD} 0%, #170e30 100%)`,
    border: `1px solid ${ROYAL_BORDER}`,
    borderRadius: 16,
    padding: "20px",
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 3,
    color: GOLD,
    opacity: 0.8,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  numGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: 7,
    marginBottom: 12,
  },
  numBtn: (selected) => ({
    background: selected
      ? `linear-gradient(135deg, ${GOLD_DARK} 0%, ${GOLD} 100%)`
      : "rgba(255,255,255,0.04)",
    border: `1px solid ${selected ? GOLD : ROYAL_BORDER}`,
    borderRadius: 8,
    color: selected ? "#0D0A1A" : "#c0b0e0",
    fontWeight: selected ? 800 : 500,
    fontSize: 13,
    padding: "9px 0",
    cursor: "pointer",
    transition: "all 0.15s",
    boxShadow: selected ? `0 0 12px ${GOLD}44` : "none",
  }),
  selRow: {
    minHeight: 40,
    background: "rgba(0,0,0,0.3)",
    border: `1px dashed ${ROYAL_BORDER}`,
    borderRadius: 10,
    padding: "8px 12px",
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  selPill: {
    background: `linear-gradient(135deg, ${GOLD_DARK} 0%, ${GOLD} 100%)`,
    color: "#0D0A1A",
    borderRadius: 6,
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 800,
  },
  actionBtn: (variant) => ({
    width: "100%",
    padding: "13px",
    borderRadius: 10,
    border: `1px solid ${
      variant === "green" ? "#1a6b3a" :
      variant === "red" ? "#6b1a1a" :
      variant === "gold" ? GOLD_DARK : ROYAL_BORDER
    }`,
    background: variant === "green" ? "linear-gradient(135deg, #0d3a1e 0%, #1a5c30 100%)"
      : variant === "red" ? "linear-gradient(135deg, #3a0d0d 0%, #5c1a1a 100%)"
      : variant === "gold" ? `linear-gradient(135deg, ${GOLD_DARK} 0%, ${GOLD} 100%)`
      : "rgba(255,255,255,0.05)",
    color: variant === "gold" ? "#0D0A1A" : variant === "green" ? "#5ddb8a" : variant === "red" ? "#e87070" : "#8070a0",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    letterSpacing: 1,
    transition: "all 0.2s",
    boxShadow: variant === "gold" ? `0 4px 20px ${GOLD}44` : "none",
  }),
  ticketRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    border: `1px solid ${ROYAL_BORDER}`,
    borderRadius: 10,
    marginBottom: 8,
    background: "rgba(0,0,0,0.2)",
  },
  tPill: {
    background: "rgba(201,168,76,0.15)",
    border: `1px solid ${GOLD_DARK}`,
    color: GOLD,
    borderRadius: 6,
    padding: "2px 8px",
    fontSize: 12,
    fontWeight: 700,
    marginRight: 4,
  },
  winPill: {
    background: `linear-gradient(135deg, ${GOLD_DARK} 0%, ${GOLD} 100%)`,
    color: "#0D0A1A",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 20,
    fontWeight: 900,
    marginRight: 8,
    marginBottom: 4,
    boxShadow: `0 0 18px ${GOLD}55`,
  },
  divider: {
    height: 1,
    background: `linear-gradient(90deg, transparent, ${ROYAL_BORDER}, transparent)`,
    margin: "16px 0",
  },
  betChip: (color) => ({
    padding: "6px 16px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    border: `1px solid ${color}44`,
    background: `${color}18`,
    color: color,
    transition: "all 0.15s",
  }),
  histPill: (color) => ({
    borderRadius: 6,
    padding: "3px 9px",
    fontSize: 12,
    fontWeight: 700,
    background: color === "red" ? "#3a100a" : color === "green" ? "#0a2a12" : "#1a1a2e",
    color: color === "red" ? "#e87070" : color === "green" ? "#5ddb8a" : "#a0a0c0",
    border: `1px solid ${color === "red" ? "#6b1a1a" : color === "green" ? "#1a6b3a" : ROYAL_BORDER}`,
    marginRight: 5,
    marginBottom: 5,
    display: "inline-block",
  }),
};

function RouletteWheel({ spinning, result, onSpinComplete }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const angleRef = useRef(0);

  const draw = useCallback((angle) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cx = 140, cy = 140, r = 132, inner = 42;
    const slots = 37;
    const slice = (2 * Math.PI) / slots;
    ctx.clearRect(0, 0, 280, 280);

    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, 2 * Math.PI);
    ctx.fillStyle = "#1a0838";
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let i = 0; i < slots; i++) {
      const start = angle + i * slice;
      const num = i;
      const isRed = RED_NUMS.has(num);
      const isGreen = num === 0;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + slice);
      ctx.closePath();
      ctx.fillStyle = isGreen ? "#0d3a1e" : isRed ? "#3a0d0d" : "#0d0a1a";
      ctx.fill();
      ctx.strokeStyle = GOLD_DARK;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + slice / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = isGreen ? "#5ddb8a" : isRed ? "#e87070" : "#a090c0";
      ctx.font = "bold 10px 'Segoe UI', sans-serif";
      ctx.fillText(num, r - 8, 4);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, 2 * Math.PI);
    ctx.fillStyle = ROYAL_MID;
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = "bold 13px 'Segoe UI', sans-serif";
    ctx.fillStyle = GOLD;
    ctx.textAlign = "center";
    ctx.fillText("786", cx, cy + 5);

    ctx.beginPath();
    ctx.moveTo(cx, cy - r - 2);
    ctx.lineTo(cx - 9, cy - r + 16);
    ctx.lineTo(cx + 9, cy - r + 16);
    ctx.closePath();
    ctx.fillStyle = "#e84444";
    ctx.fill();
    ctx.strokeStyle = "#ff6666";
    ctx.lineWidth = 1;
    ctx.stroke();
  }, []);

  useEffect(() => {
    draw(angleRef.current);
  }, [draw]);

  useEffect(() => {
    if (!spinning) return;
    const slots = 37;
    const slice = (2 * Math.PI) / slots;
    const totalRot = Math.PI * 2 * (10 + Math.random() * 6);
    const target = totalRot + (result * slice);
    const duration = 4500;
    const start = performance.now();
    const startAngle = angleRef.current;

    function easeOut(t) { return 1 - Math.pow(1 - t, 4); }

    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      angleRef.current = startAngle + target * easeOut(t);
      draw(angleRef.current);
      if (t < 1) { animRef.current = requestAnimationFrame(frame); }
      else { onSpinComplete(); }
    }
    animRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animRef.current);
  }, [spinning, result, draw, onSpinComplete]);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={280}
      style={{ borderRadius: "50%", display: "block", margin: "0 auto" }}
    />
  );
}

function LotteryPanel({ coins, setCoins }) {
  const [selected, setSelected] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [ticketId, setTicketId] = useState(1);
  const [result, setResult] = useState(null);

  const toggle = (n) => {
    setSelected(prev =>
      prev.includes(n) ? prev.filter(x => x !== n)
        : prev.length < 5 ? [...prev, n] : prev
    );
  };

  const buy = () => {
    if (selected.length < 5 || coins < 50) return;
    setCoins(c => c - 50);
    setTickets(prev => [...prev, { id: ticketId, nums: [...selected].sort((a,b)=>a-b) }]);
    setTicketId(i => i + 1);
    setSelected([]);
  };

  const draw = () => {
    const pool = Array.from({ length: 30 }, (_, i) => i + 1);
    const winning = [];
    while (winning.length < 5) {
      const idx = Math.floor(Math.random() * pool.length);
      winning.push(pool.splice(idx, 1)[0]);
    }
    winning.sort((a, b) => a - b);
    const winners = tickets.filter(t => t.nums.every(n => winning.includes(n)));
    if (winners.length > 0) setCoins(c => c + 500);
    setResult({ winning, winners });
  };

  const reset = () => { setTickets([]); setSelected([]); setResult(null); };

  return (
    <div style={styles.panel}>
      <div style={{ height: 16 }} />
      <div style={styles.card}>
        <div style={styles.cardTitle}>Apne 5 numbers chuniye (1–30)</div>
        <div style={styles.numGrid}>
          {Array.from({ length: 30 }, (_, i) => i + 1).map(n => (
            <button key={n} style={styles.numBtn(selected.includes(n))} onClick={() => toggle(n)}>
              {n}
            </button>
          ))}
        </div>
        <div style={styles.selRow}>
          {selected.length === 0
            ? <span style={{ color: "#6050a0", fontSize: 13 }}>Koi number nahi chuna...</span>
            : selected.slice().sort((a,b)=>a-b).map(n => <span key={n} style={styles.selPill}>{n}</span>)
          }
        </div>
        <button
          style={styles.actionBtn("gold")}
          disabled={selected.length < 5 || coins < 50}
          onClick={buy}
        >
          ✦ Ticket Kharido — 50 Coins
        </button>
      </div>

      {tickets.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>Meri Tickets</div>
          {tickets.map(t => (
            <div key={t.id} style={styles.ticketRow}>
              <div>{t.nums.map(n => <span key={n} style={styles.tPill}>{n}</span>)}</div>
              <span style={{ fontSize: 11, color: "#6050a0" }}>#{String(t.id).padStart(3, "0")}</span>
            </div>
          ))}
          {!result && (
            <button style={{ ...styles.actionBtn("red"), marginTop: 12 }} onClick={draw}>
              ◆ Lucky Draw Chalao!
            </button>
          )}
        </div>
      )}

      {result && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>Winning Numbers</div>
          <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 16 }}>
            {result.winning.map(n => <span key={n} style={styles.winPill}>{n}</span>)}
          </div>
          <div style={styles.divider} />
          {result.winners.length > 0 ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: GOLD, marginBottom: 4 }}>🏆 Jackpot!</div>
              <div style={{ color: "#5ddb8a", fontSize: 14 }}>+500 Coins jeete!</div>
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "#8070a0", fontSize: 14 }}>
              Is baar kismat ne saath nahi diya. Dobara try karo!
            </div>
          )}
          <button style={{ ...styles.actionBtn(""), marginTop: 16 }} onClick={reset}>
            Naya Game Khelna Hai
          </button>
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
  const [msg, setMsg] = useState(null);
  const [history, setHistory] = useState([]);

  const addBet = (v) => setBet(b => Math.min(b + v, coins));
  const clearBet = () => setBet(0);

  const getColor = (n) => n === 0 ? "green" : RED_NUMS.has(n) ? "red" : "black";

  const spin = () => {
    if (bet === 0 || spinning) return;
    if (bet > coins) return;
    setCoins(c => c - bet);
    const num = Math.floor(Math.random() * 37);
    setResultNum(num);
    setSpinResult(null);
    setMsg(null);
    setSpinning(true);
  };

  const onSpinComplete = useCallback(() => {
    setSpinning(false);
    const num = resultNum;
    const color = getColor(num);
    let win = false;
    if (betType === "red") win = color === "red";
    else if (betType === "black") win = color === "black";
    else if (betType === "even") win = num !== 0 && num % 2 === 0;
    else if (betType === "odd") win = num !== 0 && num % 2 !== 0;
    else if (betType === "low") win = num >= 1 && num <= 18;
    else if (betType === "high") win = num >= 19 && num <= 36;
    else if (betType === "number") win = num === exactNum;
    const mult = betType === "number" ? 35 : 2;
    const prize = win ? bet * mult : 0;
    if (win) setCoins(c => c + prize);
    setSpinResult({ num, color, win, prize });
    setMsg(win ? `Jeet gaye! +${prize} Coins` : `Haar gaye! -${bet} Coins`);
    setHistory(h => [{ num, color }, ...h].slice(0, 14));
  }, [resultNum, betType, exactNum, bet, setCoins]);

  return (
    <div style={styles.panel}>
      <div style={{ height: 16 }} />
      <div style={styles.card}>
        <div style={styles.cardTitle}>Roulette Wheel</div>
        <RouletteWheel spinning={spinning} result={resultNum} onSpinComplete={onSpinComplete} />
        {spinResult && (
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <span style={{
              fontSize: 32,
              fontWeight: 900,
              color: spinResult.color === "red" ? "#e87070" : spinResult.color === "green" ? "#5ddb8a" : "#c0b0e0",
            }}>{spinResult.num}</span>
            <div style={{
              fontSize: 15,
              fontWeight: 700,
              marginTop: 4,
              color: spinResult.win ? "#5ddb8a" : "#e87070"
            }}>{msg}</div>
          </div>
        )}
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Bet Lagao</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {[10, 50, 100, 200].map(v => (
            <button key={v} style={styles.betChip(v === 10 ? "#378ADD" : v === 50 ? "#1D9E75" : v === 100 ? GOLD : "#D85A30")} onClick={() => addBet(v)}>
              +{v}
            </button>
          ))}
          <button style={styles.betChip("#8070a0")} onClick={clearBet}>Clear</button>
        </div>
        <div style={{ fontSize: 14, color: "#a090c0", marginBottom: 12 }}>
          Bet: <span style={{ color: GOLD, fontWeight: 700 }}>{bet} Coins</span>
        </div>
        <select
          value={betType}
          onChange={e => setBetType(e.target.value)}
          style={{
            width: "100%", padding: "9px 12px", borderRadius: 8, marginBottom: 10,
            background: ROYAL_MID, border: `1px solid ${ROYAL_BORDER}`,
            color: "#e0d0f0", fontSize: 13, outline: "none",
          }}
        >
          <option value="red">Red (2x)</option>
          <option value="black">Black (2x)</option>
          <option value="even">Even (2x)</option>
          <option value="odd">Odd (2x)</option>
          <option value="low">Low 1–18 (2x)</option>
          <option value="high">High 19–36 (2x)</option>
          <option value="number">Exact Number (35x)</option>
        </select>
        {betType === "number" && (
          <input
            type="number" min={0} max={36} value={exactNum}
            onChange={e => setExactNum(parseInt(e.target.value))}
            style={{
              width: "100%", padding: "9px 12px", borderRadius: 8, marginBottom: 10,
              background: ROYAL_MID, border: `1px solid ${ROYAL_BORDER}`,
              color: "#e0d0f0", fontSize: 13, outline: "none",
            }}
          />
        )}
        <button
          style={styles.actionBtn("gold")}
          onClick={spin}
          disabled={spinning || bet === 0}
        >
          {spinning ? "Spinning..." : "◈ Spin Karo!"}
        </button>
      </div>

      {history.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>Pichle Results</div>
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {history.map((h, i) => (
              <span key={i} style={styles.histPill(h.color)}>{h.num}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RoyalWin786() {
  const [coins, setCoins] = useState(1000);
  const [tab, setTab] = useState("lottery");

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <h1 style={styles.logo}>ROYALWIN786</h1>
        <div style={styles.logoSub}>Premium Gaming Experience</div>
        <div style={styles.coinBar}>
          <span style={{ fontSize: 18, color: GOLD }}>✦</span>
          <div style={styles.coinBadge}>{coins.toLocaleString()} Coins</div>
          <span style={{ fontSize: 18, color: GOLD }}>✦</span>
        </div>
      </div>

      <div style={styles.tabs}>
        <button style={styles.tab(tab === "lottery")} onClick={() => setTab("lottery")}>
          ◆ Lottery
        </button>
        <button style={styles.tab(tab === "roulette")} onClick={() => setTab("roulette")}>
          ◈ Roulette
        </button>
      </div>

      <div style={{
        maxWidth: 552,
        margin: "0 auto",
        borderTop: `1px solid ${ROYAL_BORDER}`,
      }}>
        {tab === "lottery"
          ? <LotteryPanel coins={coins} setCoins={setCoins} />
          : <RoulettePanel coins={coins} setCoins={setCoins} />
        }
      </div>

      <div style={{ textAlign: "center", marginTop: 24, color: "#4a3a6a", fontSize: 11, letterSpacing: 2 }}>
        ROYALWIN786 · ENTERTAINMENT ONLY · 18+
      </div>
    </div>
  );
}
