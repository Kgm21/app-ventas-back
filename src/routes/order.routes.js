import { Router } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  addPayment // 🔥 IMPORTANTE
} from "../controllers/order.controller.js";

import { authAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

/* ======================================================
   SEGURIDAD
====================================================== */

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: "Demasiadas peticiones. Intenta más tarde.",
  },
});

router.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
      },
    },
  })
);

/* ======================================================
   RUTA PÚBLICA
====================================================== */

router.post("/", createOrder);

/* ======================================================
   RUTAS ADMIN
====================================================== */

router.get("/", authAdmin, orderLimiter, getOrders);

router.get("/:id", authAdmin, orderLimiter, getOrderById);

router.put("/:id/status", authAdmin, orderLimiter, updateOrderStatus);

// 🔥 ESTA ES LA QUE TE FALTABA
router.post("/:id/payment", authAdmin, orderLimiter, addPayment);

router.put("/:id/cancel", authAdmin, orderLimiter, cancelOrder);

export default router;