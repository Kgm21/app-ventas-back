import { Router } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,          // ✅ NUEVO
  updateOrderStatus,
  cancelOrder,
  addPayment
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

/* ✅ EDITAR PEDIDO */
router.put("/:id", authAdmin, orderLimiter, updateOrder);

/* CAMBIAR ESTADO */
router.put("/:id/status", authAdmin, orderLimiter, updateOrderStatus);

/* AGREGAR PAGO */
router.post("/:id/payment", authAdmin, orderLimiter, addPayment);

/* CANCELAR */
router.put("/:id/cancel", authAdmin, orderLimiter, cancelOrder);

export default router;