// routes/user.routes.js
import express from "express";
import { changePassword } from "../controllers/user.controller.js";
import { authAdmin } from "../middlewares/auth.middleware.js";  // o el middleware que uses para auth

const router = express.Router();

// Cambio de contraseña para el usuario autenticado (usa req.user.id del middleware)
router.post("/change-password", authAdmin, changePassword);

// Si más adelante quieres una ruta para que el ADMIN cambie la contraseña de OTRO usuario:
// router.put("/:id/password", authAdmin, changePasswordForOtherUser);

export default router;