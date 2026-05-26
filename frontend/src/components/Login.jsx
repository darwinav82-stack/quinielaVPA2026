import React, { useState } from "react";
import { LogIn, Trophy } from "lucide-react";

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Por favor complete todos los campos.");
      return;
    }

    setError("");
    setLoading(true);

    const API = import.meta.env.VITE_API_URL;

try {
  const response = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username: username.trim(),
      password
    })
  });

  // Ver respuesta como texto primero
  const text = await response.text();

  // Intentar convertir a JSON
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("El servidor devolvió una respuesta inválida.");
  }

  if (!response.ok) {
    throw new Error(data.message || "Error al iniciar sesión.");
  }

  onLoginSuccess(data.token, data.user);

} catch (err) {
  setError(err.message);

} finally {
  setLoading(false);
}
  };

  return (
    <div className="glass-card" style={{ marginTop: "40px" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
        <div 
          style={{
            background: "rgba(223, 161, 54, 0.15)",
            padding: "16px",
            borderRadius: "50%",
            border: "1px solid var(--primary-gold)",
            color: "var(--primary-gold)"
          }}
        >
          <Trophy size={40} />
        </div>
      </div>
      
      <h2 className="form-title">Quiniela VPA</h2>
      <p className="form-subtitle">Ingresa tus credenciales para participar</p>

      {error && (
        <div 
          style={{
            background: "rgba(244, 63, 94, 0.1)",
            border: "1px solid var(--error-rose)",
            color: "var(--error-rose)",
            padding: "12px",
            borderRadius: "12px",
            fontSize: "0.85rem",
            marginBottom: "16px",
            textAlign: "center"
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="username">Usuario</label>
          <input
            id="username"
            type="text"
            className="form-input"
            placeholder="Introduce tu usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            autoComplete="username"
          />
        </div>

        <div className="form-group" style={{ marginBottom: "24px" }}>
          <label className="form-label" htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            className="form-input"
            placeholder="Introduce tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading}
        >
          {loading ? "Iniciando sesión..." : "Ingresar"}
          {!loading && <LogIn size={18} />}
        </button>
      </form>
    </div>
  );
}
