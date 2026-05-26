import React, { useState } from "react";
import { KeyRound, ShieldAlert } from "lucide-react";

export default function PasswordReset({ token, onPasswordChanged }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      setError("Por favor rellene ambos campos.");
      return;
    }

    if (newPassword.length < 4) {
      setError("La contraseña debe tener al menos 4 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al cambiar la contraseña.");
      }

      onPasswordChanged(data.token, data.user);
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
            background: "rgba(6, 182, 212, 0.15)",
            padding: "16px",
            borderRadius: "50%",
            border: "1px solid var(--secondary-teal)",
            color: "var(--secondary-teal)"
          }}
        >
          <KeyRound size={40} />
        </div>
      </div>
      
      <h2 className="form-title">Nueva Contraseña</h2>
      <p className="form-subtitle">Es tu primer ingreso. Por seguridad, debes cambiar la contraseña temporal.</p>

      <div className="info-alert" style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: "2px", color: "var(--secondary-teal)" }} />
        <span>Una vez que actualices tu contraseña, podrás ingresar a la quiniela y guardar tus pronósticos.</span>
      </div>

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
          <label className="form-label" htmlFor="newPassword">Nueva Contraseña</label>
          <input
            id="newPassword"
            type="password"
            className="form-input"
            placeholder="Mínimo 4 caracteres"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <div className="form-group" style={{ marginBottom: "24px" }}>
          <label className="form-label" htmlFor="confirmPassword">Confirmar Nueva Contraseña</label>
          <input
            id="confirmPassword"
            type="password"
            className="form-input"
            placeholder="Repite la contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading}
        >
          {loading ? "Actualizando..." : "Actualizar Contraseña"}
        </button>
      </form>
    </div>
  );
}
