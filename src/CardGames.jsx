import { createRoom, joinRoom, startGame, makeMove, getRoomData, subscribeToRoom, leaveRoom, getOpenRooms } from "./services/multiplayerService";
import { resolveOutcome, getHouseSettings } from "./services/resultControlService";
import { useState, useEffect, useCallback, useRef } from "react";

// ===== CARD ENGINE =====
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const RANK_VAL = { A: 14, K: 13, Q: 12, J: 11, 10: 10, 9: 9, 8: 8, 7: 7, 6: 6, 5: 5, 4: 4, 3: 3, 2: 2 };

function createDeck() {
  const deck = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank, val: RANK_VAL[rank] });
  return deck;
}

function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function isRed(suit) { return suit === "♥" || suit === "♦"; }

// ===== TEEN PATTI HAND RANKINGS =====
function getTeenPattiRank(cards) {
  if (cards.length !== 3) return { rank: 0, name: "—" };
  const vals = cards.map(c => c.val).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const ranks = cards.map(c => c.rank);
  const isFlush = suits.every(s => s === suits[0]);
  const sorted = [...vals].sort((a, b) => b - a);
  const isSeq = (sorted[0] - sorted[1] === 1 && sorted[1] - sorted[2] === 1) ||
    (sorted[0] === 14 && sorted[1] === 3 && sorted[2] === 2);
  const isTrip = vals[0] === vals[1] && vals[1] === vals[2];
  const isPair = vals[0] === vals[1] || vals[1] === vals[2] || vals[0] === vals[2];

  if (isFlush && isSeq) return { rank: 6, name: "Pure Sequence", score: vals[0] };
  if (isTrip) return { rank: 5, name: "Three of a Kind", score: vals[0] };
  if (isSeq) return { rank: 4, name: "Sequence", score: vals[0] };
  if (isFlush) return { rank: 3, name: "Flush", score: vals[0] * 100 + vals[1] };
  if (isPair) return { rank: 2, name: "Pair", score: vals[0] * 100 + vals[1] };
  return { rank: 1, name: "High Card", score: vals[0] * 100 + vals[1] * 10 + vals[2] };
}

// ===== CARD COMPONENT =====
function Card({ card, faceDown = false, small = false, animate = false }) {
  const size = small ? { width: 38, height: 54, fontSize: 11, borderRadius: 5 } : { width: 60, height: 84, fontSize: 16, borderRadius: 8 };
  const base = {
    ...size, display: "inline-flex", flexDirection: "column", justifyContent: "space-between",
    padding: small ? "3px 4px" : "5px 7px", border: "1px solid #d1d5db", userSelect: "none",
    fontWeight: 700, transition: "transform 0.3s", boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
    animation: animate ? "dealCard 0.3s ease" : "none",
  };
  if (faceDown) return (
    <div style={{ ...base, background: "linear-gradient(135deg, #1e3a8a, #1d4ed8)", border: "1px solid #3b82f6" }}>
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.4 }}>
        <span style={{ fontSize: small ? 16 : 24 }}>🂠</span>
      </div>
    </div>
  );
  const color = isRed(card.suit) ? "#dc2626" : "#111827";
  return (
    <div style={{ ...base, background: "white", color }}>
      <div style={{ fontSize: size.fontSize, lineHeight: 1 }}>{card.rank}<br />{card.suit}</div>
      <div style={{ fontSize: size.fontSize, lineHeight: 1, alignSelf: "flex-end", transform: "rotate(180deg)" }}>{card.rank}<br />{card.suit}</div>
    </div>
  );
}

// ===== TEEN PATTI GAME =====
function TeenPatti({ walletPoints, setWalletPoints, onExit }) {
  const [phase, setPhase] = useState("bet"); // bet, play, showdown, result
  const [ante, setAnte] = useState(10);
  const [pot, setPot] = useState(0);
  const [playerCards, setPlayerCards] = useState([]);
  const [aiCards, setAiCards] = useState([]);
  const [playerSeen, setPlayerSeen] = useState(false);
  const [currentBet, setCurrentBet] = useState(0);
  const [playerFolded, setPlayerFolded] = useState(false);
  const [aiFolded, setAiFolded] = useState(false);
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState("");
  const [aiThinking, setAiThinking] = useState(false);
  const deckRef = useRef([]);

  const startGame = () => {
    if (walletPoints < ante * 2) return setMsg("Not enough coins!");
    const deck = shuffle(createDeck());
    deckRef.current = deck;
    const pCards = [deck[0], deck[1], deck[2]];
    const aCards = [deck[3], deck[4], deck[5]];
    setPlayerCards(pCards); setAiCards(aCards);
    setPlayerSeen(false); setPlayerFolded(false); setAiFolded(false);
    setResult(null); setMsg("");
    const bootPot = ante * 2;
    setPot(bootPot);
    setCurrentBet(ante);
    setWalletPoints(w => w - ante);
    setPhase("play");
  };

  const seeCards = () => setPlayerSeen(true);

  const placeBet = (amount) => {
    if (walletPoints < amount) return setMsg("Not enough coins!");
    setWalletPoints(w => w - amount);
    setPot(p => p + amount);
    setCurrentBet(amount);
    aiTurn(amount);
  };

  const fold = () => {
    setPlayerFolded(true);
    setResult({ winner: "ai", reason: "You folded" });
    setPhase("result");
  };

  const aiTurn = useCallback(async (playerBet) => {
    setAiThinking(true);
    setTimeout(async () => {
      setAiThinking(false);
      // Check admin outcome control
      let forcedOutcome = null;
      try {
        const hs = await getHouseSettings();
        const ctrl = await resolveOutcome(profile?.email || "", "teen-patti", hs);
        if (ctrl.source === "forced") forcedOutcome = ctrl.outcome;
        else if (ctrl.outcome === "lose") forcedOutcome = "lose";
        else if (ctrl.outcome === "win") forcedOutcome = "win";
      } catch {}

      const aiHand = getTeenPattiRank(aiCards);
      const rand = Math.random();

      if (forcedOutcome === "win") {
        // Force player to win - AI folds
        setAiFolded(true);
        setWalletPoints(w => w + pot + playerBet);
        setResult({ winner: "player", reason: "AI folded!" });
        setPhase("result");
        return;
      }
      if (forcedOutcome === "lose") {
        // Force player to lose - go to showdown but AI wins
        setPot(p => p + playerBet);
        showdown(true);
        return;
      }
      // Normal AI behavior
      if (aiHand.rank <= 1 && rand < 0.35) {
        setAiFolded(true);
        setWalletPoints(w => w + pot + playerBet);
        setResult({ winner: "player", reason: "AI folded!" });
        setPhase("result");
        return;
      }
      setPot(p => p + playerBet);
      setMsg("AI called!");
      if (Math.random() < 0.4) showdown();
    }, 1200);
  }, [aiCards, pot]);

  const showdown = useCallback((forceAiWin = false) => {
    setPhase("showdown");
    setTimeout(() => {
      const playerHand = getTeenPattiRank(playerCards);
      const aiHand = getTeenPattiRank(aiCards);
      let winner, reason;
      if (!forceAiWin && (playerHand.rank > aiHand.rank || (playerHand.rank === aiHand.rank && playerHand.score >= aiHand.score))) {
        winner = "player";
        reason = `Your ${playerHand.name} beats AI's ${aiHand.name}!`;
        setWalletPoints(w => w + pot);
      } else {
        winner = "ai";
        reason = `AI's ${aiHand.name} beats your ${playerHand.name}`;
      }
      setResult({ winner, reason, playerHand: playerHand.name, aiHand: aiHand.name });
      setPhase("result");
    }, 1500);
  }, [playerCards, aiCards, pot]);

  const betAmount = playerSeen ? currentBet * 2 : currentBet;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 14px 80px" }}>
      <div style={{ textAlign: "center", padding: "16px 0 10px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b45309", letterSpacing: 2 }}>TEEN PATTI</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1e3a8a" }}>3 Patti</div>
      </div>

      {/* Pot & Balance */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, background: "#1e3a8a", borderRadius: 12, padding: "10px 14px", color: "white", textAlign: "center" }}>
          <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: 1 }}>POT</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#fbbf24" }}>{pot}</div>
        </div>
        <div style={{ flex: 1, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#166534", letterSpacing: 1 }}>YOUR COINS</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#166534" }}>{walletPoints}</div>
        </div>
      </div>

      {/* AI Section */}
      <div style={{ background: "#1e3a8a", borderRadius: 16, padding: "16px", marginBottom: 12, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>
          {aiThinking ? "🤔 AI is thinking..." : aiFolded ? "AI Folded" : "AI Player"}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {phase === "showdown" || phase === "result"
            ? aiCards.map((c, i) => <Card key={i} card={c} />)
            : [0, 1, 2].map(i => <Card key={i} faceDown />)}
        </div>
        {result && <div style={{ marginTop: 8, fontSize: 13, color: "#fbbf24", fontWeight: 600 }}>{result.aiHand}</div>}
      </div>

      {msg && <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "#92400e", marginBottom: 10, textAlign: "center" }}>{msg}</div>}

      {/* Player Cards */}
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 16, padding: "16px", marginBottom: 12, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>Your Cards {playerSeen ? "" : "(Blind)"}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {phase === "bet" ? [0, 1, 2].map(i => <Card key={i} faceDown />) :
            playerCards.map((c, i) => <Card key={i} card={c} faceDown={!playerSeen} animate />)}
        </div>
        {result && <div style={{ marginTop: 8, fontSize: 13, color: "#1e3a8a", fontWeight: 600 }}>{result.playerHand}</div>}
      </div>

      {/* Result */}
      {phase === "result" && result && (
        <div style={{ background: result.winner === "player" ? "#d1fae5" : "#fee2e2", border: `1px solid ${result.winner === "player" ? "#6ee7b7" : "#fca5a5"}`, borderRadius: 14, padding: "16px", marginBottom: 12, textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>{result.winner === "player" ? "🏆" : "😔"}</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: result.winner === "player" ? "#065f46" : "#991b1b" }}>
            {result.winner === "player" ? `You Won ${pot} Coins!` : "You Lost!"}
          </div>
          <div style={{ fontSize: 13, color: "#374151", marginTop: 4 }}>{result.reason}</div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {phase === "bet" && (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[10, 20, 50, 100].map(a => (
                <button key={a} onClick={() => setAnte(a)} style={{ flex: 1, padding: "8px", borderRadius: 10, border: `2px solid ${ante === a ? "#1e3a8a" : "#e5e7eb"}`, background: ante === a ? "#eff6ff" : "white", color: ante === a ? "#1e3a8a" : "#374151", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{a}</button>
              ))}
            </div>
            <button onClick={startGame} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #1e3a8a, #2563eb)", color: "white", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
              Deal Cards (Ante: {ante} coins)
            </button>
          </>
        )}

        {phase === "play" && !aiThinking && (
          <>
            {!playerSeen && (
              <button onClick={seeCards} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "2px solid #7c3aed", background: "#ede9fe", color: "#4c1d95", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                👁 See Cards (Play Seen)
              </button>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => placeBet(betAmount)} style={{ flex: 2, padding: "13px", borderRadius: 12, border: "none", background: "#16a34a", color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                {playerSeen ? `Chaal (${betAmount})` : `Blind Chaal (${betAmount})`}
              </button>
              <button onClick={fold} style={{ flex: 1, padding: "13px", borderRadius: 12, border: "none", background: "#dc2626", color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                Pack
              </button>
            </div>
            {playerSeen && (
              <button onClick={showdown} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "2px solid #1e3a8a", background: "#eff6ff", color: "#1e3a8a", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                Show 🃏
              </button>
            )}
          </>
        )}

        {aiThinking && (
          <div style={{ textAlign: "center", padding: "14px", color: "#6b7280", fontStyle: "italic" }}>AI is thinking...</div>
        )}

        {phase === "result" && (
          <button onClick={() => { setPhase("bet"); setPot(0); setPlayerCards([]); setAiCards([]); setResult(null); setMsg(""); }} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #1e3a8a, #2563eb)", color: "white", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
            Play Again
          </button>
        )}
      </div>
    </div>
  );
}

// ===== ANDAR BAHAR =====
function AndarBahar({ walletPoints, setWalletPoints, onExit }) {
  const [phase, setPhase] = useState("bet");
  const [bet, setBet] = useState(0);
  const [side, setSide] = useState(null);
  const [joker, setJoker] = useState(null);
  const [andarCards, setAndarCards] = useState([]);
  const [baharCards, setBaharCards] = useState([]);
  const [result, setResult] = useState(null);
  const [dealing, setDealing] = useState(false);
  const deckRef = useRef([]);

  const startGame = (selectedSide) => {
    if (!bet || bet > walletPoints) return;
    setSide(selectedSide);
    setWalletPoints(w => w - bet);
    const deck = shuffle(createDeck());
    deckRef.current = deck;
    const jokerCard = deck.shift();
    setJoker(jokerCard);
    setAndarCards([]); setBaharCards([]);
    setResult(null);
    setPhase("dealing");
    setDealing(true);
    dealCards(deck, jokerCard, selectedSide);
  };

  const dealCards = async (deck, jokerCard, selectedSide) => {
    // Check admin outcome control first
    let forcedOutcome = null;
    try {
      const hs = await getHouseSettings();
      const ctrl = await resolveOutcome("", "andar-bahar", hs);
      if (ctrl.outcome === "win") forcedOutcome = selectedSide;
      else if (ctrl.outcome === "lose") forcedOutcome = selectedSide === "andar" ? "bahar" : "andar";
    } catch {}

    const andar = [], bahar = [];
    let found = false, winner = null, idx = 0;
    while (!found && idx < deck.length) {
      const card = deck[idx++];
      if (andar.length <= bahar.length) {
        andar.push(card);
        if (forcedOutcome ? andar.length >= 3 && forcedOutcome === "andar" && winner === null : card.rank === jokerCard.rank) {
          found = true; winner = "andar";
          if (!forcedOutcome) {}
        } else if (!forcedOutcome && card.rank === jokerCard.rank) { found = true; winner = "andar"; }
      } else {
        bahar.push(card);
        if (!forcedOutcome && card.rank === jokerCard.rank) { found = true; winner = "bahar"; }
        else if (forcedOutcome === "bahar" && bahar.length >= 3 && winner === null) { found = true; winner = "bahar"; }
      }
    }
    if (forcedOutcome && !winner) winner = forcedOutcome;
    // Animate dealing
    let i = 0;
    const total = andar.length + bahar.length;
    const interval = setInterval(() => {
      if (i < andar.length) setAndarCards(andar.slice(0, i + 1));
      if (i < bahar.length) setBaharCards(bahar.slice(0, i + 1));
      i++;
      if (i >= Math.max(andar.length, bahar.length)) {
        clearInterval(interval);
        setDealing(false);
        const won = winner === selectedSide;
        if (won) setWalletPoints(w => w + bet * 2);
        setResult({ winner, won, msg: won ? `${winner.toUpperCase()} wins! You won ${bet * 2} coins!` : `${winner.toUpperCase()} wins! Better luck next time.` });
        setPhase("result");
      }
    }, 200);
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 14px 80px" }}>
      <div style={{ textAlign: "center", padding: "16px 0 10px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b45309", letterSpacing: 2 }}>CARD GAME</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1e3a8a" }}>Andar Bahar</div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#166534" }}>YOUR COINS</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#166534" }}>{walletPoints}</div>
        </div>
        <div style={{ flex: 1, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#92400e" }}>YOUR BET</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#92400e" }}>{bet || "—"}</div>
        </div>
      </div>

      {/* Joker Card */}
      {joker && (
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>JOKER CARD</div>
          <Card card={joker} />
          <div style={{ fontSize: 12, color: "#374151", marginTop: 6 }}>Find {joker.rank} in Andar or Bahar</div>
        </div>
      )}

      {/* Andar & Bahar columns */}
      {(andarCards.length > 0 || baharCards.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div style={{ background: side === "andar" ? "#eff6ff" : "#f9fafb", border: `2px solid ${side === "andar" ? "#2563eb" : "#e5e7eb"}`, borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#1e3a8a", marginBottom: 8, textAlign: "center" }}>ANDAR {side === "andar" ? "🎯" : ""}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
              {andarCards.map((c, i) => <Card key={i} card={c} small animate />)}
            </div>
          </div>
          <div style={{ background: side === "bahar" ? "#fef3c7" : "#f9fafb", border: `2px solid ${side === "bahar" ? "#f59e0b" : "#e5e7eb"}`, borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#92400e", marginBottom: 8, textAlign: "center" }}>BAHAR {side === "bahar" ? "🎯" : ""}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
              {baharCards.map((c, i) => <Card key={i} card={c} small animate />)}
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ background: result.won ? "#d1fae5" : "#fee2e2", border: `1px solid ${result.won ? "#6ee7b7" : "#fca5a5"}`, borderRadius: 14, padding: "16px", marginBottom: 12, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>{result.won ? "🏆" : "😔"}</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: result.won ? "#065f46" : "#991b1b" }}>{result.msg}</div>
        </div>
      )}

      {/* Actions */}
      {phase === "bet" && (
        <>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>Select Bet Amount</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[10, 25, 50, 100, 200].map(a => (
                <button key={a} onClick={() => setBet(a)} style={{ flex: 1, padding: "9px", borderRadius: 10, border: `2px solid ${bet === a ? "#1e3a8a" : "#e5e7eb"}`, background: bet === a ? "#eff6ff" : "white", color: bet === a ? "#1e3a8a" : "#374151", fontWeight: 700, cursor: "pointer" }}>{a}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button onClick={() => startGame("andar")} disabled={!bet} style={{ padding: "16px", borderRadius: 12, border: "2px solid #2563eb", background: "#eff6ff", color: "#1e3a8a", fontWeight: 800, fontSize: 16, cursor: bet ? "pointer" : "not-allowed", opacity: bet ? 1 : 0.5 }}>
              🏠 Andar
            </button>
            <button onClick={() => startGame("bahar")} disabled={!bet} style={{ padding: "16px", borderRadius: 12, border: "2px solid #f59e0b", background: "#fef3c7", color: "#92400e", fontWeight: 800, fontSize: 16, cursor: bet ? "pointer" : "not-allowed", opacity: bet ? 1 : 0.5 }}>
              🌿 Bahar
            </button>
          </div>
        </>
      )}

      {dealing && <div style={{ textAlign: "center", padding: "16px", color: "#6b7280" }}>🃏 Dealing cards...</div>}

      {phase === "result" && (
        <button onClick={() => { setPhase("bet"); setJoker(null); setAndarCards([]); setBaharCards([]); setResult(null); setSide(null); setBet(0); }} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #1e3a8a, #2563eb)", color: "white", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
          Play Again
        </button>
      )}
    </div>
  );
}

// ===== RUMMY =====
function Rummy({ walletPoints, setWalletPoints, onExit }) {
  const [phase, setPhase] = useState("bet");
  const [bet, setBet] = useState(0);
  const [playerHand, setPlayerHand] = useState([]);
  const [aiHand, setAiHand] = useState([]);
  const [drawPile, setDrawPile] = useState([]);
  const [discardPile, setDiscardPile] = useState([]);
  const [selected, setSelected] = useState([]);
  const [turn, setTurn] = useState("player");
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState("");
  const [drawn, setDrawn] = useState(false);

  const startGame = () => {
    if (!bet || walletPoints < bet) return setMsg("Not enough coins!");
    setWalletPoints(w => w - bet);
    const deck = shuffle(createDeck());
    const ph = deck.slice(0, 7);
    const ah = deck.slice(7, 14);
    const discard = [deck[14]];
    const draw = deck.slice(15);
    setPlayerHand(ph); setAiHand(ah); setDrawPile(draw); setDiscardPile(discard);
    setSelected([]); setTurn("player"); setResult(null); setMsg(""); setDrawn(false);
    setPhase("play");
  };

  const drawCard = (fromDiscard = false) => {
    if (drawn) return setMsg("Already drew! Now discard a card.");
    if (fromDiscard) {
      const card = discardPile[discardPile.length - 1];
      setPlayerHand(h => [...h, card]);
      setDiscardPile(d => d.slice(0, -1));
    } else {
      const card = drawPile[0];
      setPlayerHand(h => [...h, card]);
      setDrawPile(d => d.slice(1));
    }
    setDrawn(true);
    setMsg("Good! Now discard a card from your hand.");
  };

  const discardCard = (idx) => {
    if (!drawn) return setMsg("Draw a card first!");
    const card = playerHand[idx];
    const newHand = playerHand.filter((_, i) => i !== idx);
    setPlayerHand(newHand);
    setDiscardPile(d => [...d, card]);
    setDrawn(false);
    setSelected([]);
    setMsg("");
    aiTurn(newHand);
  };

  const toggleSelect = (idx) => {
    if (!drawn) { setMsg("Draw a card first, then select to discard."); return; }
    discardCard(idx);
  };

  const checkRummy = (hand) => {
    // Simple rummy check: look for sets (same rank) or runs (same suit, consecutive)
    const byRank = {};
    const bySuit = {};
    hand.forEach(c => {
      byRank[c.rank] = (byRank[c.rank] || []).concat(c);
      bySuit[c.suit] = (bySuit[c.suit] || []).concat(c);
    });
    let score = 0;
    Object.values(byRank).forEach(g => { if (g.length >= 3) score += g.length * 10; });
    Object.values(bySuit).forEach(g => {
      const sorted = g.sort((a, b) => a.val - b.val);
      let run = 1;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].val - sorted[i-1].val === 1) { run++; if (run >= 3) score += run * 10; }
        else run = 1;
      }
    });
    return score;
  };

  const aiTurn = (currentPlayerHand) => {
    setTimeout(() => {
      // AI draws
      const newDraw = drawPile[0];
      if (!newDraw) { endGame(currentPlayerHand); return; }
      const newAiHand = [...aiHand, newDraw];
      const newDrawPile = drawPile.slice(1);
      // AI discards worst card (lowest unmatched)
      const toDiscard = newAiHand.reduce((worst, card, i) =>
        card.val < (worst ? newAiHand[worst].val : 999) ? i : worst, null);
      const aiDiscard = newAiHand[toDiscard];
      const finalAiHand = newAiHand.filter((_, i) => i !== toDiscard);
      setAiHand(finalAiHand);
      setDiscardPile(d => [...d, aiDiscard]);
      setDrawPile(newDrawPile);

      // Check if AI won
      const aiScore = checkRummy(finalAiHand);
      if (aiScore >= 60 || newDrawPile.length < 2) {
        endGame(currentPlayerHand, finalAiHand);
      } else {
        setTurn("player");
        setMsg("Your turn! Draw a card.");
      }
    }, 1000);
  };

  const endGame = (ph = playerHand, ah = aiHand) => {
    const playerScore = checkRummy(ph);
    const aiScore = checkRummy(ah);
    if (playerScore >= aiScore) {
      setWalletPoints(w => w + bet * 2);
      setResult({ winner: "player", msg: `You win! Your score: ${playerScore} vs AI: ${aiScore}. +${bet * 2} coins!` });
    } else {
      setResult({ winner: "ai", msg: `AI wins! AI score: ${aiScore} vs yours: ${playerScore}.` });
    }
    setPhase("result");
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 14px 80px" }}>
      <div style={{ textAlign: "center", padding: "16px 0 10px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b45309", letterSpacing: 2 }}>CARD GAME</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1e3a8a" }}>Rummy</div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#166534" }}>YOUR COINS</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#166534" }}>{walletPoints}</div>
        </div>
        <div style={{ flex: 1, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#1e40af" }}>POT</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#1e40af" }}>{bet * 2 || "—"}</div>
        </div>
      </div>

      {msg && <div style={{ background: "#fef3c7", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "#92400e", marginBottom: 10, textAlign: "center" }}>{msg}</div>}

      {phase === "play" && (
        <>
          {/* AI hand */}
          <div style={{ background: "#1e3a8a", borderRadius: 14, padding: "12px", marginBottom: 10, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>AI Hand ({aiHand.length} cards)</div>
            <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
              {aiHand.map((_, i) => <Card key={i} faceDown small />)}
            </div>
          </div>

          {/* Piles */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 10 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>DRAW PILE ({drawPile.length})</div>
              <div onClick={() => drawCard(false)} style={{ cursor: turn === "player" && !drawn ? "pointer" : "default", opacity: turn === "player" && !drawn ? 1 : 0.5 }}>
                <Card faceDown />
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>DISCARD</div>
              {discardPile.length > 0 && (
                <div onClick={() => drawCard(true)} style={{ cursor: turn === "player" && !drawn ? "pointer" : "default", opacity: turn === "player" && !drawn ? 1 : 0.5 }}>
                  <Card card={discardPile[discardPile.length - 1]} />
                </div>
              )}
            </div>
          </div>

          {/* Player hand */}
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, padding: "12px", marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8, textAlign: "center" }}>Your Hand — {drawn ? "Tap a card to discard" : "Draw a card first"}</div>
            <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap" }}>
              {playerHand.map((c, i) => (
                <div key={i} onClick={() => toggleSelect(i)} style={{ cursor: drawn ? "pointer" : "default", transform: selected.includes(i) ? "translateY(-8px)" : "none", transition: "transform 0.2s" }}>
                  <Card card={c} small />
                </div>
              ))}
            </div>
          </div>

          {turn === "ai" && <div style={{ textAlign: "center", color: "#6b7280", fontSize: 13, padding: 8 }}>🤔 AI is playing...</div>}

          <button onClick={() => endGame()} style={{ width: "100%", padding: "11px", borderRadius: 10, border: "2px solid #1e3a8a", background: "#eff6ff", color: "#1e3a8a", fontWeight: 700, cursor: "pointer" }}>
            Declare Rummy 🎯
          </button>
        </>
      )}

      {result && (
        <div style={{ background: result.winner === "player" ? "#d1fae5" : "#fee2e2", border: `1px solid ${result.winner === "player" ? "#6ee7b7" : "#fca5a5"}`, borderRadius: 14, padding: "16px", marginBottom: 12, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>{result.winner === "player" ? "🏆" : "😔"}</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: result.winner === "player" ? "#065f46" : "#991b1b" }}>{result.msg}</div>
        </div>
      )}

      {phase === "bet" && (
        <>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>Select Bet Amount</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[10, 25, 50, 100].map(a => (
                <button key={a} onClick={() => setBet(a)} style={{ flex: 1, padding: "9px", borderRadius: 10, border: `2px solid ${bet === a ? "#1e3a8a" : "#e5e7eb"}`, background: bet === a ? "#eff6ff" : "white", fontWeight: 700, cursor: "pointer" }}>{a}</button>
              ))}
            </div>
          </div>
          <button onClick={startGame} disabled={!bet} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #1e3a8a, #2563eb)", color: "white", fontWeight: 800, fontSize: 16, cursor: bet ? "pointer" : "not-allowed", opacity: bet ? 1 : 0.5 }}>
            Start Rummy ({bet} coins)
          </button>
        </>
      )}

      {phase === "result" && (
        <button onClick={() => { setPhase("bet"); setPlayerHand([]); setAiHand([]); setResult(null); setMsg(""); setBet(0); }} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #1e3a8a, #2563eb)", color: "white", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
          Play Again
        </button>
      )}
    </div>
  );
}


// ===== MULTIPLAYER LOBBY =====
export function MultiplayerLobby({ profile, walletPoints, onJoinGame, onBack }) {
  const [tab, setTab] = useState("browse");
  const [rooms, setRooms] = useState([]);
  const [joinCode, setJoinCode] = useState("");
  const [ante, setAnte] = useState(10);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const loadRooms = async () => {
    try { setRooms(await getOpenRooms()); } catch {}
  };

  useEffect(() => { loadRooms(); const id = setInterval(loadRooms, 5000); return () => clearInterval(id); }, []);

  const showMsg = (text, type="error") => { setMsg({text,type}); setTimeout(()=>setMsg(null), 3000); };

  const create = async () => {
    setBusy(true);
    try {
      const room = await createRoom({ gameType: 'teen-patti', ante, maxPlayers });
      onJoinGame(room.id, room.code);
    } catch(e) { showMsg(e.message); }
    finally { setBusy(false); }
  };

  const join = async (code) => {
    if (!code?.trim()) return showMsg("Enter room code!");
    setBusy(true);
    try {
      const { room } = await joinRoom(code.trim().toUpperCase());
      onJoinGame(room.id, room.code);
    } catch(e) { showMsg(e.message); }
    finally { setBusy(false); }
  };

  const C = { navy:"#1e3a8a", gold:"#f59e0b", green:"#16a34a", border:"#e5e7eb", muted:"#6b7280" };

  return (
    <div style={{maxWidth:480,margin:"0 auto",padding:"0 14px 80px"}}>
      <div style={{textAlign:"center",padding:"16px 0 12px"}}>
        <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:2}}>MULTIPLAYER</div>
        <div style={{fontSize:24,fontWeight:800,color:C.navy}}>Teen Patti Live</div>
        <div style={{fontSize:13,color:C.muted,marginTop:2}}>Play vs real players • 2-6 players</div>
      </div>

      {msg && <div style={{padding:"10px 14px",borderRadius:10,fontSize:13,marginBottom:12,background:msg.type==="error"?"#fee2e2":"#d1fae5",color:msg.type==="error"?"#991b1b":"#065f46"}}>{msg.text}</div>}

      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {[["browse","🔍 Browse Rooms"],["create","➕ Create Room"],["join","🔗 Join by Code"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"9px 6px",borderRadius:10,border:`1.5px solid ${tab===id?C.navy:C.border}`,background:tab===id?"#eff6ff":"white",color:tab===id?C.navy:C.muted,fontWeight:tab===id?800:600,fontSize:12,cursor:"pointer"}}>{label}</button>
        ))}
      </div>

      {/* Browse Rooms */}
      {tab==="browse" && (
        <div>
          {rooms.length===0 ? (
            <div style={{background:"white",border:`1px solid ${C.border}`,borderRadius:16,padding:"30px",textAlign:"center",color:C.muted}}>
              <div style={{fontSize:40,marginBottom:10}}>🎴</div>
              <div style={{fontWeight:700,fontSize:15,color:C.navy,marginBottom:6}}>No open rooms</div>
              <div style={{fontSize:13}}>Create a room and invite friends!</div>
            </div>
          ) : rooms.map(room => (
            <div key={room.id} style={{background:"white",border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:C.navy}}>Room {room.code}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:3}}>Host: {room.host_name} • Ante: {room.ante} coins</div>
                <div style={{fontSize:12,color:C.green,marginTop:2}}>{room.room_players?.[0]?.count || 0}/{room.max_players} players</div>
              </div>
              <button onClick={()=>join(room.code)} disabled={busy} style={{padding:"9px 16px",borderRadius:10,border:"none",background:C.navy,color:"white",fontWeight:700,fontSize:13,cursor:"pointer"}}>Join</button>
            </div>
          ))}
          <button onClick={loadRooms} style={{width:"100%",padding:"11px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"white",color:C.muted,fontWeight:600,fontSize:13,cursor:"pointer",marginTop:6}}>🔄 Refresh</button>
        </div>
      )}

      {/* Create Room */}
      {tab==="create" && (
        <div style={{background:"white",border:`1px solid ${C.border}`,borderRadius:16,padding:"20px"}}>
          <div style={{fontWeight:700,fontSize:15,color:C.navy,marginBottom:16}}>Create New Room</div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:600,color:C.muted,marginBottom:6}}>Ante Amount (coins)</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[5,10,25,50,100].map(a=>(
                <button key={a} onClick={()=>setAnte(a)} style={{padding:"8px 14px",borderRadius:10,border:`1.5px solid ${ante===a?C.navy:C.border}`,background:ante===a?"#eff6ff":"white",color:ante===a?C.navy:C.muted,fontWeight:700,cursor:"pointer"}}>{a}</button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:600,color:C.muted,marginBottom:6}}>Max Players</div>
            <div style={{display:"flex",gap:8}}>
              {[2,3,4,5,6].map(n=>(
                <button key={n} onClick={()=>setMaxPlayers(n)} style={{flex:1,padding:"8px 0",borderRadius:10,border:`1.5px solid ${maxPlayers===n?C.navy:C.border}`,background:maxPlayers===n?"#eff6ff":"white",color:maxPlayers===n?C.navy:C.muted,fontWeight:700,cursor:"pointer"}}>{n}</button>
              ))}
            </div>
          </div>
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:"#166534"}}>
            Your balance: <strong>{walletPoints} coins</strong> • Min needed: <strong>{ante} coins</strong>
          </div>
          <button onClick={create} disabled={busy||walletPoints<ante} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:C.navy,color:"white",fontWeight:800,fontSize:15,cursor:"pointer",opacity:busy||walletPoints<ante?0.5:1}}>
            {busy?"Creating…":"🎴 Create Room"}
          </button>
        </div>
      )}

      {/* Join by Code */}
      {tab==="join" && (
        <div style={{background:"white",border:`1px solid ${C.border}`,borderRadius:16,padding:"20px"}}>
          <div style={{fontWeight:700,fontSize:15,color:C.navy,marginBottom:16}}>Join with Room Code</div>
          <input
            value={joinCode}
            onChange={e=>setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter 6-digit code e.g. AB3X7K"
            maxLength={6}
            style={{width:"100%",padding:"13px 16px",borderRadius:12,border:`1.5px solid ${C.border}`,fontSize:16,fontWeight:700,letterSpacing:4,textAlign:"center",outline:"none",boxSizing:"border-box",marginBottom:14}}
          />
          <button onClick={()=>join(joinCode)} disabled={busy||joinCode.length<6} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:C.navy,color:"white",fontWeight:800,fontSize:15,cursor:"pointer",opacity:joinCode.length<6?0.5:1}}>
            {busy?"Joining…":"🚪 Join Room"}
          </button>
        </div>
      )}
    </div>
  );
}

// ===== MULTIPLAYER GAME ROOM =====
export function MultiplayerGame({ roomId, roomCode, profile, onLeave }) {
  const [roomData, setRoomData] = useState({ room:null, players:[], moves:[] });
  const [myCards, setMyCards] = useState([]);
  const [isSeen, setIsSeen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const channelRef = useRef(null);

  const C = { navy:"#1e3a8a", gold:"#f59e0b", green:"#16a34a", red:"#dc2626", border:"#e5e7eb", muted:"#6b7280" };

  const load = useCallback(async () => {
    try {
      const data = await getRoomData(roomId);
      setRoomData(data);
      const me = data.players?.find(p => p.player_id === profile?.id);
      if (me?.cards) {
        try { setMyCards(typeof me.cards === 'string' ? JSON.parse(me.cards) : me.cards); } catch {}
      }
    } catch {}
  }, [roomId, profile?.id]);

  useEffect(() => {
    load();
    subscribeToRoom(roomId, load).then(ch => { channelRef.current = ch; });
    const id = setInterval(load, 3000);
    return () => {
      clearInterval(id);
      if (channelRef.current) channelRef.current.unsubscribe();
    };
  }, [roomId, load]);

  const room = roomData.room;
  const players = roomData.players;
  const moves = roomData.moves;
  const myPlayer = players.find(p => p.player_id === profile?.id);
  const isHost = room?.host_id === profile?.id;
  const isMyTurn = room?.current_turn === profile?.id;
  const activePlayers = players.filter(p => p.status === 'active');

  const doMove = async (moveType, amount=0) => {
    setBusy(true);
    try {
      await makeMove(roomId, moveType, amount);
      if (moveType === 'see') setIsSeen(true);
      await load();
    } catch(e) { setMsg(e.message); setTimeout(()=>setMsg(null),2500); }
    finally { setBusy(false); }
  };

  const doStart = async () => {
    setBusy(true);
    try { await startGame(roomId); await load(); }
    catch(e) { setMsg(e.message); setTimeout(()=>setMsg(null),2500); }
    finally { setBusy(false); }
  };

  const doLeave = async () => {
    await leaveRoom(roomId);
    onLeave();
  };

  const betAmount = isSeen ? (room?.ante||10)*2 : (room?.ante||10);

  return (
    <div style={{maxWidth:480,margin:"0 auto",padding:"0 14px 80px"}}>
      {/* Room Header */}
      <div style={{background:C.navy,borderRadius:16,padding:"14px 16px",marginBottom:12,color:"white",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:11,opacity:0.6,letterSpacing:2}}>ROOM CODE</div>
          <div style={{fontSize:22,fontWeight:900,letterSpacing:4}}>{roomCode}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:11,opacity:0.6}}>POT</div>
          <div style={{fontSize:20,fontWeight:900,color:"#fbbf24"}}>{room?.pot || 0}</div>
        </div>
      </div>

      {msg && <div style={{background:"#fee2e2",borderRadius:10,padding:"8px 14px",fontSize:13,color:C.red,marginBottom:10}}>{msg}</div>}

      {/* Players */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:12}}>
        {players.map(p => {
          const isMe = p.player_id === profile?.id;
          const isTurn = room?.current_turn === p.player_id;
          return (
            <div key={p.id} style={{background:isTurn?"#dbeafe":isMe?"#f0fdf4":"white",border:`1.5px solid ${isTurn?C.navy:isMe?"#bbf7d0":C.border}`,borderRadius:12,padding:"10px 12px",opacity:p.status==="folded"?0.5:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontWeight:700,fontSize:13,color:C.navy}}>{p.player_name}{isMe?" (You)":""}</div>
                {isTurn && <span style={{fontSize:10,background:C.navy,color:"white",padding:"2px 7px",borderRadius:10,fontWeight:700}}>TURN</span>}
              </div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                {p.status==="folded"?"❌ Folded":p.status==="left"?"🚪 Left":p.is_seen?"👁 Seen":"🙈 Blind"}
              </div>
              <div style={{fontSize:11,color:C.green,marginTop:2}}>Bet: {p.current_bet} coins</div>
            </div>
          );
        })}
      </div>

      {/* My Cards */}
      {myCards.length > 0 && room?.status === 'playing' && (
        <div style={{background:"white",border:`1px solid ${C.border}`,borderRadius:14,padding:"14px",marginBottom:12}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:8,textAlign:"center"}}>YOUR CARDS {isSeen?"(Seen)":"(Blind - tap See Cards to reveal)"}</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center"}}>
            {myCards.map((c,i) => <Card key={i} card={c} small faceDown={!isSeen}/>)}
          </div>
        </div>
      )}

      {/* Game Log */}
      {moves.length > 0 && (
        <div style={{background:"#f9fafb",border:`1px solid ${C.border}`,borderRadius:12,padding:"12px",marginBottom:12,maxHeight:120,overflowY:"auto"}}>
          {moves.slice(0,8).map((m,i) => (
            <div key={i} style={{fontSize:12,color:C.muted,padding:"3px 0",borderBottom:i<moves.length-1?"1px solid #f3f4f6":"none"}}>
              <strong style={{color:C.navy}}>{m.player_name}</strong> {m.move_type==="bet"?`bet ${m.amount} coins`:m.move_type==="fold"?"folded":m.move_type==="see"?"saw cards":m.move_type==="join"?"joined":m.move_type==="start"?"started the game":m.move_type==="show"?"showed cards":"left"}
            </div>
          ))}
        </div>
      )}

      {/* Result */}
      {room?.status === 'finished' && (
        <div style={{background:"#d1fae5",border:"1px solid #6ee7b7",borderRadius:14,padding:"20px",textAlign:"center",marginBottom:12}}>
          <div style={{fontSize:32,marginBottom:8}}>🏆</div>
          <div style={{fontWeight:800,fontSize:18,color:"#065f46"}}>{room.game_state?.winner} Wins!</div>
          <div style={{fontSize:14,color:C.green,marginTop:4}}>Pot: {room.game_state?.pot} coins</div>
        </div>
      )}

      {/* Actions */}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {/* Waiting room */}
        {room?.status === 'waiting' && (
          <div style={{background:"white",border:`1px solid ${C.border}`,borderRadius:14,padding:"16px",textAlign:"center"}}>
            <div style={{fontSize:13,color:C.muted,marginBottom:12}}>
              Waiting for players... ({activePlayers.length}/{room?.max_players})
            </div>
            <div style={{display:"flex",gap:4,justifyContent:"center",marginBottom:14}}>
              {Array.from({length:room?.max_players||4}).map((_,i) => (
                <div key={i} style={{width:32,height:32,borderRadius:"50%",background:i<activePlayers.length?"#1e3a8a":"#e5e7eb",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:14}}>
                  {i<activePlayers.length?"👤":""}
                </div>
              ))}
            </div>
            {isHost && activePlayers.length >= 2 && (
              <button onClick={doStart} disabled={busy} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:C.green,color:"white",fontWeight:800,fontSize:15,cursor:"pointer"}}>
                {busy?"Starting…":"🎴 Start Game"}
              </button>
            )}
            {isHost && activePlayers.length < 2 && (
              <div style={{fontSize:13,color:C.muted}}>Need at least 2 players to start</div>
            )}
            {!isHost && <div style={{fontSize:13,color:C.muted}}>Waiting for host to start...</div>}
          </div>
        )}

        {/* Playing */}
        {room?.status === 'playing' && myPlayer?.status === 'active' && (
          <>
            {!isSeen && (
              <button onClick={()=>doMove('see')} disabled={busy} style={{width:"100%",padding:"12px",borderRadius:12,border:`2px solid #7c3aed`,background:"#ede9fe",color:"#4c1d95",fontWeight:800,fontSize:14,cursor:"pointer"}}>
                👁 See Cards
              </button>
            )}
            {isMyTurn ? (
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>doMove('bet',betAmount)} disabled={busy} style={{flex:2,padding:"13px",borderRadius:12,border:"none",background:C.green,color:"white",fontWeight:800,fontSize:14,cursor:"pointer"}}>
                  {isSeen?`Chaal (${betAmount})`:`Blind (${betAmount})`}
                </button>
                <button onClick={()=>doMove('fold')} disabled={busy} style={{flex:1,padding:"13px",borderRadius:12,border:"none",background:C.red,color:"white",fontWeight:800,fontSize:14,cursor:"pointer"}}>Pack</button>
              </div>
            ) : (
              <div style={{textAlign:"center",padding:"12px",background:"#f9fafb",borderRadius:12,color:C.muted,fontSize:14}}>
                Waiting for {players.find(p=>p.player_id===room?.current_turn)?.player_name || "other player"}...
              </div>
            )}
            {isSeen && isMyTurn && (
              <button onClick={()=>doMove('show')} disabled={busy} style={{width:"100%",padding:"12px",borderRadius:12,border:`2px solid ${C.navy}`,background:"#eff6ff",color:C.navy,fontWeight:800,fontSize:14,cursor:"pointer"}}>
                🃏 Show Cards
              </button>
            )}
          </>
        )}
        {myPlayer?.status === 'folded' && <div style={{textAlign:"center",padding:"12px",background:"#fee2e2",borderRadius:12,color:C.red,fontSize:14,fontWeight:600}}>❌ You folded this round</div>}
      </div>

      {/* Leave Button */}
      <button onClick={doLeave} style={{width:"100%",padding:"11px",borderRadius:12,border:`1.5px solid ${C.border}`,background:"white",color:C.muted,fontWeight:700,fontSize:13,cursor:"pointer",marginTop:12}}>
        🚪 Leave Room
      </button>
    </div>
  );
}

// ===== CARD GAMES LOBBY =====
export function CardGamesLobby({ onSelectGame }) {
  const games = [
    { id: "multiplayer", name: "Teen Patti Live", icon: "🎮", desc: "Play vs real players online! Create or join a room.", color: "#1e3a8a", bg: "#eff6ff" },
    { id: "teen-patti", name: "Teen Patti", icon: "🃏", desc: "Classic 3-card Indian poker. Blind or Seen — can you beat the AI?", color: "#1e3a8a", bg: "#eff6ff" },
    { id: "andar-bahar", name: "Andar Bahar", icon: "🎴", desc: "Simple & fast! Pick Andar or Bahar before the joker appears.", color: "#92400e", bg: "#fef3c7" },
    { id: "rummy", name: "Rummy", icon: "🎰", desc: "Form sets and sequences. Declare Rummy to win the pot!", color: "#065f46", bg: "#d1fae5" },
  ];
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 14px 80px" }}>
      <div style={{ textAlign: "center", padding: "20px 0 16px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b45309", letterSpacing: 2 }}>CARD GAMES</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#1e3a8a" }}>Play & Win</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>vs AI · Coins from your wallet</div>
      </div>
      {games.map(g => (
        <div key={g.id} onClick={() => onSelectGame(g.id)}
          style={{ background: g.bg, border: `2px solid ${g.color}33`, borderRadius: 18, padding: "20px", marginBottom: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 16, transition: "transform 0.15s, box-shadow 0.15s", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 42, flexShrink: 0 }}>{g.icon}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: g.color }}>{g.name}</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>{g.desc}</div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 20, color: g.color }}>→</div>
        </div>
      ))}
    </div>
  );
}

// ===== MAIN EXPORT =====
export default function CardGameScreen({ game, walletPoints, setWalletPoints, onExit }) {
  if (game === "teen-patti") return <TeenPatti walletPoints={walletPoints} setWalletPoints={setWalletPoints} onExit={onExit} />;
  if (game === "andar-bahar") return <AndarBahar walletPoints={walletPoints} setWalletPoints={setWalletPoints} onExit={onExit} />;
  if (game === "rummy") return <Rummy walletPoints={walletPoints} setWalletPoints={setWalletPoints} onExit={onExit} />;
  return <CardGamesLobby onSelectGame={onExit} />;
}
