import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token requerido" });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // ← mejora: distinguir entre expirado e inválido
      const message =
        err.name === "TokenExpiredError"
          ? "Token expirado"
          : "Token inválido";
      return res.status(401).json({ message });
    }

    // Opcional: verificar que tenga id (por si el token está mal formado)
    if (!decoded?.id) {
      return res.status(401).json({ message: "Token mal formado" });
    }

    // Buscar usuario – select("-password") está perfecto
    const user = await User.findById(decoded.id).select("-password -__v"); // ← -__v es buena práctica

    if (!user) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Acceso denegado: requiere rol admin" });
    }

    // Opcional pero recomendado: comprobar si la cuenta está activa/bloqueada
    // if (!user.isActive) {
    //   return res.status(403).json({ message: "Cuenta inactiva" });
    // }

    req.user = user;           // ← bien
    req.token = token;         // ← útil a veces (logout de ese token, blacklist, etc.)
    req.tokenDecoded = decoded;// ← muy útil para auditoría o refresh tokens

    next();
  } catch (error) {
    console.error("AuthAdmin middleware error:", error);
    return res.status(500).json({ message: "Error de autenticación" });
  }
};
