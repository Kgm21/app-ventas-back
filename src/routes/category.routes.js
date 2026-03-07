
import { Router } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import {
  createCategory,
  getCategoryBreadcrumb,
  getCategories,
  getCategoriesFlat,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";

import { authAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// =====================
// SEGURIDAD
// =====================

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

// Árbol de categorías (para menú tienda)
router.get("/", getCategories);

// Lista plana (para panel admin)
router.get("/flat", getCategoriesFlat);
// Breadcrumb de categoría
router.get("/breadcrumb/:id", getCategoryBreadcrumb);

// =====================
// RUTAS ADMIN
// =====================

router.post("/", authAdmin, categoryLimiter, createCategory);

router.put("/:id", authAdmin, categoryLimiter, updateCategory);

router.delete("/:id", authAdmin, categoryLimiter, deleteCategory);

export default router;

