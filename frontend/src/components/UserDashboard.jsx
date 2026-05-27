import React, { useState, useEffect } from "react";
import { Save, Lock, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
const API = import.meta.env.VITE_API_URL;
export default function UserDashboard({ token }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Tabs & filters
  const [selectedGroup, setSelectedGroup] = useState("Todos");
  const [selectedStatus, setSelectedStatus] = useState("all");
  
  // Local state for modified predictions before saving: { matchId: { scoreHome, scoreAway } }
  const [editedPredictions, setEditedPredictions] = useState({});
  const [savingMatches, setSavingMatches] = useState({});
  const [savedFeedback, setSavedFeedback] = useState({});

  const groups = ["Todos", "Grupo A", "Grupo B", "Grupo C", "Grupo D", "Grupo E", "Grupo F", "Grupo G", "Grupo H", "Grupo I", "Grupo J", "Grupo K", "Grupo L"];

  const fetchMatches = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch(`${API}/api/matches`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Error al cargar partidos.");
      }
      setMatches(data);
      
      // Initialize editedPredictions state from current fetched database predictions
      const initialEdited = {};
      data.forEach((match) => {
        if (match.prediction) {
          initialEdited[match.id] = {
            scoreHome: match.prediction.scoreHome,
            scoreAway: match.prediction.scoreAway
          };
        }
      });
      setEditedPredictions((prev) => ({ ...initialEdited, ...prev }));
    } catch (err) {
      setError(err.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Poll matches every 5 seconds for real-time scores updates
  useEffect(() => {
    fetchMatches(true);

    const interval = setInterval(() => {
      fetchMatches(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [token]);

  const handleScoreChange = (matchId, side, value) => {
    const cleanValue = value === "" ? "" : Math.max(0, parseInt(value, 10));
    setEditedPredictions((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [side]: cleanValue
      }
    }));
  };

const handleToggleNotifications = async () => {

  const newValue = !notificationsEnabled;

  const response = await fetch(
    `${API}/api/users/notifications`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        enabled: newValue
      })
    }
  );

  if (response.ok) {

    setNotificationsEnabled(newValue);

  }

};

  const handleSavePrediction = async (matchId) => {
    const pred = editedPredictions[matchId];
    if (!pred || pred.scoreHome === undefined || pred.scoreAway === undefined || pred.scoreHome === "" || pred.scoreAway === "") {
      alert("Por favor introduce los marcadores para ambos equipos antes de guardar.");
      return;
    }

    setSavingMatches((prev) => ({ ...prev, [matchId]: true }));
    setError("");

    try {
      const response = await fetch(`${API}/api/predictions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          matchId,
          scoreHome: pred.scoreHome,
          scoreAway: pred.scoreAway
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al guardar predicción.");
      }

      setSavedFeedback((prev) => ({ ...prev, [matchId]: true }));
      
      // Remove success feedback after 2 seconds
      setTimeout(() => {
        setSavedFeedback((prev) => ({ ...prev, [matchId]: false }));
      }, 2000);

      // Reload to update status without full screen spinner
      fetchMatches(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingMatches((prev) => ({ ...prev, [matchId]: false }));
    }
  };

  useEffect(() => {

  if ("Notification" in window) {

    Notification.requestPermission();

  }

}, []);

setInterval(() => {

  matches.forEach((match) => {

    const matchDate = new Date(match.date);

    const diff =
      matchDate.getTime() - Date.now();

    const minutes = Math.floor(diff / 60000);

    if (minutes <= 10 && minutes > 9) {

      showNotification(
        "⚽ Partido próximo",
        `${match.teamHome} vs ${match.teamAway} inicia en 10 minutos.`
      );

    }

  });

}, 30000);

  // Filter logic
  const filteredMatches = matches.filter((match) => {
    const matchesGroup = selectedGroup === "Todos" || match.group === selectedGroup;
    let matchesStatus = true;
    if (selectedStatus === "scheduled") matchesStatus = match.status === "scheduled";
    if (selectedStatus === "live") matchesStatus = match.status === "live";
    if (selectedStatus === "finished") matchesStatus = match.status === "finished";
    
    return matchesGroup && matchesStatus;
  });

  const formatMatchDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Scoring engine output points label
  const renderPointsBadge = (pred, actual) => {
    if (!pred || actual.scoreHome === null || actual.scoreAway === null) return null;
    
    const ph = parseInt(pred.scoreHome, 10);
    const pa = parseInt(pred.scoreAway, 10);
    const ah = parseInt(actual.scoreHome, 10);
    const aa = parseInt(actual.scoreAway, 10);

    let points = 0;
    if (ph === ah) points++;
    if (pa === aa) points++;
    const actualOutcome = ah > aa ? "home" : ah < aa ? "away" : "draw";
    const predOutcome = ph > pa ? "home" : ph < pa ? "away" : "draw";
    if (actualOutcome === predOutcome) points++;

    const textMap = ["+0 Puntos", "+1 Punto", "+2 Puntos", "+3 Puntos (¡Exacto!)"];
    
    return (
      <span className={`points-awarded pts-${points}`}>
        {textMap[points]}
      </span>
    );
  };

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={notificationsEnabled}
          onChange={handleToggleNotifications}
        />
        Activar Notificaciones
      </label>
      {/* Filters Section */}
      <div style={{ marginBottom: "20px" }}>
        <div className="horizontal-tabs">
          {groups.map((group) => (
            <button
              key={group}
              className={`sub-tab ${selectedGroup === group ? "active" : ""}`}
              onClick={() => setSelectedGroup(group)}
            >
              {group}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          <button 
            style={{ flex: 1, padding: "8px", fontSize: "0.78rem", borderRadius: "10px" }}
            className={`btn ${selectedStatus === "all" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setSelectedStatus("all")}
          >
            Todos
          </button>
          <button 
            style={{ flex: 1, padding: "8px", fontSize: "0.78rem", borderRadius: "10px" }}
            className={`btn ${selectedStatus === "scheduled" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setSelectedStatus("scheduled")}
          >
            Pendientes
          </button>
          <button 
            style={{ flex: 1, padding: "8px", fontSize: "0.78rem", borderRadius: "10px" }}
            className={`btn ${selectedStatus === "live" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setSelectedStatus("live")}
          >
            En Vivo
          </button>
          <button 
            style={{ flex: 1, padding: "8px", fontSize: "0.78rem", borderRadius: "10px" }}
            className={`btn ${selectedStatus === "finished" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setSelectedStatus("finished")}
          >
            Finalizados
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(244, 63, 94, 0.1)", border: "1px solid var(--error-rose)", color: "var(--error-rose)", padding: "12px", borderRadius: "12px", fontSize: "0.85rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading && filteredMatches.length === 0 ? (
        <div className="centered-state">
          <RefreshCw size={24} style={{ animation: "pulse 1.2s infinite" }} />
          <span>Cargando partidos...</span>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="centered-state">
          <AlertCircle size={32} />
          <span>No se encontraron partidos para este filtro.</span>
        </div>
      ) : (
        <div>
          {filteredMatches.map((match) => {
            const hasPrediction = match.prediction !== null;
            const isMatchLocked = match.isLocked || match.status !== "scheduled";
            
            const localPred = editedPredictions[match.id] || { scoreHome: "", scoreAway: "" };
            
            // Check if user changed the predictions compared to the saved state
            const originalHome = hasPrediction ? match.prediction.scoreHome : "";
            const originalAway = hasPrediction ? match.prediction.scoreAway : "";
            const isDirty = localPred.scoreHome !== originalHome || localPred.scoreAway !== originalAway;
            
            const isSaving = savingMatches[match.id];
            const isSaved = savedFeedback[match.id];

            return (
              <div key={match.id} className="glass-card" style={{ padding: "16px" }}>
                <div className="match-header">
                  <span className="match-group">{match.group}</span>
                  <span className="match-date">{formatMatchDate(match.date)}</span>
                </div>

                <div className="match-row">
                  {/* Home Team */}
                  <div className="match-team">
                    <img 
                      src={`https://flagcdn.com/w80/${match.teamHomeFlagCode}.png`} 
                      alt={match.teamHome} 
                      style={{ width: "48px", height: "32px", borderRadius: "6px", objectFit: "cover", boxShadow: "0 4px 10px rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.1)" }} 
                    />
                    <span className="team-name">{match.teamHome}</span>
                  </div>

                  {/* Real-time score display */}
                  <div className="match-vs-container">
                    {match.status === "scheduled" ? (
                      <span className="vs-divider">vs</span>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                        {match.status === "live" && <span className="live-badge">En Vivo</span>}
                        <div className="match-score-display">
                          <span>{match.scoreHome}</span>
                          <span style={{ fontSize: "1rem", color: "var(--text-muted)" }}>-</span>
                          <span>{match.scoreAway}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Away Team */}
                  <div className="match-team">
                    <img 
                      src={`https://flagcdn.com/w80/${match.teamAwayFlagCode}.png`} 
                      alt={match.teamAway} 
                      style={{ width: "48px", height: "32px", borderRadius: "6px", objectFit: "cover", boxShadow: "0 4px 10px rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.1)" }} 
                    />
                    <span className="team-name">{match.teamAway}</span>
                  </div>
                </div>

                {/* Prediction Input / Display Section */}
                <div className="prediction-section">
                  <div className="pred-title">
                    <span>Tu Pronóstico</span>
                    {isMatchLocked && (
                      <span className="prediction-locked-badge">
                        <Lock size={12} />
                        Cerrado
                      </span>
                    )}
                    {isSaved && (
                      <span className="prediction-saved-indicator">
                        <CheckCircle2 size={12} />
                        ¡Guardado!
                      </span>
                    )}
                  </div>

                  <div className="pred-inputs">
                    <input
                      type="number"
                      min="0"
                      className="score-input"
                      value={localPred.scoreHome}
                      onChange={(e) => handleScoreChange(match.id, "scoreHome", e.target.value)}
                      disabled={isMatchLocked || isSaving}
                      placeholder="-"
                    />
                    
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {!isMatchLocked ? (
                        <button
                          className={`btn btn-sm ${isDirty ? "btn-primary" : "btn-secondary"}`}
                          style={{ padding: "8px 16px" }}
                          disabled={!isDirty || isSaving}
                          onClick={() => handleSavePrediction(match.id)}
                        >
                          {isSaving ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <>
                              <Save size={14} />
                              <span>Guardar</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>-</span>
                      )}
                    </div>

                    <input
                      type="number"
                      min="0"
                      className="score-input"
                      value={localPred.scoreAway}
                      onChange={(e) => handleScoreChange(match.id, "scoreAway", e.target.value)}
                      disabled={isMatchLocked || isSaving}
                      placeholder="-"
                    />
                  </div>

                  {/* Points display for completed matches */}
                  {match.status === "finished" && (
                    <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
                      {hasPrediction ? (
                        renderPointsBadge(match.prediction, match)
                      ) : (
                        <span className="points-awarded pts-0">
                          Sin pronóstico (+0 Puntos)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
