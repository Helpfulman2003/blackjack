"use client";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { baseMainnet } from "@/lib/wagmi";
import { useState } from "react";

export default function WalletButton() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, error: connectError, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [showMenu, setShowMenu] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const isWrongChain = isConnected && chain?.id !== baseMainnet.id;

  const handleConnect = async (connector: (typeof connectors)[number]) => {
    setLocalError(null);
    try {
      await connect({ connector });
    } catch {
      setLocalError("❌ Không thể mở MetaMask. Hãy kiểm tra extension và thử lại.");
    }
  };

  if (!isConnected) {
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {connectors.slice(0, 2).map((c) => (
            <button
              key={c.id}
              onClick={() => handleConnect(c)}
              disabled={isConnecting}
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                background: "rgba(0,200,100,0.12)",
                border: "1px solid rgba(0,200,100,0.35)",
                color: "#00e87a",
                fontFamily: "'Courier New', monospace",
                fontSize: 12,
                cursor: isConnecting ? "wait" : "pointer",
                fontWeight: "bold",
                letterSpacing: 1,
                transition: "all 0.2s",
                opacity: isConnecting ? 0.7 : 1,
              }}
            >
              {c.name === "Injected" ? "🦊 MetaMask" : c.name === "Coinbase Wallet" ? "🔵 Coinbase" : c.name}
            </button>
          ))}
        </div>
        {(connectError || localError) && (
          <div style={{
            marginTop: 8,
            color: "#ff6b6b",
            fontSize: 12,
            textAlign: "center",
            maxWidth: 280,
            lineHeight: 1.4,
          }}>
            {localError ?? connectError?.message}
          </div>
        )}
      </div>
    );
  }

  if (isWrongChain) {
    return (
      <button
        onClick={() => switchChain({ chainId: baseMainnet.id })}
        style={{
          padding: "10px 18px", borderRadius: 10,
          background: "rgba(255,80,50,0.15)", border: "1px solid rgba(255,80,50,0.45)",
          color: "#ff5032", fontFamily: "'Courier New', monospace",
          fontSize: 12, cursor: "pointer", fontWeight: "bold",
        }}
      >
        ⚠ Switch to Base Mainnet
      </button>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        style={{
          padding: "10px 18px", borderRadius: 10,
          background: "rgba(0,232,122,0.1)", border: "1px solid rgba(0,232,122,0.3)",
          color: "#00e87a", fontFamily: "'Courier New', monospace",
          fontSize: 12, cursor: "pointer", fontWeight: "bold",
          display: "flex", alignItems: "center", gap: 8,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#00e87a", display: "inline-block", boxShadow: "0 0 8px #00e87a" }} />
        {address?.slice(0, 6)}…{address?.slice(-4)}
        <span style={{ opacity: 0.6 }}>▾</span>
      </button>
      {showMenu && (
        <div style={{
          position: "absolute", top: "110%", right: 0,
          background: "#0d1a12", border: "1px solid rgba(0,232,122,0.2)",
          borderRadius: 10, padding: 4, zIndex: 100, minWidth: 150,
        }}>
          <button
            onClick={() => { disconnect(); setShowMenu(false); }}
            style={{
              display: "block", width: "100%", padding: "10px 14px",
              background: "none", border: "none", color: "#ff4466",
              fontFamily: "'Courier New', monospace", fontSize: 12,
              cursor: "pointer", textAlign: "left",
            }}
          >
            🔌 Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
