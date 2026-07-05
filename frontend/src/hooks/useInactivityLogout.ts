// =============================================================================
// SERVITEX — Hook de Cierre de Sesión por Inactividad
// =============================================================================
import { useEffect, useRef } from 'react';

/**
 * Hook para cerrar sesión automáticamente si el usuario no interactúa en un lapso de tiempo.
 * Resetea el temporizador ante movimientos de mouse, clicks o pulsaciones de teclas.
 */
export function useInactivityLogout(timeoutMs: number, onLogout: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLogoutRef = useRef(onLogout);

  // Mantener la referencia actualizada de onLogout para evitar reinicios innecesarios del useEffect
  useEffect(() => {
    onLogoutRef.current = onLogout;
  }, [onLogout]);

  useEffect(() => {
    if (timeoutMs <= 0) return;

    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        onLogoutRef.current();
      }, timeoutMs);
    };

    // Añadir escuchadores de eventos para detectar actividad
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);

    // Inicializar el temporizador al montar
    resetTimer();

    // Limpieza al desmontar
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, [timeoutMs]);
}
