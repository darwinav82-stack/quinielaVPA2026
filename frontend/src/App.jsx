import React, { useState, useEffect } from "react";
import { LogOut, Calendar, Trophy, ShieldAlert, Shield } from "lucide-react";
import Login from "./components/Login";
import PasswordReset from "./components/PasswordReset";
import UserDashboard from "./components/UserDashboard";
import Leaderboard from "./components/Leaderboard";
import AdminDashboard from "./components/AdminDashboard";

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("matches"); // matches, leaderboard, admin

  // Load session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("quiniela_token");
    const savedUser = localStorage.getItem("quiniela_user");
    
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("quiniela_token");
        localStorage.removeItem("quiniela_user");
      }
    }
  }, []);

  const handleLoginSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("quiniela_token", newToken);
    localStorage.setItem("quiniela_user", JSON.stringify(newUser));
    
    // Default tabs depending on role
    if (newUser.role === "admin") {
      setActiveTab("admin");
    } else {
      setActiveTab("matches");
    }
  };

  const handlePasswordChanged = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("quiniela_token", newToken);
    localStorage.setItem("quiniela_user", JSON.stringify(newUser));
    setActiveTab("matches"); // Go to matches panel once changed
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("quiniela_token");
    localStorage.removeItem("quiniela_user");
    setActiveTab("matches");
  };

  // Render correct content panel
  const renderTabContent = () => {
    switch (activeTab) {
      case "matches":
        return <UserDashboard token={token} />;
      case "leaderboard":
        return <Leaderboard token={token} />;
      case "admin":
        return user?.role === "admin" ? (
          <AdminDashboard token={token} />
        ) : (
          <div className="centered-state">
            <ShieldAlert size={32} />
            <span>Acceso no autorizado.</span>
          </div>
        );
      default:
        return <UserDashboard token={token} />;
    }
  };

  return (
    <div className="app-wrapper">
      <div className="mobile-container">
        
        {/* If not logged in, show Login */}
        {!token ? (
          <div className="main-content" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <Login onLoginSuccess={handleLoginSuccess} />
          </div>
        ) : user?.mustChangePassword ? (
          /* If first-login, force change password */
          <div className="main-content" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <PasswordReset token={token} onPasswordChanged={handlePasswordChanged} />
          </div>
        ) : (
          /* Logged In Main Layout */
          <>
            <header className="app-header">
              <div className="app-title">
                <span>⚽</span>
                <span>Quiniela VPA</span>
              </div>
              <div className="app-user-info">
                <span className="role-badge">
                  {user.role === "admin" ? "Admin" : `@${user.username}`}
                </span>
                <button className="logout-btn" onClick={handleLogout} title="Cerrar Sesión">
                  <LogOut size={18} />
                </button>
              </div>
            </header>

            <main className="main-content">
              {renderTabContent()}
            </main>

            <nav className="tab-bar">
              <button
                className={`tab-btn ${activeTab === "matches" ? "active" : ""}`}
                onClick={() => setActiveTab("matches")}
              >
                <Calendar size={22} />
                <span>Partidos</span>
              </button>
              
              <button
                className={`tab-btn ${activeTab === "leaderboard" ? "active" : ""}`}
                onClick={() => setActiveTab("leaderboard")}
              >
                <Trophy size={22} />
                <span>Posiciones</span>
              </button>

              {user?.role === "admin" && (
                <button
                  className={`tab-btn ${activeTab === "admin" ? "active" : ""}`}
                  onClick={() => setActiveTab("admin")}
                >
                  <Shield size={22} />
                  <span>Consola</span>
                </button>
              )}
            </nav>
          </>
        )}

      </div>
    </div>
  );
}
