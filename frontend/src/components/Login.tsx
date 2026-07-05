// =============================================================================
// SERVITEX — Componente: Login
// Formulario de inicio de sesión de acuerdo con las especificaciones del diseño.
// =============================================================================
import React, { useState } from 'react';
import { login } from '../services/authApi';
import type { LoginResponse } from '../types/auth';

interface LoginProps {
  onLoginSuccess: (token: string, response: LoginResponse) => void;
  onToast: (tipo: 'success' | 'error', mensaje: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onToast }) => {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!correo.trim() || !password) {
      setError('Por favor, complete todos los campos obligatorios.');
      return;
    }

    setCargando(true);
    try {
      const response = await login({ correo, password });
      onToast('success', `¡Bienvenido/a, ${response.usuario.nombre}!`);
      onLoginSuccess(response.token, response);
    } catch (err: any) {
      const msg = err.message || 'Error al iniciar sesión.';
      setError(msg);
      onToast('error', msg);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-base)',
      padding: '24px'
    }}>
      <div className="card" style={{
        maxWidth: '420px',
        width: '100%',
        padding: '36px 32px',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Cabecera / Marca */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="navbar-logo" style={{ 
            margin: '0 auto 12px auto',
            width: '44px',
            height: '44px',
            fontSize: '16px',
            fontWeight: 800
          }}>SX</div>
          <div className="navbar-title" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>SERVITEX</div>
          <div className="navbar-subtitle" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sistema de Gestión de Teñido</div>
        </div>

        {/* Encabezado del Formulario */}
        <h2 style={{
          fontSize: '22px',
          fontWeight: 800,
          color: 'var(--text-primary)',
          textAlign: 'center',
          marginBottom: '24px',
          letterSpacing: '-0.5px'
        }}>Iniciar Sesión</h2>

        {/* Formulario */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Correo Electrónico */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px', textAlign: 'left', marginBottom: '18px' }}>
            <label className="form-label" htmlFor="input-correo" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
              CORREO <span className="required">*</span>
            </label>
            <input
              id="input-correo"
              type="email"
              className="form-input"
              placeholder="correo@servitex.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              disabled={cargando}
              autoComplete="email"
            />
          </div>

          {/* Contraseña */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px', textAlign: 'left', marginBottom: '24px' }}>
            <label className="form-label" htmlFor="input-password" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
              CONTRASEÑA <span className="required">*</span>
            </label>
            <input
              id="input-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={cargando}
              autoComplete="current-password"
            />
          </div>

          {/* Botón de Enviar */}
          <button
            id="btn-login-submit"
            type="submit"
            disabled={cargando}
            style={{
              width: '100%',
              height: '42px',
              fontSize: '14px',
              fontWeight: 600,
              backgroundColor: 'var(--accent-teal)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all var(--transition)'
            }}
          >
            {cargando ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Mensaje de Error */}
        {error && (
          <div style={{
            color: 'var(--accent-red)',
            fontSize: '12px',
            marginTop: '16px',
            fontWeight: 600,
            textAlign: 'center',
            backgroundColor: 'rgba(220, 38, 38, 0.06)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(220, 38, 38, 0.15)'
          }}>
            ❌ {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
