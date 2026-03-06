import { Router } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";

import { authAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Rate limit (solo admin)
const categoryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Demasiadas peticiones. Intenta más tarde.",
  },
});

// Helmet
router.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
      },
    },
  })
);

// =====================
// RUTAS PÚBLICAS
// =====================
router.get("/", getCategories);

// =====================
// RUTAS ADMIN
// =====================
router.post("/", authAdmin, categoryLimiter, createCategory);

router.put("/:id", authAdmin, categoryLimiter, updateCategory);

router.delete("/:id", authAdmin, deleteCategory);

export default router;