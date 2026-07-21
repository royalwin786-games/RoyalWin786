import { useEffect, useRef, useState } from "react";

const reportItems = [
  { icon: "chart", label: "Net Sales Report", screen: "orders" },
  { icon: "money", label: "Sold / Unsold", screen: "orders" },
  { icon: "clipboard", label: "Stock Summary", screen: "stock" },
  { icon: "cart", label: "Unsold Entry", screen: "stock" },
  { icon: "purchase", label: "Purchase Report", screen: "orders" },
  { icon: "document", label: "Unsold Details", screen: "orders" },
  { icon: "arrange", label: "Series Arrange", screen: "stock" },
];

const orderGroups = [
  { name: "ROYALWIN GOLD WEEKLY DRAW", code: "RW1230", date: "15/01/2026" },
  { name: "ROYALWIN DIAMOND WEEKLY DRAW", code: "RW1223", date: "15/01/2026" },
];

const lotteryNumbers = Array.from({ length: 36 }, (_, index) => index + 1);
const rouletteNumbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27];
const redRouletteNumbers = new Set([32, 19, 21, 25, 34, 27]);
const initialPlayerTickets = [
  { id: "RW786-2048", numbers: [4, 7, 12, 18, 24, 31], draw: "RoyalWin Super 7", status: "Upcoming" },
];

function Icon({ name, size = 24, strokeWidth = 1.8 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const paths = {
    clock: <><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></>,
    logout: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="m10 8 4 4-4 4M14 12H3"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2M15 17h2"/></>,
    chart: <><path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16"/><path d="M8 17v-3M12 17V9M16 17v-5M7 7h10"/></>,
    money: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h3M14 12h3M7 16h10M12 10v4"/></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 9h8M8 13h5M8 17h3"/><circle cx="17" cy="17" r="3"/><path d="m16 17 1 1 2-2"/></>,
    cart: <><path d="M3 4h2l2 11h10l2-7H7M9 19h.01M17 19h.01"/></>,
    purchase: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 9h2M8 13h2M8 17h2M13 9h3M13 13h3M13 17h3"/></>,
    document: <><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7"/><path d="m9 8 1 1 2-2"/></>,
    arrange: <><rect x="3" y="4" width="5" height="5" rx="1"/><rect x="16" y="4" width="5" height="5" rx="1"/><rect x="3" y="15" width="5" height="5" rx="1"/><rect x="16" y="15" width="5" height="5" rx="1"/><path d="M8 6h8M18 9v6M16 18H8M6 15V9"/></>,
    trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0zM12 13v4M8 21h8M9 17h6M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4"/></>,
    cube: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9"/></>,
    ticket: <><path d="M4 7a2 2 0 0 0 0 4v6h16v-6a2 2 0 0 0 0-4V5H4zM9 8v1M9 12v1M9 16v1"/></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.5"/></>,
    back: <><path d="m15 5-7 7 7 7"/></>,
    reset: <><path d="M4 4v6h6M5.5 15a7 7 0 1 0 1-7"/></>,
    delete: <><path d="m8 8-3 4 3 4h11V8zM12 10l4 4M16 10l-4 4"/></>,
    qr: <><path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM19 15h2v6h-2zM15 19h2v2h-2z"/></>,
    copy: <><rect x="8" y="7" width="10" height="13" rx="2"/><path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2"/></>,
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
    shield: <><path d="M12 3 4 6v5c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6z"/><path d="m9 12 2 2 4-5"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
    game: <><path d="M8 9h8a5 5 0 0 1 4.8 6.4l-1 3.1a2 2 0 0 1-3.3.8L14 17h-4l-2.5 2.3a2 2 0 0 1-3.3-.8l-1-3.1A5 5 0 0 1 8 9z"/><path d="M8 13v4M6 15h4M16 14h.01M18 16h.01"/></>,
    wallet: <><path d="M4 6h14a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h12"/><path d="M15 11h6v5h-6a2.5 2.5 0 0 1 0-5z"/></>,
    sparkle: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2zM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8zM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/></>,
  };

  return <svg {...common}>{paths[name] || paths.ticket}</svg>;
}

function BrandMark({ compact = false }) {
  return (
    <div className={`brand-mark ${compact ? "brand-mark--compact" : ""}`} aria-label="RoyalWin786 logo">
      <img src={`${process.env.PUBLIC_URL}/royalwin786-logo.png`} alt="" />
    </div>
  );
}

function AppFrame({ children, className = "" }) {
  return (
    <main className={`app-frame ${className}`}>
      <div className="blob blob--blue"/><div className="blob blob--yellow"/>
      <div className="screen-body">{children}</div>
    </main>
  );
}

function Brand({ showVersion = false }) {
  return (
    <section className="brand-block">
      <span className="brand-kicker">India's premium draw experience</span>
      <BrandMark />
      <h1>RoyalWin<span>786</span></h1>
      <p>Play the weekly lottery, follow live results and enjoy bonus games.</p>
      <div className="brand-benefits" aria-label="Platform benefits">
        <span><Icon name="shield" size={18}/>Secure player access</span>
        <span><Icon name="trophy" size={18}/>Weekly lottery</span>
        <span><Icon name="game" size={18}/>Bonus games</span>
      </div>
      {showVersion && <small>RoyalWin Web &amp; App • v2.0</small>}
    </section>
  );
}

function PlayerLogin({ mobile, setMobile, onContinue, onRegister, onAdmin }) {
  const valid = mobile.replace(/\D/g, "").length === 10;
  return (
    <AppFrame className="auth-frame player-auth-frame">
      <div className="otp-screen player-login-screen">
        <button type="button" className="admin-access-link" onClick={onAdmin}><Icon name="lock" size={16}/>Admin Login</button>
        <Brand />
        <section className="auth-card otp-card">
          <div className="auth-card-heading"><span>Players &amp; users</span><h2>Play with RoyalWin786</h2><p>Enter your registered mobile number to access lottery tickets, results and games.</p></div>
          <label className="phone-input">
            <strong>+91</strong><span/><input value={mobile} inputMode="numeric" maxLength={10} placeholder="Enter mobile number" onChange={(event) => setMobile(event.target.value.replace(/\D/g, ""))}/>
          </label>
          <button type="button" className="primary-button" disabled={!valid} onClick={onContinue}>Request OTP</button>
          <button type="button" className="text-button" onClick={onRegister}>New player? <strong>Create account</strong></button>
          <p className="secure-note"><Icon name="shield" size={16}/>Your login is protected with secure verification.</p>
        </section>
      </div>
    </AppFrame>
  );
}

function PlayerMpinLogin({ mobile, onLogin, onBack }) {
  const [mpin, setMpin] = useState(["", "", "", ""]);
  const refs = useRef([]);
  const [biometric, setBiometric] = useState(false);
  const valid = mpin.every(Boolean);

  const changeDigit = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setMpin((current) => current.map((item, itemIndex) => itemIndex === index ? digit : item));
    if (digit && refs.current[index + 1]) refs.current[index + 1].focus();
  };

  return (
    <AppFrame className="auth-frame">
      <div className="mpin-screen">
        <Brand showVersion />
        <section className="auth-card mpin-card">
          <button type="button" className="auth-back-link" onClick={onBack}>← Change mobile number</button>
          <div className="auth-card-heading"><span>Player verification</span><h2>Hello {mobile || "9769980248"}</h2><p>Enter your MPIN to open the RoyalWin786 player lobby.</p></div>
          <div className="login-methods"><button type="button" className="outline-pill">Biometric</button><button type="button" className="solid-pill">MPIN</button></div>
          <label className="mpin-label">Enter MPIN</label>
          <div className="mpin-row">
            {mpin.map((digit, index) => <input key={index} ref={(node) => { refs.current[index] = node; }} type="password" inputMode="numeric" maxLength={1} value={digit} placeholder="•" aria-label={`MPIN digit ${index + 1}`} onChange={(event) => changeDigit(index, event.target.value)} />)}
          </div>
          <button type="button" className="forgot-button">Forgot MPIN</button>
          <div className="biometric-row"><strong>Enable Biometric</strong><button type="button" aria-pressed={biometric} aria-label="Enable biometric" className={`toggle ${biometric ? "toggle--on" : ""}`} onClick={() => setBiometric((value) => !value)}><span/></button></div>
        </section>
        <button type="button" className="login-action" disabled={!valid} onClick={onLogin}>Enter Player Lobby</button>
      </div>
    </AppFrame>
  );
}

function AdminLogin({ onBack, onLogin }) {
  const [credentials, setCredentials] = useState({ userId: "", password: "" });
  const valid = credentials.userId.trim() && credentials.password.trim();
  const update = (field, value) => setCredentials((current) => ({ ...current, [field]: value }));

  return (
    <AppFrame className="auth-frame admin-auth-frame">
      <div className="otp-screen admin-login-screen">
        <Brand />
        <form className="auth-card otp-card admin-login-card" onSubmit={(event) => { event.preventDefault(); if (valid) onLogin(); }}>
          <button type="button" className="auth-back-link" onClick={onBack}>← Back to player login</button>
          <div className="auth-card-heading"><span>Restricted access</span><h2>Admin Console</h2><p>Use your authorized admin credentials to manage stock, reports and draw operations.</p></div>
          <label className="credential-input"><span><Icon name="user" size={20}/></span><input value={credentials.userId} autoComplete="username" placeholder="Admin ID or email" onChange={(event) => update("userId", event.target.value)}/></label>
          <label className="credential-input"><span><Icon name="lock" size={20}/></span><input type="password" value={credentials.password} autoComplete="current-password" placeholder="Password" onChange={(event) => update("password", event.target.value)}/></label>
          <button type="submit" className="primary-button admin-login-button" disabled={!valid}>Secure Admin Login</button>
          <p className="secure-note"><Icon name="shield" size={16}/>Credentials must be validated by your secure backend before production launch.</p>
        </form>
      </div>
    </AppFrame>
  );
}

function PlayerHeader({ active, onNavigate, onLogout }) {
  const items = [
    { label: "Lobby", icon: "home", screen: "player-dashboard" },
    { label: "Lottery", icon: "ticket", screen: "player-lottery" },
    { label: "My Tickets", icon: "document", screen: "player-tickets" },
    { label: "Roulette", icon: "game", screen: "player-roulette" },
  ];
  return (
    <header className="app-header player-header">
      <button type="button" className="header-brand header-brand-button" onClick={() => onNavigate("player-dashboard")}><BrandMark compact/><span><strong>RoyalWin786</strong><small>Player Hub</small></span></button>
      <nav className="desktop-nav" aria-label="Player navigation">
        {items.map((item) => <button type="button" key={item.screen} className={active === item.screen ? "active" : ""} onClick={() => onNavigate(item.screen)}><Icon name={item.icon} size={18}/>{item.label}</button>)}
      </nav>
      <button type="button" className="icon-button logout-button" aria-label="Logout" onClick={onLogout}><Icon name="logout" size={24}/><span>Logout</span></button>
    </header>
  );
}

function PlayerBottomMenu({ active, onNavigate }) {
  const items = [
    { label: "Home", icon: "home", screen: "player-dashboard" },
    { label: "Lottery", icon: "ticket", screen: "player-lottery" },
    { label: "Roulette", icon: "game", screen: "player-roulette" },
    { label: "Tickets", icon: "document", screen: "player-tickets" },
  ];
  return (
    <nav className="bottom-menu player-bottom-menu" aria-label="Player navigation">
      {items.map((item) => <button type="button" key={item.screen} className={active === item.screen ? "active" : ""} onClick={() => onNavigate(item.screen)}><span><Icon name={item.icon} size={25}/></span><small>{item.label}</small></button>)}
    </nav>
  );
}

function PlayerLayout({ active, onNavigate, onLogout, children, className = "" }) {
  return (
    <AppFrame className={`dashboard-frame player-frame ${className}`}>
      <div className="player-screen">
        <PlayerHeader active={active} onNavigate={onNavigate} onLogout={onLogout}/>
        <div className="player-content">{children}</div>
        <PlayerBottomMenu active={active} onNavigate={onNavigate}/>
      </div>
    </AppFrame>
  );
}

function PlayerDashboard({ tickets, onNavigate, onLogout }) {
  const latestTicket = tickets[0];
  return (
    <PlayerLayout active="player-dashboard" onNavigate={onNavigate} onLogout={onLogout}>
      <div className="player-welcome"><div><span>PLAYER LOBBY</span><h1>Good afternoon, Rahul</h1><p>Your next RoyalWin chance is ready.</p></div><div className="player-points"><Icon name="wallet" size={21}/><span>Demo points<strong>2,450</strong></span></div></div>

      <section className="lottery-hero">
        <div className="lottery-hero-copy">
          <span className="game-kicker"><Icon name="trophy" size={18}/>Main game • Weekly lottery</span>
          <h2>RoyalWin Super 7</h2>
          <p>Choose 6 lucky numbers and join the next premium weekly draw.</p>
          <div className="jackpot-label">Featured jackpot<strong>₹25,00,000</strong></div>
          <button type="button" onClick={() => onNavigate("player-lottery")}>Choose lottery numbers <span>→</span></button>
        </div>
        <div className="lottery-hero-side">
          <span>Draw closes in</span>
          <Countdown />
          <p>Sunday • 08:00 PM</p>
        </div>
      </section>

      <section className="player-stats" aria-label="Player account summary">
        <article><span><Icon name="ticket" size={24}/></span><p>Active tickets<strong>{tickets.length}</strong></p></article>
        <article><span><Icon name="trophy" size={24}/></span><p>Latest result<strong>04 • 12 • 18 • 24 • 31 • 35</strong></p></article>
        <article><span><Icon name="sparkle" size={24}/></span><p>Reward points<strong>2,450</strong></p></article>
      </section>

      <section className="player-section game-lobby-section">
        <div className="player-section-heading"><div><span>PLAY</span><h2>Choose your game</h2></div><p>Lottery remains the main RoyalWin786 experience.</p></div>
        <div className="game-choice-grid">
          <button type="button" className="game-choice-card game-choice-card--lottery" onClick={() => onNavigate("player-lottery")}>
            <span className="game-badge">PRIMARY</span><Icon name="ticket" size={42}/><h3>Weekly Lottery</h3><p>Pick 6 numbers for the RoyalWin Super 7 draw.</p><strong>Play lottery →</strong>
          </button>
          <button type="button" className="game-choice-card game-choice-card--roulette" onClick={() => onNavigate("player-roulette")}>
            <span className="game-badge">BONUS GAME</span><Icon name="game" size={42}/><h3>Royal Roulette</h3><p>A quick demo-points game between weekly draws.</p><strong>Open roulette →</strong>
          </button>
        </div>
      </section>

      <section className="player-section ticket-preview-section">
        <div className="player-section-heading"><div><span>MY PLAY</span><h2>Latest ticket</h2></div><button type="button" onClick={() => onNavigate("player-tickets")}>View all</button></div>
        {latestTicket ? <article className="player-ticket-card"><div><span>{latestTicket.status}</span><h3>{latestTicket.draw}</h3><p>Ticket #{latestTicket.id}</p></div><div className="ticket-balls">{latestTicket.numbers.map((number) => <strong key={number}>{String(number).padStart(2, "0")}</strong>)}</div></article> : <p className="empty-state">No tickets yet. Choose your lottery numbers to get started.</p>}
      </section>
      <p className="responsible-note"><Icon name="shield" size={16}/>Demo experience only. Play responsibly and follow local age and gaming regulations.</p>
    </PlayerLayout>
  );
}

function LotteryGame({ onNavigate, onLogout, onSave }) {
  const [selected, setSelected] = useState([]);
  const [saved, setSaved] = useState(false);
  const toggleNumber = (number) => {
    setSaved(false);
    setSelected((current) => current.includes(number) ? current.filter((item) => item !== number) : current.length < 6 ? [...current, number].sort((a, b) => a - b) : current);
  };
  const quickPick = () => {
    const picks = [...lotteryNumbers].sort(() => Math.random() - .5).slice(0, 6).sort((a, b) => a - b);
    setSelected(picks);
    setSaved(false);
  };
  const saveTicket = () => {
    if (selected.length !== 6) return;
    onSave(selected);
    setSaved(true);
  };
  return (
    <PlayerLayout active="player-lottery" onNavigate={onNavigate} onLogout={onLogout} className="player-game-frame">
      <div className="game-page-heading"><div><span>MAIN GAME</span><h1>RoyalWin Super 7</h1><p>Select exactly 6 numbers for the upcoming weekly lottery.</p></div><div><span>Draw closes</span><strong>Sunday • 08:00 PM</strong></div></div>
      <div className="lottery-game-layout">
        <section className="content-card number-picker-card">
          <div className="picker-heading"><div><span>YOUR NUMBERS</span><h2>{selected.length}/6 selected</h2></div><button type="button" onClick={quickPick}><Icon name="sparkle" size={18}/>Quick Pick</button></div>
          <div className="lottery-number-grid">{lotteryNumbers.map((number) => <button type="button" key={number} className={selected.includes(number) ? "selected" : ""} aria-pressed={selected.includes(number)} onClick={() => toggleNumber(number)}>{number}</button>)}</div>
        </section>
        <aside className="content-card ticket-builder-card">
          <span className="game-kicker"><Icon name="ticket" size={18}/>Your lottery ticket</span>
          <h2>RoyalWin Super 7</h2><p>Weekly draw • RW-S7-042</p>
          <div className="ticket-balls ticket-balls--large">{Array.from({ length: 6 }, (_, index) => <strong key={index} className={!selected[index] ? "empty" : ""}>{selected[index] ? String(selected[index]).padStart(2, "0") : "—"}</strong>)}</div>
          <div className="ticket-meta"><span>Entry<strong>100 demo points</strong></span><span>Draw<strong>Sunday, 8 PM</strong></span></div>
          <button type="button" className="primary-button" disabled={selected.length !== 6} onClick={saveTicket}>{saved ? "Ticket saved" : "Save demo ticket"}</button>
          {saved && <button type="button" className="text-button" onClick={() => onNavigate("player-tickets")}>View my tickets →</button>}
        </aside>
      </div>
      <p className="responsible-note"><Icon name="shield" size={16}/>No payment or cash-out is connected. Production ticket purchase requires secure backend and regulatory checks.</p>
    </PlayerLayout>
  );
}

function PlayerTickets({ tickets, onNavigate, onLogout }) {
  return (
    <PlayerLayout active="player-tickets" onNavigate={onNavigate} onLogout={onLogout} className="player-game-frame">
      <div className="game-page-heading"><div><span>MY PLAY</span><h1>My lottery tickets</h1><p>Track saved numbers and upcoming RoyalWin786 draws.</p></div><button type="button" className="heading-action" onClick={() => onNavigate("player-lottery")}>+ New ticket</button></div>
      <section className="ticket-list">
        {tickets.map((ticket) => <article className="player-ticket-card player-ticket-card--full" key={ticket.id}><div><span>{ticket.status}</span><h3>{ticket.draw}</h3><p>Ticket #{ticket.id} • Sunday, 08:00 PM</p></div><div className="ticket-balls">{ticket.numbers.map((number) => <strong key={number}>{String(number).padStart(2, "0")}</strong>)}</div><button type="button">View ticket</button></article>)}
      </section>
      <p className="responsible-note"><Icon name="shield" size={16}/>Ticket records shown here are frontend demo data until the player API is connected.</p>
    </PlayerLayout>
  );
}

function RouletteGame({ onNavigate, onLogout }) {
  const [choice, setChoice] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const spin = () => {
    if (!choice || spinning) return;
    setSpinning(true);
    setResult(null);
    window.setTimeout(() => {
      const number = rouletteNumbers[Math.floor(Math.random() * rouletteNumbers.length)];
      const color = number === 0 ? "Green" : redRouletteNumbers.has(number) ? "Red" : "Black";
      const won = choice === color || (choice === "Even" && number !== 0 && number % 2 === 0) || (choice === "Odd" && number % 2 === 1);
      setResult({ number, color, won });
      setSpinning(false);
    }, 1800);
  };
  return (
    <PlayerLayout active="player-roulette" onNavigate={onNavigate} onLogout={onLogout} className="player-game-frame roulette-frame">
      <div className="game-page-heading"><div><span>BONUS GAME</span><h1>Royal Roulette</h1><p>A quick demo-points game. Weekly lottery remains the main RoyalWin786 game.</p></div><div className="demo-balance"><Icon name="wallet" size={20}/><span>Demo balance<strong>500 points</strong></span></div></div>
      <div className="roulette-layout">
        <section className="roulette-stage">
          <div className="roulette-pointer"/>
          <div className={`roulette-wheel ${spinning ? "spinning" : ""}`}>
            {rouletteNumbers.map((number, index) => <span key={number} style={{ "--wheel-index": index }}>{number}</span>)}
            <div className="roulette-center"><BrandMark compact/></div>
          </div>
          {result && <div className={`roulette-result ${result.won ? "won" : "lost"}`}><span>Result</span><strong>{result.number} • {result.color}</strong><p>{result.won ? "You won 100 demo points!" : "Try again on the next spin."}</p></div>}
        </section>
        <aside className="content-card roulette-controls">
          <span className="game-kicker"><Icon name="game" size={18}/>Place a demo choice</span>
          <h2>Choose one option</h2><p>This game uses demo points only—no deposits or cash-out.</p>
          <div className="roulette-choices">{["Red", "Black", "Even", "Odd"].map((item) => <button type="button" key={item} className={`${item.toLowerCase()} ${choice === item ? "selected" : ""}`} onClick={() => { setChoice(item); setResult(null); }}>{item}</button>)}</div>
          <div className="demo-stake"><span>Demo stake</span><strong>50 points</strong></div>
          <button type="button" className="primary-button" disabled={!choice || spinning} onClick={spin}>{spinning ? "Spinning…" : "Spin roulette"}</button>
          <button type="button" className="text-button" onClick={() => onNavigate("player-lottery")}>Back to main lottery</button>
        </aside>
      </div>
      <p className="responsible-note"><Icon name="shield" size={16}/>For entertainment/demo only. Production use requires age checks, responsible-play controls and local regulatory approval.</p>
    </PlayerLayout>
  );
}

function AppHeader({ onLogout, onNavigate }) {
  return (
    <header className="app-header">
      <div className="header-brand"><BrandMark compact/><span><strong>RoyalWin786</strong><small>Partner Console</small></span></div>
      <nav className="desktop-nav" aria-label="Desktop navigation">
        <button type="button" className="active"><Icon name="home" size={18}/>Overview</button>
        <button type="button" onClick={() => onNavigate("orders")}><Icon name="trophy" size={18}/>Results</button>
        <button type="button" onClick={() => onNavigate("stock")}><Icon name="cube" size={18}/>Stock</button>
        <button type="button" onClick={() => onNavigate("orders")}><Icon name="document" size={18}/>Orders</button>
      </nav>
      <button type="button" className="icon-button logout-button" aria-label="Logout" onClick={onLogout}><Icon name="logout" size={24}/><span>Logout</span></button>
    </header>
  );
}

function Countdown() {
  const [seconds, setSeconds] = useState(2 * 3600 + 41 * 60 + 12);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const hours = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return (
    <div className="countdown-row">
      {[{ value: hours, label: "Hour" }, { value: minutes, label: "Minutes" }, { value: secs, label: "Seconds" }].map((item, index) => <div className="countdown-part" key={item.label}><div className="countdown-box"><strong>{item.value}</strong><span>{item.label}</span></div>{index < 2 && <b>:</b>}</div>)}
    </div>
  );
}

function BottomMenu({ onNavigate }) {
  const items = [
    { icon: "home", label: "Overview", screen: "dashboard", active: true },
    { icon: "trophy", label: "Results", screen: "orders" },
    { icon: "cube", label: "Stock", screen: "stock" },
    { icon: "ticket", label: "Verify Ticket", screen: "orders" },
  ];
  return (
    <nav className="bottom-menu" aria-label="Main navigation">
      {items.map((item) => <button type="button" key={item.label} className={item.active ? "active" : ""} onClick={() => onNavigate(item.screen)}><span><Icon name={item.icon} size={27}/></span><small>{item.label}</small></button>)}
    </nav>
  );
}

function Dashboard({ onNavigate, onLogout }) {
  return (
    <AppFrame className="dashboard-frame">
      <div className="dashboard-screen">
        <AppHeader onLogout={onLogout} onNavigate={onNavigate}/>
        <div className="dashboard-content">
          <div className="page-heading"><div><span>Dashboard</span><h1>Good afternoon, partner</h1><p>Here is your RoyalWin786 activity overview.</p></div><button type="button" onClick={() => onNavigate("stock")}>Manage stock <span>→</span></button></div>
          <section className="content-card timer-card">
            <div className="section-heading"><span className="chip"><Icon name="clock" size={19}/>Next draw close</span><h2>Time remaining</h2></div>
            <Countdown />
          </section>
          <section className="content-card latest-card">
            <span className="chip"><i/>Latest draw</span>
            <h2>ROYALWIN GOLD WEEKLY DRAW</h2>
            <div className="draw-grid">
              <div><span className="round-icon"><Icon name="calendar" size={23}/></span><p>Draw Date<strong>15/01/2026</strong></p></div>
              <div><span className="round-icon"><Icon name="clock" size={23}/></span><p>Time<strong>01:00 PM</strong></p></div>
            </div>
          </section>
          <section className="report-grid">
            {reportItems.map((item) => <button type="button" key={item.label} className="report-tile" onClick={() => onNavigate(item.screen)}><span><Icon name={item.icon} size={30}/></span><small>{item.label}</small></button>)}
          </section>
        </div>
        <BottomMenu onNavigate={onNavigate}/>
      </div>
    </AppFrame>
  );
}

function ScreenTopBar({ title, onBack, action }) {
  return (
    <header className="screen-topbar">
      <button type="button" className="back-button" aria-label="Go back" onClick={onBack}><Icon name="back" size={35}/></button>
      <h1>{title}</h1>
      {action || <span className="topbar-spacer"/>}
    </header>
  );
}

function StockScreen({ onBack }) {
  const [fields, setFields] = useState({ from: "", to: "", qty: "" });
  const [activeField, setActiveField] = useState("from");
  const [submitted, setSubmitted] = useState(false);

  const addDigit = (digit) => {
    setFields((current) => ({ ...current, [activeField]: `${current[activeField]}${digit}`.slice(0, 5) }));
    setSubmitted(false);
  };
  const clear = () => { setFields({ from: "", to: "", qty: "" }); setSubmitted(false); };
  const removeDigit = () => setFields((current) => ({ ...current, [activeField]: current[activeField].slice(0, -1) }));
  const bookwise = () => { setFields({ from: "2015", to: "2015", qty: "50" }); setSubmitted(false); };

  return (
    <AppFrame className="details-frame">
      <div className="details-screen stock-screen">
        <ScreenTopBar title="Stock Unsold" onBack={onBack} action={<div className="expiry-pill">5d 4h 6m 1s</div>}/>
        <div className="details-content">
          <section className="content-card stock-summary">
            <div className="summary-top"><span>Draw Date: 20-01-2026</span><button type="button"><Icon name="eye" size={23}/>View Stock</button></div>
            <h2>ROYALWIN PREMIUM WEEKLY DRAW - RW1233</h2>
            <div className="stock-range">
              <div className="stock-tags"><span>Book 50</span><span>Series 00</span></div>
              <div className="stock-values"><p>From<strong>2015</strong></p><p>To<strong>2015</strong></p><p>Qty<strong>50</strong></p><button type="button" aria-label="Reset stock"><Icon name="reset" size={28}/></button></div>
            </div>
          </section>
          <section className="content-card unsold-entry">
            <div className="entry-heading"><h2>Enter Number for Unsold</h2><span>Total Qty : <strong>{fields.qty || 0}</strong></span></div>
            <div className="field-grid">
              {["from", "to", "qty"].map((field) => <button type="button" key={field} className={activeField === field ? "active" : ""} onClick={() => setActiveField(field)}><span>{field[0].toUpperCase() + field.slice(1)}</span><strong>{fields[field] || "—"}</strong></button>)}
            </div>
            {submitted && <p className="submit-message">Unsold quantity submitted successfully.</p>}
          </section>
          <section className="number-pad" aria-label="Number pad">
            {[1,2,3,4,5,6,7,8,9].map((digit) => <button type="button" key={digit} onClick={() => addDigit(digit)}>{digit}</button>)}
            <button type="button" className="clear-key" onClick={clear}>C</button>
            <button type="button" className="delete-key" onClick={removeDigit}><Icon name="delete" size={28}/></button>
            <button type="button" className="qr-key" aria-label="Scan QR"><Icon name="qr" size={28}/></button>
            <button type="button" onClick={() => addDigit(0)}>0</button>
            <button type="button" className="bookwise-key" onClick={bookwise}>Bookwise<br/>Unsold</button>
            <button type="button" className="submit-key" onClick={() => setSubmitted(true)}>Submit</button>
          </section>
        </div>
      </div>
    </AppFrame>
  );
}

function DrawOrder({ draw, cleared }) {
  return (
    <div className="order-group">
      <section className="lottery-order">
        <div className="lottery-order__head"><div><h2>{draw.name}</h2><p>DRAW DATE: {draw.date} • CODE: {draw.code}</p></div><span>Total</span></div>
        <div className="order-bands">{["5/5","10/10","25/25","50/50","100/100"].map((item) => <strong key={item}>{item}</strong>)}</div>
        <div className="order-inputs"><span><Icon name="copy" size={24}/></span>{[0,1,2,3,4].map((item) => <div key={item}>{cleared ? 0 : 0}</div>)}</div>
      </section>
      <section className="lottery-total"><div><h2>{draw.name}<br/>{draw.code}</h2><p>Total tickets for this draw</p></div><span>Grand<strong>0</strong></span></section>
    </div>
  );
}

function OrdersScreen({ onBack }) {
  const [cleared, setCleared] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  return (
    <AppFrame className="details-frame orders-frame">
      <div className="details-screen orders-screen">
        <ScreenTopBar title="View Order List" onBack={onBack} action={<button type="button" className="clear-orders" onClick={() => { setCleared(true); setSubmitted(false); }}>Clear</button>}/>
        <div className="orders-content">
          {orderGroups.map((draw) => <DrawOrder key={draw.code} draw={draw} cleared={cleared}/>) }
        </div>
        <div className="order-footer">
          <div className="grand-total"><span>Grand Total</span><strong>0</strong></div>
          {submitted && <p>Order list submitted.</p>}
          <div><button type="button" className="primary-button" onClick={() => setSubmitted(true)}>Submit</button><button type="button" className="secondary-button" onClick={() => { setCleared(true); setSubmitted(false); }}>Clear</button></div>
        </div>
      </div>
    </AppFrame>
  );
}

export default function App() {
  const [screen, setScreen] = useState(() => {
    if (process.env.NODE_ENV === "development") {
      const previewScreen = new URLSearchParams(window.location.search).get("screen");
      const allowedPreviews = ["player-login", "player-dashboard", "player-lottery", "player-tickets", "player-roulette", "admin-login", "admin-dashboard"];
      if (allowedPreviews.includes(previewScreen)) return previewScreen;
    }
    return "player-login";
  });
  const [mobile, setMobile] = useState("");
  const [playerTickets, setPlayerTickets] = useState(initialPlayerTickets);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [screen]);

  const logout = () => { setMobile(""); setScreen("player-login"); };
  const savePlayerTicket = (numbers) => setPlayerTickets((current) => [{ id: `RW786-${String(Date.now()).slice(-6)}`, numbers, draw: "RoyalWin Super 7", status: "Upcoming" }, ...current]);

  if (screen === "player-login") return <PlayerLogin mobile={mobile} setMobile={setMobile} onContinue={() => setScreen("player-mpin")} onRegister={() => { setMobile("9769980248"); setScreen("player-mpin"); }} onAdmin={() => setScreen("admin-login")}/>;
  if (screen === "player-mpin") return <PlayerMpinLogin mobile={mobile} onBack={() => setScreen("player-login")} onLogin={() => setScreen("player-dashboard")}/>;
  if (screen === "admin-login") return <AdminLogin onBack={() => setScreen("player-login")} onLogin={() => setScreen("admin-dashboard")}/>;
  if (screen === "player-dashboard") return <PlayerDashboard tickets={playerTickets} onNavigate={setScreen} onLogout={logout}/>;
  if (screen === "player-lottery") return <LotteryGame onNavigate={setScreen} onLogout={logout} onSave={savePlayerTicket}/>;
  if (screen === "player-tickets") return <PlayerTickets tickets={playerTickets} onNavigate={setScreen} onLogout={logout}/>;
  if (screen === "player-roulette") return <RouletteGame onNavigate={setScreen} onLogout={logout}/>;
  if (screen === "stock") return <StockScreen onBack={() => setScreen("admin-dashboard")}/>;
  if (screen === "orders") return <OrdersScreen onBack={() => setScreen("admin-dashboard")}/>;
  return <Dashboard onNavigate={setScreen} onLogout={logout}/>;
}
