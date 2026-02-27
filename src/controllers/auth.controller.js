// src/controllers/auth.controller.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email y contraseña son requeridos",
      });
    }

    const emailNormalized = email.toLowerCase().trim();

    const user = await User.findOne({ email: emailNormalized })
      .select("+password +role +email +name") // +name si lo tenés
      .lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET no definido en .env");
      return res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }

    // Genera el token JWT
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d", // 7 días
        algorithm: "HS256",
      }
    );

    // Cookie httpOnly segura (se envía automáticamente con withCredentials: true)
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      path: "/",
    });

    // Respuesta con token en el body (para que el frontend lo guarde en localStorage si quiere)
    res.status(200).json({
      success: true,
      message: "Inicio de sesión exitoso",
      token, // ← ahora sí se devuelve en el body
      role: user.role,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name || user.email.split("@")[0],
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

// LOGOUT
export const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });

  res.json({
    success: true,
    message: "Sesión cerrada correctamente",
  });
};

// OBTENER USUARIO ACTUAL (/me)
export const me = async (req, res) => {
  try {
    // req.user viene del middleware auth (jwt.verify)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "No autenticado",
      });
    }

    const user = await User.findById(req.user.id)
      .select("-password -__v -resetPasswordToken -resetPasswordExpires")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name || user.email.split("@")[0],
        // agrega otros campos que necesites
      },
    });
  } catch (error) {
    console.error("Error en /me:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};