import React, { useState, useEffect } from "react";
import { UserPlus, Settings, Lock, Unlock, Play, RefreshCw, CheckCircle, HelpCircle, ShieldAlert } from "lucide-react";

export default function AdminDashboard({ token }) {
  // Navigation
  const [adminTab, setAdminTab] = useState("users"); // 'users' or 'matches'
  
  // User creation state
  const [newUsername, setNewUsername] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [userSuccessMessage, setUserSuccessMessage] = useState("");
  const [userList, setUserList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userError, setUserError] = useState("");

  // Match control state
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [scoreHomeInputs, setScoreHomeInputs] = useState({});
  const [scoreAwayInputs, setScoreAwayInputs] = useState({});
  const [actionInProgress, setActionInProgress] = useState({});
  
  // Group filter for match controller
  const [selectedGroup, setSelectedGroup] = useState("Todos");
  const groups = ["Todos", "Grupo A", "Grupo B", "Grupo C", "Grupo D", "Grupo E", "Grupo F", "Grupo G", "Grupo H", "Grupo I", "Grupo J", "Grupo K", "Grupo L"];

  // Fetch users (for user admin)
  const fetchUsers = async () => {
    setUsersLoading(true);
    setUserError("");
    try {
      const API = import.meta.env.VITE_API_URL;

      const response = await fetch(`${API}/api/users`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Error al obtener usuarios.");
      setUserList(data.filter(u => u.role !== "admin"));
    } catch (err) {
      setUserError(err.message);
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch matches (for match controller)
  const fetchMatches = async () => {
    setMatchesLoading(true);
    setMatchError("");
    try {
      const API = import.meta.env.VITE_API_URL;

      const response = await fetch(`${API}/api/matches`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Error al obtener partidos.");
      setMatches(data);
      
      // Initialize inputs for live updates with current score values
      const initialHomeInputs = {};
      const initialAwayInputs = {};
      data.forEach(m => {
        initialHomeInputs[m.id] = m.scoreHome !== null ? m.scoreHome : 0;
        initialAwayInputs[m.id] = m.scoreAway !== null ? m.scoreAway : 0;
      });
      setScoreHomeInputs(prev => ({ ...initialHomeInputs, ...prev }));
      setScoreAwayInputs(prev => ({ ...initialAwayInputs, ...prev }));
    } catch (err) {
      setMatchError(err.message);
    } finally {
      setMatchesLoading(false);
    }
  };

  useEffect(() => {
    if (adminTab === "users") {
      fetchUsers();
    } else {
      fetchMatches();
    }
  }, [adminTab, token]);

  // Handle User Creation
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      setUserError("El nombre de usuario es requerido.");
      return;
    }
    setUserError("");
    setUserSuccessMessage("");
    setGeneratedPassword("");

    try {
      const API = import.meta.env.VITE_API_URL;

      const response = await fetch(`${API}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ username: newUsername.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Error al crear usuario.");
      
      setUserSuccessMessage(data.message);
      setGeneratedPassword(data.generatedPassword);
      setNewUsername("");
      fetchUsers(); // Refresh list
    } catch (err) {
      setUserError(err.message);
    }
  };

  const handleDeleteUser = async (userId) => {

    const confirmDelete = window.confirm(
      "¿Seguro que deseas eliminar este usuario?"
    );

    if (!confirmDelete) return;

    try {

      const API = import.meta.env.VITE_API_URL;

      const response = await fetch(
        `${API}/api/users/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Error eliminando usuario."
        );
      }

      fetchUsers();

      alert("Usuario eliminado correctamente.");

    } catch (err) {

      alert(err.message);

    }
  };

  // Handle Match Simulation Action
  const handleMatchSimulation = async (matchId, action) => {
    setActionInProgress(prev => ({ ...prev, [matchId]: true }));
    setMatchError("");
    
    const sh = scoreHomeInputs[matchId] !== undefined ? parseInt(scoreHomeInputs[matchId], 10) : 0;
    const sa = scoreAwayInputs[matchId] !== undefined ? parseInt(scoreAwayInputs[matchId], 10) : 0;

    try {
      const API = import.meta.env.VITE_API_URL;

      const response = await fetch(`${API}/api/matches/${matchId}/simulate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          scoreHome: sh,
          scoreAway: sa
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Error en la simulación del partido.");
      
      // Update local state for that match
      setMatches(prev => prev.map(m => m.id === matchId ? data.match : m));
    } catch (err) {
      setMatchError(err.message);
    } finally {
      setActionInProgress(prev => ({ ...prev, [matchId]: false }));
    }
  };

  // Sync matches from internet (reset matches)
  const handleSyncMatches = async () => {
    if (!window.confirm("¿Estás seguro de que quieres sincronizar partidos desde internet? Esto borrará los resultados en vivo simulados y reiniciará los marcadores.")) return;
    
    setMatchesLoading(true);
    setMatchError("");
    try {
      const API = import.meta.env.VITE_API_URL;

      const response = await fetch(`${API}/api/matches/sync`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Error al sincronizar partidos.");
      
      setMatches(data.matches);
      alert("Partidos sincronizados exitosamente.");
    } catch (err) {
      setMatchError(err.message);
    } finally {
      setMatchesLoading(false);
    }
  };

  const handleScoreInputChange = (matchId, side, val) => {
    const numVal = val === "" ? "" : Math.max(0, parseInt(val, 10));
    if (side === "home") {
      setScoreHomeInputs(prev => ({ ...prev, [matchId]: numVal }));
    } else {
      setScoreAwayInputs(prev => ({ ...prev, [matchId]: numVal }));
    }
  };

  // Filters
  const filteredMatches = matches.filter(m => selectedGroup === "Todos" || m.group === selectedGroup);

  return (
    <div>
      {/* Admin Tabs */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button
          className={`btn ${adminTab === "users" ? "btn-primary" : "btn-secondary"}`}
          style={{ flex: 1, padding: "10px", fontSize: "0.85rem", borderRadius: "12px" }}
          onClick={() => setAdminTab("users")}
        >
          <UserPlus size={16} />
          Administrar Usuarios
        </button>
        <button
          className={`btn ${adminTab === "matches" ? "btn-primary" : "btn-secondary"}`}
          style={{ flex: 1, padding: "10px", fontSize: "0.85rem", borderRadius: "12px" }}
          onClick={() => setAdminTab("matches")}
        >
          <Settings size={16} />
          Simulador Partidos
        </button>
      </div>

      {/* ADMIN USERS SUB-VIEW */}
      {adminTab === "users" && (
        <div>
          <div className="glass-card">
            <h3 className="admin-section-title">
              <UserPlus size={18} />
              Agregar Nuevo Usuario
            </h3>

            {userError && (
              <div style={{ color: "var(--error-rose)", fontSize: "0.85rem", marginBottom: "12px" }}>
                {userError}
              </div>
            )}

            {userSuccessMessage && (
              <div style={{ color: "var(--success-emerald)", fontSize: "0.85rem", marginBottom: "12px" }}>
                {userSuccessMessage}
              </div>
            )}

            <form onSubmit={handleCreateUser} style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Nombre de Usuario</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. juan_perez"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: "auto", padding: "14px 20px" }}>
                Crear
              </button>
            </form>

            {generatedPassword && (
              <div className="generated-password-box">
                <div style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "center", color: "var(--success-emerald)", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase" }}>
                  <ShieldAlert size={14} />
                  Contraseña Temporal Generada
                </div>
                <div className="generated-pwd-text">{generatedPassword}</div>
                <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", margin: 0 }}>
                  Compártela con el usuario. Tendrá que cambiarla obligatoriamente al iniciar sesión por primera vez.
                </p>
              </div>
            )}
          </div>

          <div className="glass-card">
            <h3 className="admin-section-title">Usuarios Participantes</h3>
            {usersLoading && userList.length === 0 ? (
              <div className="centered-state">
                <RefreshCw className="animate-spin" size={16} />
              </div>
            ) : userList.length === 0 ? (
              <p style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-secondary)", padding: "10px 0" }}>
                No hay usuarios registrados aún.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {userList.map(u => (
                  <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "10px", border: "1px solid var(--panel-border)" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{u.username}</div>
                      <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
                        {u.mustChangePassword ? (
                          <span style={{ fontSize: "0.68rem", background: "rgba(223, 161, 54, 0.1)", border: "1px solid var(--primary-gold)", color: "var(--primary-gold)", padding: "1px 5px", borderRadius: "4px" }}>
                            Pendiente cambio clave
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.68rem", background: "rgba(16, 185, 129, 0.1)", border: "1px solid var(--success-emerald)", color: "var(--success-emerald)", padding: "1px 5px", borderRadius: "4px" }}>
                            Clave personalizada
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
  
                    <div style={{ fontWeight: 800, color: "var(--primary-gold)" }}>
                      {u.totalPoints} pts
                    </div>

                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      style={{
                        background: "#dc2626",
                        color: "white",
                        border: "none",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        fontWeight: 700
                      }}
                    >
                      Eliminar
                    </button>

                  </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADMIN MATCH CONTROLLER SUB-VIEW */}
      {adminTab === "matches" && (
        <div>
          {/* Sync Button */}
          <div className="glass-card" style={{ padding: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Calendario Oficial</span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Sincroniza/restaura partidos desde internet</span>
              </div>
              <button onClick={handleSyncMatches} className="btn btn-secondary btn-sm" style={{ width: "auto" }}>
                <RefreshCw size={14} />
                Sincronizar
              </button>
            </div>
          </div>

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

          {matchError && (
            <div style={{ color: "var(--error-rose)", fontSize: "0.85rem", marginBottom: "12px", textAlign: "center" }}>
              {matchError}
            </div>
          )}

          {matchesLoading && filteredMatches.length === 0 ? (
            <div className="centered-state">
              <RefreshCw className="animate-spin" size={24} />
              <span>Cargando partidos...</span>
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="centered-state">
              <span>No hay partidos disponibles.</span>
            </div>
          ) : (
            <div>
              {filteredMatches.map(m => {
                const isLive = m.status === "live";
                const isFinished = m.status === "finished";
                const isLocked = m.isLocked;
                
                const homeVal = scoreHomeInputs[m.id] !== undefined ? scoreHomeInputs[m.id] : "";
                const awayVal = scoreAwayInputs[m.id] !== undefined ? scoreAwayInputs[m.id] : "";
                const isActing = actionInProgress[m.id];

                return (
                  <div key={m.id} className="glass-card" style={{ padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
                      <span>{m.group}</span>
                      <span style={{ textTransform: "uppercase", fontWeight: 700, color: isLive ? "var(--error-rose)" : isFinished ? "var(--success-emerald)" : "var(--text-muted)" }}>
                        {isLive ? "• EN VIVO" : isFinished ? "Finalizado" : "Programado"}
                      </span>
                    </div>

                    <div className="match-row" style={{ marginBottom: "10px" }}>
                      <div className="match-team">
                        <img 
                          src={`https://flagcdn.com/w80/${m.teamHomeFlagCode}.png`} 
                          alt={m.teamHome} 
                          style={{ width: "40px", height: "26px", borderRadius: "4px", objectFit: "cover", boxShadow: "0 2px 6px rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.1)" }} 
                        />
                        <span className="team-name">{m.teamHome}</span>
                      </div>
                      
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Marcador</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {isFinished ? (
                            <span style={{ fontSize: "1.6rem", fontWeight: 800 }}>{m.scoreHome} - {m.scoreAway}</span>
                          ) : (
                            <>
                              <input
                                type="number"
                                min="0"
                                className="score-input"
                                style={{ width: "48px", padding: "4px" }}
                                value={homeVal}
                                onChange={(e) => handleScoreInputChange(m.id, "home", e.target.value)}
                                disabled={isFinished || isActing}
                              />
                              <span>-</span>
                              <input
                                type="number"
                                min="0"
                                className="score-input"
                                style={{ width: "48px", padding: "4px" }}
                                value={awayVal}
                                onChange={(e) => handleScoreInputChange(m.id, "away", e.target.value)}
                                disabled={isFinished || isActing}
                              />
                            </>
                          )}
                        </div>
                      </div>

                      <div className="match-team">
                        <img 
                          src={`https://flagcdn.com/w80/${m.teamAwayFlagCode}.png`} 
                          alt={m.teamAway} 
                          style={{ width: "40px", height: "26px", borderRadius: "4px", objectFit: "cover", boxShadow: "0 2px 6px rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.1)" }} 
                        />
                        <span className="team-name">{m.teamAway}</span>
                      </div>
                    </div>

                    {/* Simulation Controls Block */}
                    <div className="admin-match-control">
                      {/* Scheduled Controls */}
                      {!isLive && !isFinished && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() => handleMatchSimulation(m.id, isLocked ? "unlock" : "lock")}
                              className="btn btn-secondary btn-sm"
                              style={{ flex: 1 }}
                              disabled={isActing}
                            >
                              {isLocked ? <Unlock size={12} /> : <Lock size={12} />}
                              <span>{isLocked ? "Permitir Pronósticos" : "Bloquear Pronósticos"}</span>
                            </button>
                            
                            <button
                              onClick={() => handleMatchSimulation(m.id, "start_live")}
                              className="btn btn-success btn-sm"
                              style={{ flex: 1, background: "var(--error-rose)" }}
                              disabled={isActing}
                            >
                              <Play size={12} />
                              <span>Simular Inicio</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Live Controls */}
                      {isLive && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() => handleMatchSimulation(m.id, "update_live")}
                              className="btn btn-secondary btn-sm"
                              style={{ flex: 1 }}
                              disabled={isActing}
                            >
                              <RefreshCw size={12} />
                              <span>Actualizar En Vivo</span>
                            </button>
                            
                            <button
                              onClick={() => handleMatchSimulation(m.id, "finalize")}
                              className="btn btn-success btn-sm"
                              style={{ flex: 1 }}
                              disabled={isActing}
                            >
                              <CheckCircle size={12} />
                              <span>Finalizar Partido</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Finished display */}
                      {isFinished && (
                        <div style={{ display: "flex", justifyContent: "center", fontSize: "0.72rem", color: "var(--success-emerald)", gap: "4px", alignItems: "center" }}>
                          <CheckCircle size={12} />
                          <span>Marcador cerrado y puntos calculados automáticamente.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
