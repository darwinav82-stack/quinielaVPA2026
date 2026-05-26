import React, { useState, useEffect } from "react";
import { Trophy, Award, RefreshCw } from "lucide-react";

export default function Leaderboard({ token }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/leaderboard", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Error al obtener ranking.");
      }
      setLeaderboard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [token]);

  return (
    <div>
      <div 
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px"
        }}
      >
        <h2 style={{ fontSize: "1.3rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
          <Trophy size={20} style={{ color: "var(--primary-gold)" }} />
          Posiciones
        </h2>
        <button 
          onClick={fetchLeaderboard}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer"
          }}
          disabled={loading}
          title="Actualizar ranking"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} style={{ animationDuration: "1s" }} />
        </button>
      </div>

      {error && (
        <div style={{ color: "var(--error-rose)", textAlign: "center", padding: "10px" }}>
          {error}
        </div>
      )}

      {loading && leaderboard.length === 0 ? (
        <div className="centered-state">
          <RefreshCw size={24} style={{ animation: "pulse 1.2s infinite" }} />
          <span>Cargando tabla de posiciones...</span>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="centered-state">
          <Award size={32} />
          <span>No hay participantes registrados todavía.</span>
        </div>
      ) : (
        <div className="leaderboard-list">
          {leaderboard.map((player, index) => {
            const rank = index + 1;
            const initials = player.username.substring(0, 2).toUpperCase();
            
            return (
              <div 
                key={player.id} 
                className={`leaderboard-row rank-${rank}`}
              >
                <div className="rank-number">
                  {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
                </div>
                
                <div className="player-avatar">
                  {initials}
                </div>
                
                <div className="player-name">
                  {player.username}
                </div>
                
                <div className="player-score">
                  {player.totalPoints}
                  <span className="player-score-suffix">pts</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
