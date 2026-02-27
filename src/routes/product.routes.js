import { Router } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getWhatsappConsultLink,
} from "../controllers/product.controller.js";
import { authAdmin } from "../middlewares/auth.middleware.js";
import upload from "../config/multer.js";

// Crear rate limit para rutas sensibles (POST y PUT)
const productLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // máximo 20 peticiones por IP en 15 min (ajusta según tu uso)
  message: { success: false, message: "Demasiadas peticiones. Intenta más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware que rechaza si no es multipart/form-data en rutas que esperan archivos
const requireMultipart = (req, res, next) => {
  if ((req.method === "POST" || req.method === "PUT") && 
      !req.headers['content-type']?.includes("multipart/form-data")) {
    console.warn(`[RECHAZADO] Content-Type inválido en ${req.method} ${req.originalUrl}: ${req.headers['content-type']}`);
    return res.status(400).json({
      success: false,
      message: "Se espera multipart/form-data para subir imágenes",
    });
  }
  next();
};

const router = Router();

// Helmet (seguridad HTTP) aplicado solo a este router
router.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "https://res.cloudinary.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // ajusta si usas scripts externos
    },
  },
}));

// Debug global (solo en desarrollo)
router.use((req, res, next) => {
  if (process.env.NODE_ENV !== "production" && (req.method === "POST" || req.method === "PUT")) {
    console.log("\n╔══════════════════════════════════════════════╗");
    console.log(`║ [REQUEST] ${req.method} ${req.originalUrl}`);
    console.log(`║ Origen: ${req.headers.origin || "sin origin"}`);
    console.log(`║ Content-Type: ${req.headers['content-type'] || "no enviado"}`);
    console.log(`║ Authorization: ${req.headers.authorization ? "Sí" : "No"}`);
    console.log("╚══════════════════════════════════════════════╝\n");
  }
  next();
});

// Rutas públicas (sin auth, sin multer, sin limiter)
router.get("/", getProducts);
router.get("/:id", getProductById);
router.get("/:id/whatsapp-consult", getWhatsappConsultLink);

// Rutas privadas (admin)
router.post(
  "/",
  authAdmin,
  requireMultipart,            // rechaza si no es multipart
  productLimiter,              // rate limit
  upload.array("images", 5),   // Multer
  createProduct
);

router.put(
  "/:id",
  authAdmin,
  requireMultipart,
  productLimiter,
  upload.array("images", 5),
  updateProduct
);

router.delete("/:id", authAdmin, deleteProduct);

export default router;