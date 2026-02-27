// routes/auth.routes.js
import express from "express";
import { body, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";

import { login, logout } from "../controllers/auth.controller.js";
import { authAdmin } from "../middlewares/auth.middleware.js"; // ← USAMOS authAdmin (el que ya tenés exportado)

const router = express.Router();

// Rate limit para login: 5 intentos cada 15 minutos por IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  message: {
    success: false,
    message: "Demasiados intentos de login. Intenta de nuevo en 15 minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validación de campos con express-validator
const loginValidation = [
  body("email")
    .trim()
    .notEmpty().withMessage("El email es obligatorio")
    .isEmail().withMessage("Email inválido")
    .normalizeEmail(),
  body("password")
    .trim()
    .notEmpty().withMessage("La contraseña es obligatoria")
    .isLength({ min: 6 }).withMessage("La contraseña debe tener al menos 6 caracteres"),
];

// Ruta de login (pública, con rate-limit y validación)
router.post(
  "/login",
  loginLimiter,
  loginValidation,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Datos inválidos",
        errors: errors.array(),
      });
    }
    next();
  },
  login
);

// Ruta de logout (protegida: solo admin puede cerrar sesión)
router.post("/logout", authAdmin, logout);

export default router;