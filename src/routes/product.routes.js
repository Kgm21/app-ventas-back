import { Router } from "express";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getWhatsappConsultLink,
} from "../controllers/product.controller.js";
import { upload } from "../config/multer.js";
import { authAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// 🔓 Públicas
router.get("/", getProducts);
router.get("/:id/whatsapp-consult", getWhatsappConsultLink);
router.get("/:id", getProductById);

// 🔐 Privadas (solo admin)
router.post("/", authAdmin, upload.array("images", 5), createProduct);
router.put("/:id", authAdmin, upload.array("images", 5), updateProduct);
router.delete("/:id", authAdmin, deleteProduct);

export default router;
