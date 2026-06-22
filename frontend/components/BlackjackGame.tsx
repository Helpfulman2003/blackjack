"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useWriteContract, useAccount, useConnect } from "wagmi";
import { BLACKJACK_ABI, CONTRACT_ADDRESS } from "@/lib/contract";

// ── Types ──────────────────────────────────────────────────────────────────
interface Card {
  suit: "♠" | "♥" | "♦" | "♣";
  rank: string;
  value: number;
  isAce: boolean;
  id: string;
}

type Phase = "betting" | "player" | "split" | "dealer" | "over";

export interface SessionResult {
  wins: number;
  losses: number;
  pushes: number;
  biggestWin: number;
  handsPlayed: number;
}

interface Props {
  onSessionEnd?: (result: SessionResult) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function createShuffledDeck(): Card[] {
  const suits: Card["suit"][] = ["♠", "♥", "♦", "♣"];
  const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  const deck: Card[] = [];
  let uid = 0;
  for (const suit of suits) {
    for (const rank of ranks) {
      const isAce = rank === "A";
      const value = isAce ? 11 : ["J","Q","K"].includes(rank) ? 10 : parseInt(rank);
      deck.push({ suit, rank, value, isAce, id: String(uid++) });
    }
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function calcTotal(hand: Card[]): number {
  let total = hand.reduce((s, c) => s + c.value, 0);
  let softAces = hand.filter((c) => c.isAce).length;
  while (total > 21 && softAces > 0) { total -= 10; softAces--; }
  return total;
}

function isBJ(hand: Card[]): boolean {
  return hand.length === 2 && calcTotal(hand) === 21;
}

const isRed = (c: Card) => c.suit === "♥" || c.suit === "♦";

// ── Card UI ────────────────────────────────────────────────────────────────
function CardUI({ card, hidden }: { card: Card; hidden?: boolean }) {
  if (hidden) {
    return (
      <div style={cardBase}>
        <div style={{ width: "100%", height: "100%", borderRadius: 8,
          background: "repeating-linear-gradient(45deg,#0f4d2a,#0f4d2a 6px,#0a3a1e 6px,#0a3a1e 12px)",
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "clamp(18px, 4vw, 28px)", color: "rgba(255,255,255,0.25)" }}>♟</span>
        </div>
      </div>
    );
  }
  const red = isRed(card);
  const color = red ? "#c0001c" : "#111";
  return (
    <div style={{ ...cardBase, background: "#fff", padding: "4px 6px",
      display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ color, fontSize: "clamp(12px, 3vw, 14px)", fontWeight: 900, lineHeight: 1 }}>
        <div>{card.rank}</div>
        <div style={{ fontSize: "clamp(10px, 2.5vw, 12px)" }}>{card.suit}</div>
      </div>
      <div style={{ color, fontSize: "clamp(20px, 5vw, 26px)", textAlign: "center", lineHeight: 1, fontWeight: 900 }}>{card.suit}</div>
      <div style={{ color, fontSize: "clamp(12px, 3vw, 14px)", fontWeight: 900, lineHeight: 1, transform: "rotate(180deg)", textAlign: "left" }}>
        <div>{card.rank}</div>
        <div style={{ fontSize: "clamp(10px, 2.5vw, 12px)" }}>{card.suit}</div>
      </div>
    </div>
  );
}
const cardBase: React.CSSProperties = {
  width: "clamp(45px, 11vw, 62px)", height: "clamp(66px, 16vw, 92px)", borderRadius: 9, flexShrink: 0,
  border: "2px solid rgba(255,255,255,0.85)",
  boxShadow: "0 6px 18px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.4)",
  overflow: "hidden", transition: "transform 0.15s",
};

// ── Hand Display ───────────────────────────────────────────────────────────
function Hand({ cards, hideSecond, label, total, dim }:
  { cards: Card[]; hideSecond?: boolean; label: string; total: number; dim?: boolean }) {
  const displayTotal = hideSecond && cards.length >= 2
    ? calcTotal([cards[0]])
    : total;
  return (
    <div style={{ opacity: dim ? 0.45 : 1, transition: "opacity 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ color: "#b8ffc8", fontFamily: "monospace", fontSize: 12,
          fontWeight: "bold", letterSpacing: 1, textTransform: "uppercase" }}>{label}</span>
        <span style={{ background: "rgba(0,0,0,0.45)", color: "#fff",
          borderRadius: 6, padding: "2px 10px", fontFamily: "monospace",
          fontSize: 14, fontWeight: 900, border: "1px solid rgba(255,255,255,0.1)" }}>
          {displayTotal}
        </span>
      </div>
      <div className="no-scrollbar" style={{ display: "flex", gap: -10, flexWrap: "nowrap", overflowX: "auto", paddingBottom: "10px" }}>
        {cards.map((card, i) => (
          <div key={card.id} style={{ marginLeft: i === 0 ? 0 : -16,
            animation: "dealIn 0.3s ease-out", zIndex: i }}>
            <CardUI card={card} hidden={hideSecond && i === 1} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Chip Button ────────────────────────────────────────────────────────────
function Chip({ value, onClick, disabled }: { value: number; onClick: () => void; disabled?: boolean }) {
  const colors: Record<number, [string, string]> = {
    5:   ["#e74c3c","#c0392b"],
    10:  ["#3498db","#2980b9"],
    25:  ["#2ecc71","#27ae60"],
    50:  ["#9b59b6","#8e44ad"],
    100: ["#f39c12","#e67e22"],
  };
  const [from, to] = colors[value] ?? ["#555","#333"];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "clamp(46px, 11vw, 54px)", height: "clamp(46px, 11vw, 54px)", borderRadius: "50%",
      background: disabled ? "#333" : `radial-gradient(circle at 30% 30%, ${from}, ${to})`,
      border: "3px dashed rgba(255,255,255,0.4)",
      boxShadow: disabled ? "none" : `0 6px 14px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.5), 0 0 10px ${from}66`,
      color: "#fff", fontWeight: 900, fontSize: "clamp(12px, 3vw, 14px)",
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "'Inter', sans-serif", transition: "all 0.15s",
      opacity: disabled ? 0.4 : 1,
      outline: "none",
    }}>
      {value}
    </button>
  );
}

// ── Action Button ──────────────────────────────────────────────────────────
function ActionBtn({ label, onClick, disabled, color = "#00e87a" }:
  { label: string; onClick: () => void; disabled?: boolean; color?: string }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      flex: 1, padding: "12px 4px",
      background: disabled ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg, ${color}22, ${color}11)`,
      border: `1px solid ${disabled ? "rgba(255,255,255,0.08)" : color + "55"}`,
      borderRadius: 10, color: disabled ? "#ffffff30" : color,
      fontFamily: "monospace", fontSize: 13, fontWeight: "bold",
      cursor: disabled ? "not-allowed" : "pointer",
      letterSpacing: 1, transition: "all 0.2s",
    }}>
      {label}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function BlackjackGame({ onSessionEnd }: Props) {
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [splitHand, setSplitHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);

  const [balance, setBalance] = useState<number>(() => {
    if (typeof window === "undefined") return 500;
    return parseInt(localStorage.getItem("bjBalance") ?? "500");
  });
  const [wager, setWager] = useState(0);
  const [splitWager, setSplitWager] = useState(0);

  const [phase, setPhase] = useState<Phase>("betting");
  const [splitActive, setSplitActive] = useState(false);
  const [doubled, setDoubled] = useState(false);

  const [dealerRevealed, setDealerRevealed] = useState(false);
  const [message, setMessage] = useState("");
  const [outcome, setOutcome] = useState<"win" | "lose" | "push" | null>(null);

  // Session stats
  const [sessionWins, setSessionWins] = useState(0);
  const [sessionLosses, setSessionLosses] = useState(0);
  const [sessionPushes, setSessionPushes] = useState(0);
  const [biggestWin, setBiggestWin] = useState(0);
  const [handsPlayed, setHandsPlayed] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);

  const [toast, setToast] = useState("");
  const { writeContractAsync, isPending: isSigning } = useWriteContract();
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  const deckRef = useRef<Card[]>([]);
  const stateRef = useRef({ playerHand, splitHand, wager, splitWager, splitActive });

  useEffect(() => {
    stateRef.current = { playerHand, splitHand, wager, splitWager, splitActive };
  }, [playerHand, splitHand, wager, splitWager, splitActive]);

  // Save balance to localStorage
  useEffect(() => {
    localStorage.setItem("bjBalance", String(balance));
  }, [balance]);

  // Auto-reset balance if out of money
  useEffect(() => {
    if (phase === "betting" && balance < 5 && wager === 0) {
      setBalance(500);
      setToast("Tự động nạp lại 500 chip!");
      setTimeout(() => setToast(""), 2500);
    }
  }, [phase, balance, wager]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  // Draw a card from the deck ref
  const drawCard = useCallback((): Card => {
    const card = deckRef.current.pop()!;
    setDeck([...deckRef.current]);
    return card;
  }, []);

  const addChip = useCallback((amount: number) => {
    if (phase !== "betting") return;
    if (amount > balance - wager) { showToast("Insufficient chips!"); return; }
    setWager((w) => w + amount);
  }, [phase, balance, wager]);

  const clearWager = () => { if (phase === "betting") setWager(0); };

  const startGame = useCallback(async () => {
    if (wager === 0) { showToast("Place a bet first!"); return; }
    if (balance < wager) { showToast("Insufficient balance!"); return; }

    let walletReady = isConnected;
    if (!walletReady) {
      const injectedConnector = connectors.find((c) => c.name === "Injected");
      if (!injectedConnector) {
        showToast("❌ MetaMask không khả dụng trong trình duyệt.");
        return;
      }

      try {
        await connect({ connector: injectedConnector });
        walletReady = true;
      } catch (err) {
        console.error("Wallet connect failed:", err);
        showToast("❌ Không thể mở MetaMask. Hãy kiểm tra extension và thử lại.");
        return;
      }
    }

    // 💰 Charge Game Start Fee on-chain (0.0000003 ETH)
    if (walletReady) {
      try {
        await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: BLACKJACK_ABI,
          functionName: "payGameStart",
          value: BigInt(300000000000), // 0.0000003 ETH in wei
        });
        showToast("✅ Start payment confirmed!");
      } catch (err: any) {
        console.error("Game Start Payment failed:", err);
        showToast("❌ Payment failed! Game cancelled.");
        return;
      }
    }

    const freshDeck = createShuffledDeck();
    deckRef.current = freshDeck;
    setDeck([...freshDeck]);

    const c1 = deckRef.current.pop()!;
    const c2 = deckRef.current.pop()!;
    const d1 = deckRef.current.pop()!;
    const d2 = deckRef.current.pop()!;
    setDeck([...deckRef.current]);

    const pHand = [c1, c2];
    const dHand = [d1, d2];

    setPlayerHand(pHand);
    setDealerHand(dHand);
    setSplitHand([]);
    setSplitActive(false);
    setDoubled(false);
    setDealerRevealed(false);
    setOutcome(null);
    setMessage("");
    setBalance((b) => b - wager);
    setSplitWager(0);
    setSessionActive(true);

    const pTotal = calcTotal(pHand);

    if (isBJ(pHand)) {
      // Blackjack! Reveal dealer and check
      setDealerRevealed(true);
      setPhase("over");
      if (isBJ(dHand)) {
        setMessage("🤝 Both Blackjack — Push!");
        setOutcome("push");
        setBalance((b) => b + wager);
        setSessionPushes((p) => p + 1);
      } else {
        const payout = Math.floor(wager * 2.5); // 3:2 payout = original + 1.5x
        setMessage("🃏 Blackjack! You win 3:2!");
        setOutcome("win");
        setBalance((b) => b + payout);
        setSessionWins((w) => w + 1);
        setBiggestWin((bw) => Math.max(bw, payout - wager));
      }
      setHandsPlayed((h) => h + 1);
      return;
    }

    if (pTotal === 21) {
      runDealerTurn(dHand, pHand, [], false, wager, 0);
      return;
    }

    setPhase("player");
  }, [wager, balance, isConnected, writeContractAsync, connect, connectors]);

  // ── Player Actions ─────────────────────────────────────────────────────
  const hit = useCallback(() => {
    if (phase !== "player" && phase !== "split") return;
    const card = deckRef.current.pop()!;
    setDeck([...deckRef.current]);

    if (phase === "player") {
      setPlayerHand((prev) => {
        const next = [...prev, card];
        const total = calcTotal(next);
        if (total >= 21) {
          setTimeout(() => {
            if (splitActive) {
              setPhase("split");
            } else {
              if (total > 21) {
                // Bust
                setDealerRevealed(true);
                setMessage("💥 Bust! Dealer wins.");
                setOutcome("lose");
                setPhase("over");
                setSessionLosses((l) => l + 1);
                setHandsPlayed((h) => h + 1);
              } else {
                runDealerTurn(dealerHand, next, splitHand, splitActive, wager, splitWager);
              }
            }
          }, 300);
        }
        return next;
      });
      if (doubled) {
        setTimeout(() => {
          if (splitActive) setPhase("split");
          else runDealerTurnFromState();
        }, 400);
      }
    } else {
      // split hand
      setSplitHand((prev) => {
        const next = [...prev, card];
        const total = calcTotal(next);
        if (total >= 21) {
          setTimeout(() => runDealerTurnFromState(), 300);
        }
        return next;
      });
    }
  }, [phase, splitActive, doubled, dealerHand, splitHand, wager, splitWager]);

  const stand = useCallback(() => {
    if (phase === "player") {
      if (splitActive) {
        setPhase("split");
      } else {
        runDealerTurnFromState();
      }
    } else if (phase === "split") {
      runDealerTurnFromState();
    }
  }, [phase, splitActive]);

  const doubleDown = useCallback(() => {
    if (phase !== "player" || playerHand.length !== 2) return;
    if (balance < wager) { showToast("Insufficient chips!"); return; }
    setBalance((b) => b - wager);
    setWager((w) => w * 2);
    setDoubled(true);
    // Deal 1 card then stand
    const card = deckRef.current.pop()!;
    setDeck([...deckRef.current]);
    setPlayerHand((prev) => {
      const next = [...prev, card];
      setTimeout(() => {
        if (splitActive) setPhase("split");
        else runDealerTurnFromState();
      }, 500);
      return next;
    });
  }, [phase, playerHand, balance, wager, splitActive]);

  const doSplit = useCallback(() => {
    if (phase !== "player" || playerHand.length !== 2) return;
    if (playerHand[0].rank !== playerHand[1].rank) { showToast("Can only split matching cards!"); return; }
    if (balance < wager) { showToast("Insufficient chips!"); return; }

    setBalance((b) => b - wager);
    setSplitWager(wager);
    setSplitActive(true);

    const [c1, c2] = playerHand;
    const newCard1 = deckRef.current.pop()!;
    const newCard2 = deckRef.current.pop()!;
    setDeck([...deckRef.current]);

    setPlayerHand([c1, newCard1]);
    setSplitHand([c2, newCard2]);
    setPhase("player");
  }, [phase, playerHand, balance, wager]);

  // ── Resolution ─────────────────────────────────────────────────────────
  const resolveGameDirect = (
    dHand: Card[], pHand: Card[], spHand: Card[],
    isSplit: boolean, pw: number, sw: number
  ) => {
    const dTotal = calcTotal(dHand);
    const pTotal = calcTotal(pHand);
    const spTotal = isSplit ? calcTotal(spHand) : 0;

    let msgs: string[] = [];
    let totalPayout = 0;
    let wins = 0, losses = 0, pushes = 0;
    let maxWin = 0;

    const resolveHand = (playerTotal: number, bet: number, label: string) => {
      const playerBust = playerTotal > 21;
      const dealerBust = dTotal > 21;

      if (playerBust) {
        msgs.push(`${label}: Bust 💥`);
        losses++;
      } else if (dealerBust) {
        msgs.push(`${label}: Dealer busts — You win! 🎉`);
        totalPayout += bet * 2;
        maxWin = Math.max(maxWin, bet);
        wins++;
      } else if (playerTotal > dTotal) {
        msgs.push(`${label}: You win! 🎉`);
        totalPayout += bet * 2;
        maxWin = Math.max(maxWin, bet);
        wins++;
      } else if (playerTotal === dTotal) {
        msgs.push(`${label}: Push 🤝`);
        totalPayout += bet;
        pushes++;
      } else {
        msgs.push(`${label}: Dealer wins 😔`);
        losses++;
      }
    };

    resolveHand(pTotal, pw, isSplit ? "Hand 1" : "");
    if (isSplit) resolveHand(spTotal, sw, "Hand 2");

    setBalance((b) => b + totalPayout);

    const overallOutcome: "win" | "lose" | "push" =
      wins > 0 ? "win" : pushes > 0 && losses === 0 ? "push" : "lose";

    setOutcome(overallOutcome);
    setMessage(msgs.join("  •  "));
    setPhase("over");

    setSessionWins((w) => w + wins);
    setSessionLosses((l) => l + losses);
    setSessionPushes((p) => p + pushes);
    setBiggestWin((bw) => Math.max(bw, maxWin));
    setHandsPlayed((h) => h + (isSplit ? 2 : 1));
  };

  const resolveGame = (finalDealerHand: Card[]) => {
    const { playerHand: pHand, splitHand: spHand, splitActive: isSplit, wager: pw, splitWager: sw } = stateRef.current;
    resolveGameDirect(finalDealerHand, pHand, spHand, isSplit, pw, sw);
  };

  // ── Dealer Turn ────────────────────────────────────────────────────────
  const runDealerLoop = () => {
    setDealerHand((prev) => {
      const total = calcTotal(prev);
      if (total < 17) {
        const card = deckRef.current.pop()!;
        setDeck([...deckRef.current]);
        const next = [...prev, card];
        setTimeout(() => runDealerLoop(), 800);
        return next;
      } else {
        // Dealer stands — resolve
        setTimeout(() => resolveGame(prev), 600);
        return prev;
      }
    });
  };

  const runDealerTurnFromState = () => {
    setPhase("dealer");
    setDealerRevealed(true);
    setTimeout(() => runDealerLoop(), 600);
  };

  const runDealerTurn = (
    dHand: Card[], pHand: Card[], spHand: Card[],
    isSplit: boolean, pw: number, sw: number
  ) => {
    setPhase("dealer");
    setDealerRevealed(true);

    const dealerDraw = (current: Card[]): Card[] => {
      const total = calcTotal(current);
      if (total < 17) {
        const card = deckRef.current.pop()!;
        setDeck([...deckRef.current]);
        return dealerDraw([...current, card]);
      }
      return current;
    };

    setTimeout(() => {
      const finalDealer = dealerDraw(dHand);
      setDealerHand(finalDealer);
      setTimeout(() => resolveGameDirect(finalDealer, pHand, spHand, isSplit, pw, sw), 600);
    }, 600);
  };

  // ── New hand / Reset ───────────────────────────────────────────────────
  const newHand = useCallback(() => {
    setPlayerHand([]);
    setSplitHand([]);
    setDealerHand([]);
    setWager(0);
    setSplitWager(0);
    setSplitActive(false);
    setDoubled(false);
    setDealerRevealed(false);
    setOutcome(null);
    setMessage("");
    setPhase("betting");
  }, []);

  const resetAll = useCallback(() => {
    newHand();
    setBalance(500);
    setSessionWins(0);
    setSessionLosses(0);
    setSessionPushes(0);
    setBiggestWin(0);
    setHandsPlayed(0);
    setSessionActive(false);
    localStorage.setItem("bjBalance", "500");
  }, [newHand]);

  const submitSession = useCallback(() => {
    if (onSessionEnd && handsPlayed > 0) {
      onSessionEnd({ wins: sessionWins, losses: sessionLosses, pushes: sessionPushes, biggestWin, handsPlayed });
    }
  }, [onSessionEnd, sessionWins, sessionLosses, sessionPushes, biggestWin, handsPlayed]);

  // 💰 Charge Game End Fee on-chain (0.0000003 ETH)
  useEffect(() => {
    if (phase === "over" && isConnected) {
      const payFee = async () => {
        try {
          await writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: BLACKJACK_ABI,
            functionName: "payGameEnd",
            value: BigInt(300000000000), // 0.0000003 ETH in wei
          });
          showToast("✅ End payment confirmed!");
        } catch (err) {
          console.error("Game End Payment failed:", err);
          showToast("❌ End payment failed!");
        }
      };
      payFee();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Show toast when wallet sign popup is pending
  useEffect(() => {
    if (isSigning) showToast("✍ Please sign in your wallet…");
  }, [isSigning]);

  // ── Derived ────────────────────────────────────────────────────────────
  const pTotal = calcTotal(playerHand);
  const dTotal = calcTotal(dealerHand);
  const spTotal = calcTotal(splitHand);
  const canSplit = phase === "player" && playerHand.length === 2
    && playerHand[0].rank === playerHand[1].rank && !splitActive && balance >= wager;
  const canDouble = phase === "player" && playerHand.length === 2 && !doubled && balance >= wager;

  // ── UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="casino-felt" style={{
      minHeight: "100%", width: "100%",
      borderRadius: 20, padding: "20px 16px", fontFamily: "'Inter', sans-serif",
      display: "flex", flexDirection: "column", gap: 16, position: "relative",
      overflow: "hidden", boxSizing: "border-box",
    }}>


      {/* Toast */}
      {toast && (
        <div style={{
          position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.85)", color: "#ffd700", padding: "8px 20px",
          borderRadius: 20, fontSize: 13, fontWeight: "bold", zIndex: 50,
          border: "1px solid rgba(255,215,0,0.3)", whiteSpace: "nowrap",
        }}>{toast}</div>
      )}

      {/* Header: Balance + Wager */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ color: "#ffffff40", fontSize: 10, letterSpacing: 1 }}>BALANCE</span>
          <span style={{ color: "#ffd700", fontSize: 22, fontWeight: 900,
            textShadow: "0 0 12px rgba(255,215,0,0.5)" }}>
            💰 {balance}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ color: "#ffffff40", fontSize: 10, letterSpacing: 1 }}>BET</span>
          <span style={{ color: wager > 0 ? "#00e87a" : "#ffffff30", fontSize: 22, fontWeight: 900 }}>
            {wager > 0 ? `⬡ ${wager}` : "—"}
          </span>
        </div>
      </div>

      {/* ── DEALER AREA ── */}
      <div style={{ minHeight: 130 }}>
        {dealerHand.length > 0 && (
          <Hand
            cards={dealerHand}
            hideSecond={!dealerRevealed}
            label="Dealer"
            total={dTotal}
          />
        )}
      </div>

      {/* ── OUTCOME MESSAGE ── */}
      {phase === "over" && (
        <div style={{
          textAlign: "center", padding: "10px 16px",
          background: outcome === "win" ? "rgba(0,232,122,0.12)"
            : outcome === "push" ? "rgba(255,215,0,0.1)"
            : "rgba(255,50,80,0.1)",
          border: `1px solid ${outcome === "win" ? "#00e87a44" : outcome === "push" ? "#ffd70044" : "#ff325044"}`,
          borderRadius: 12,
          color: outcome === "win" ? "#00e87a" : outcome === "push" ? "#ffd700" : "#ff6b6b",
          fontSize: 14, fontWeight: "bold", letterSpacing: 0.5,
        }}>
          {message || (outcome === "win" ? "🎉 You Win!" : outcome === "push" ? "🤝 Push!" : "😔 Dealer Wins")}
        </div>
      )}

      {/* ── PLAYER AREA ── */}
      <div style={{ display: "flex", gap: 16, minHeight: 130 }}>
        <div style={{ flex: 1 }}>
          {playerHand.length > 0 && (
            <Hand
              cards={playerHand}
              label={splitActive ? "Hand 1" : "You"}
              total={pTotal}
              dim={phase === "split"}
            />
          )}
        </div>
        {splitActive && splitHand.length > 0 && (
          <div style={{ flex: 1 }}>
            <Hand
              cards={splitHand}
              label="Hand 2"
              total={spTotal}
              dim={phase === "player" || phase === "dealer"}
            />
          </div>
        )}
      </div>

      {/* ── BETTING PHASE ── */}
      {phase === "betting" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ color: "#ffffff50", fontSize: 11, textAlign: "center", letterSpacing: 1 }}>
            SELECT BET
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            {[5,10,25,50,100].map((v) => (
              <Chip key={v} value={v} onClick={() => addChip(v)} disabled={balance - wager < v} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={clearWager} style={{
              flex: 1, padding: "10px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, color: "#ffffff60",
              fontFamily: "monospace", fontSize: 12, cursor: "pointer",
            }}>
              Clear
            </button>
            <button onClick={startGame} disabled={wager === 0} style={{
              flex: 2, padding: "12px",
              background: wager > 0
                ? "linear-gradient(135deg, #00e87a, #00b85d)"
                : "rgba(255,255,255,0.05)",
              border: "none", borderRadius: 10,
              color: wager > 0 ? "#001a0d" : "#ffffff30",
              fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 900,
              cursor: wager > 0 ? "pointer" : "not-allowed",
              letterSpacing: 2, boxShadow: wager > 0 ? "0 4px 20px rgba(0,232,122,0.35)" : "none",
              transition: "all 0.2s",
            }}>
              DEAL
            </button>
          </div>
        </div>
      )}

      {/* ── PLAYER ACTIONS ── */}
      {(phase === "player" || phase === "split") && (
        <div style={{ display: "flex", gap: 8 }}>
          <ActionBtn label="HIT"    onClick={hit}       color="#00e87a" />
          <ActionBtn label="STAND"  onClick={stand}     color="#ffd700" />
          <ActionBtn label="DOUBLE" onClick={doubleDown} disabled={!canDouble} color="#00cfff" />
          <ActionBtn label="SPLIT"  onClick={doSplit}    disabled={!canSplit}  color="#ff8c00" />
        </div>
      )}

      {/* ── DEALER THINKING ── */}
      {phase === "dealer" && (
        <div style={{ textAlign: "center", color: "#ffffff40", fontSize: 12, letterSpacing: 2 }}>
          ⌛ DEALER PLAYING…
        </div>
      )}

      {/* ── GAME OVER ACTIONS ── */}
      {phase === "over" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {isSigning && (
            <div style={{
              textAlign: "center", padding: "8px 16px",
              background: "rgba(0,207,255,0.08)",
              border: "1px solid rgba(0,207,255,0.35)",
              borderRadius: 10, color: "#00cfff",
              fontFamily: "monospace", fontSize: 12, letterSpacing: 1,
              animation: "pulse 1.5s ease-in-out infinite",
            }}>
              ✍ Confirm signature in wallet…
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={newHand} style={{
              flex: 1, padding: "13px",
              background: "linear-gradient(135deg, #00e87a, #00b85d)",
              border: "none", borderRadius: 10,
              color: "#001a0d", fontFamily: "monospace",
              fontSize: 14, fontWeight: 900, cursor: "pointer",
              letterSpacing: 2, boxShadow: "0 4px 18px rgba(0,232,122,0.3)",
            }}>
              NEW HAND
            </button>
            <button onClick={resetAll} style={{
              padding: "13px 18px",
              background: "rgba(255,50,80,0.1)", border: "1px solid rgba(255,50,80,0.3)",
              borderRadius: 10, color: "#ff5050",
              fontFamily: "monospace", fontSize: 12, cursor: "pointer",
            }}>
              RESET
            </button>
          </div>
        </div>
      )}

      {/* ── SESSION STATS ── */}
      {sessionActive && (
        <div style={{
          display: "flex", gap: 8, marginTop: 4,
          padding: "10px 14px",
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
        }}>
          {[
            { label: "W", val: sessionWins,   color: "#00e87a" },
            { label: "L", val: sessionLosses, color: "#ff5050" },
            { label: "P", val: sessionPushes, color: "#ffd700" },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ color: "#ffffff30", fontSize: 10, letterSpacing: 1 }}>{label}</div>
              <div style={{ color, fontSize: 18, fontWeight: 900 }}>{val}</div>
            </div>
          ))}
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ color: "#ffffff30", fontSize: 10, letterSpacing: 1 }}>BEST</div>
            <div style={{ color: "#ffd700", fontSize: 18, fontWeight: 900 }}>+{biggestWin}</div>
          </div>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes dealIn {
          from { opacity: 0; transform: translateY(-18px) scale(0.85); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
