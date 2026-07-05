// =============================================================================
// SERVITEX — Servicio de Autenticación
// =============================================================================
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

export const authService = {
  /**
   * Autentica un usuario con su correo y contraseña.
   * Genera un token JWT de 8 horas para accesos autorizados.
   */
  async login(correo: string, password: string) {
    const usuario = await prisma.usuario.findFirst({
      where: {
        correo: {
          equals: correo.trim(),
          mode: 'insensitive',
        },
        activo: true,
      },
    });

    if (!usuario) {
      throw new Error('Correo o contraseña incorrectos.');
    }

    const match = await bcrypt.compare(password, usuario.passwordHash);
    if (!match) {
      throw new Error('Correo o contraseña incorrectos.');
    }

    const payload = {
      userId: usuario.id,
      rol: usuario.rol,
      nombre: usuario.nombre,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '8h' });

    return {
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
    };
  },

  /**
   * Obtiene el perfil de un usuario por su ID interno.
   * Nunca expone el hash de la contraseña por motivos de seguridad.
   */
  async obtenerPerfil(userId: number) {
    const usuario = await prisma.usuario.findFirst({
      where: {
        id: userId,
        activo: true,
      },
    });

    if (!usuario) {
      throw new Error('Usuario no encontrado o inactivo.');
    }

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
    };
  },
};
