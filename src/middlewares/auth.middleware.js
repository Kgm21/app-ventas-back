import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 1. Verificar header y formato Bearer
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Token requerido (formato: Bearer <token>)",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token no encontrado en el header",
      });
    }

    // 2. Verificar que exista JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET no definido en variables de entorno");
      return res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }

    // 3. Verificar token con manejo detallado de errores
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ["HS256"],
      });
    } catch (err) {
      let message = "Token inválido";

      switch (err.name) {
        case "TokenExpiredError":
          message = "Token expirado";
          break;
        case "JsonWebTokenError":
          message = "Token mal formado o inválido";
          break;
        case "NotBeforeError":
          message = "Token aún no válido (fecha anterior)";
          break;
        default:
          message = "Error al verificar token";
      }

      return res.status(401).json({
        success: false,
        message,
      });
    }

    // 4. Verificar que el token tenga ID
    if (!decoded?.id) {
      return res.status(401).json({
        success: false,
        message: "Token mal formado (falta ID de usuario)",
      });
    }

    // 5. Buscar usuario (lean + select mínimo para seguridad)
    const user = await User.findById(decoded.id)
      .select("-password -__v -createdAt -updatedAt -resetPasswordToken -resetPasswordExpires")
      .lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no encontrado o eliminado",
      });
    }

    // 6. Verificar rol admin
    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado: se requiere rol de administrador",
      });
    }

    // 7. Verificar cuenta activa (muy recomendado)
    if (user.active === false) {
      return res.status(403).json({
        success: false,
        message: "Cuenta inactiva o bloqueada",
      });
    }

    // 8. Asignar datos al request (útil para rutas siguientes)
    req.user = user;
    req.token = token;
    req.tokenDecoded = decoded;
    req.isAdmin = true; // ← bandera útil para rutas que requieran admin estricto

    next();
  } catch (error) {
    // Log sin exponer stack en producción (seguridad)
    console.error("Error crítico en authAdmin middleware:", {
      message: error.message,
      name: error.name,
      // stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });

    return res.status(500).json({
      success: false,
      message: "Error interno de autenticación",
    });
  }
};