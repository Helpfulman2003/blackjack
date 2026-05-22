"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useAccount } from "wagmi";
import WalletButton from "@/components/WalletButton";
import { SessionResult } from "@/components/BlackjackGame";

const BlackjackGame = dynamic(() => import("@/components/BlackjackGame"), { ssr: false });

export default function Home() {
    const { address, isConnected } = useAccount();
    const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
    const [tab, setTab] = useState<"board" | "submit">("board");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSessionEnd = useCallback(
        (result: SessionResult) => {
            setSessionResult(result);
            if (result.handsPlayed > 0 && isConnected) {
                setTab("submit");
                // Scroll down a bit to show submit panel
                setTimeout(() => {
                    window.scrollBy({ top: 400, behavior: 'smooth' });
                }, 500);
            }
        },
        [isConnected]
    );

    const handleSubmitted = useCallback(() => {
        setTab("board");
    }, []);

    if (!mounted) {
        return (
            <main
                style={{
                    minHeight: "100vh",
                    background: "linear-gradient(160deg, #020510 0%, #040a1a 50%, #06051a 100%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "16px",
                    fontFamily: "monospace",
                }}
            />
        );
    }

    return (
        <main
            style={{
                minHeight: "100vh",
                background: "radial-gradient(circle at top, #0c2518 0%, #020510 100%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "20px 16px 60px 16px",
                fontFamily: "monospace",
                color: "#fff",
                width: "100%",
                boxSizing: "border-box",
            }}
        >
            {/* HEADER */}
            <div
                style={{
                    width: "100%",
                    maxWidth: 800,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 32,
                }}
            >
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ 
                        color: "#00e87a", 
                        fontSize: "clamp(18px, 6vw, 24px)", 
                        fontWeight: 900, 
                        letterSpacing: 4,
                        textShadow: "0 0 15px rgba(0,232,122,0.5)"
                    }}>
                        ♠ BLACKJACK ONCHAIN
                    </div>
                    <div style={{ color: "#ffffff30", fontSize: 10, marginTop: 4, letterSpacing: 1 }}>
                        BASE MAINNET • ONCHAIN LEADERBOARD
                    </div>
                </div>
                <div style={{ transform: "scale(0.95)", transformOrigin: "right" }}>
                    <WalletButton />
                </div>
            </div>

            {/* CONTENT WRAPPER */}
            <div
                style={{
                    width: "100%",
                    maxWidth: 800,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 32,
                }}
            >
                {/* GAME SECTION */}
                <div
                    style={{
                        width: "100%",
                        maxWidth: 480,
                        background: "rgba(0,0,0,0.45)",
                        border: "2px solid rgba(0,232,122,0.25)",
                        borderRadius: 24,
                        padding: 10,
                        boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 0 20px rgba(0,232,122,0.05)",
                    }}
                >
                    <div style={{ borderRadius: 16, overflow: "hidden" }}>
                        <BlackjackGame onSessionEnd={handleSessionEnd} />
                    </div>
                </div>

                {/* INTERACTIVE PANEL SECTION */}
                <div style={{ 
                    width: "100%",
                    maxWidth: 480,
                    display: "flex", 
                    flexDirection: "column", 
                    gap: 16 
                }}>
                    {/* NETWORK STATUS */}
                    <div
                        style={{
                            padding: "14px 20px",
                            borderRadius: 16,
                            background: isConnected ? "rgba(0,255,136,0.05)" : "rgba(255,80,80,0.05)",
                            border: `1px solid ${isConnected ? "rgba(0,255,136,0.2)" : "rgba(255,80,80,0.2)"}`,
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            backdropFilter: "blur(10px)",
                        }}
                    >
                        <div style={{ 
                            width: 10, 
                            height: 10, 
                            borderRadius: "50%", 
                            background: isConnected ? "#00ff88" : "#ff4466",
                            boxShadow: `0 0 12px ${isConnected ? "#00ff88" : "#ff4466"}`
                        }} />
                        <span style={{ color: isConnected ? "#00ff88" : "#ff4466", fontSize: 13, fontWeight: "bold", letterSpacing: 1 }}>
                            {isConnected ? "BASE MAINNET ACTIVE" : "WALLET DISCONNECTED"}
                        </span>
                    </div>

                    {/* GAME AREA */}
                    <div style={{ display: "flex", justifyContent: "center" }}>
                        {/* We removed the tabs and leaderboard section entirely */}
                    </div>

                    {/* INFO CARD */}
                    <div
                        style={{
                            padding: "24px",
                            borderRadius: 24,
                            background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
                            border: "1px solid rgba(255,255,255,0.08)",
                        }}
                    >
                        <div style={{ color: "#00e87a", fontSize: 14, marginBottom: 14, fontWeight: "bold", letterSpacing: 1.5 }}>
                            🎮 HOW TO PLAY & WIN
                        </div>
                        <div style={{ color: "#ffffff50", fontSize: 12, lineHeight: 2.2 }}>
                            • 🪙 Place a bet by clicking chips and click DEAL<br />
                            • 🃏 HIT to draw, STAND to keep, DOUBLE to double bet + 1 card<br />
                            • 🔀 SPLIT pairs to play two independent hands<br />
                            • ⛓ Submit your session stats to Base Mainnet to lock in your spot!
                        </div>
                    </div>
                </div>
            </div>

            {/* SITE FOOTER */}
            <div style={{ 
                marginTop: 60, 
                padding: "30px 20px", 
                borderTop: "1px solid rgba(255,255,255,0.05)",
                width: "100%",
                maxWidth: 600,
                textAlign: "center"
            }}>
                <div style={{ color: "#ffffff15", fontSize: 11, letterSpacing: 1.5, lineHeight: 1.8 }}>
                    BUILT ON BASE • DECENTRALIZED CASINO<br />
                    © 2026 BLACKJACK ONCHAIN LABS
                </div>
            </div>
        </main>
    );
}
