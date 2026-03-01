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

const router = Router();

// Rate limit
const productLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Demasiadas peticiones. Intenta más tarde." },
});

// Helmet
router.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "https://res.cloudinary.com"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })
);

// Rutas públicas
router.get("/", getProducts);
router.get("/:id", getProductById);
router.get("/:id/whatsapp-consult", getWhatsappConsultLink);

// Rutas privadas (ADMIN)
router.post(
  "/",
  authAdmin,
  productLimiter,
  createProduct
);

router.put(
  "/:id",
  authAdmin,
  productLimiter,
  updateProduct
);

router.delete("/:id", authAdmin, deleteProduct);

export default router;