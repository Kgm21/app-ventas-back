import { Router } from "express";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getWhatsappConsultLink,
} from "../controllers/product.controller.js";
import { authAdmin } from "../middlewares/auth.middleware.js";
import upload from "../config/multer.js";  // default import (correcto)

const router = Router();

// Middleware global de debug (muestra TODA petición que llegue a este router)
router.use((req, res, next) => {
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log(`║ [REQUEST LLEGÓ AL ROUTER] ${req.method} ${req.originalUrl}`);
  console.log(`║ Origen: ${req.headers.origin || "sin origin (Postman/cURL?)"}`);
  console.log(`║ Content-Type: ${req.headers['content-type'] || "no enviado"}`);
  console.log(`║ Authorization: ${req.headers.authorization ? "Sí (Bearer)" : "No"}`);
  console.log(`║ Query: ${JSON.stringify(req.query)}`);
  console.log(`║ Body keys: ${Object.keys(req.body || {})}`);
  console.log("╚══════════════════════════════════════════════╝\n");
  next();
});

// Rutas públicas (sin auth ni Multer)
router.get("/", getProducts);
router.get("/:id", getProductById);
router.get("/:id/whatsapp-consult", getWhatsappConsultLink);

// Rutas privadas (admin) - con debug antes y después de Multer
router.post(
  "/",
  authAdmin,
  (req, res, next) => {
    console.log("[DEBUG MULTER POST] Antes de Multer - ¿req.files?", !!req.files);
    next();
  },
  upload.array("images", 5),
  (req, res, next) => {
    console.log("[DEBUG MULTER POST] DESPUÉS de Multer - ¿req.files?", !!req.files);
    console.log("[DEBUG MULTER POST] Cantidad de archivos:", req.files?.length || 0);
    console.log("[DEBUG MULTER POST] Nombres de archivos:", req.files?.map(f => f.originalname) || "ninguno");
    console.log("[DEBUG MULTER POST] Campos de texto:", req.body);
    next();
  },
  createProduct
);

router.put(
  "/:id",
  authAdmin,
  (req, res, next) => {
    console.log("[DEBUG MULTER PUT] Antes de Multer");
    next();
  },
  upload.array("images", 5),
  (req, res, next) => {
    console.log("[DEBUG MULTER PUT] DESPUÉS de Multer - Archivos:", req.files?.length || 0);
    console.log("[DEBUG MULTER PUT] Nombres:", req.files?.map(f => f.originalname) || "ninguno");
    next();
  },
  updateProduct
);

router.delete("/:id", authAdmin, deleteProduct);

export default router;