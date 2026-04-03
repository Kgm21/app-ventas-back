import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

// Rutas
import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import userRoutes from "./routes/user.routes.js";
import orderRoutes from "./routes/order.routes.js"; // 🔥 AGREGADO

const app = express();

/* ======================================================
   1. SEGURIDAD (HELMET)
====================================================== */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "https://res.cloudinary.com", "data:"], // 🔥 data para previews
        scriptSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", "*"], // 🔥 APIs externas (WhatsApp, etc)
      },
    },
  })
);

/* ======================================================
   2. COMPRESIÓN
====================================================== */
app.use(compression());

/* ======================================================
   3. CORS (PRODUCCIÓN + DEV)
====================================================== */
const allowedOrigins = [
  "http://localhost:5173",
  "https://zerografica-prueba.netlify.app",
  "https://zeromultishop.com",
  "https://www.zeromultishop.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Postman / apps

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`❌ CORS bloqueado: ${origin}`);
        callback(new Error("No permitido por CORS"));
      }
    },
    credentials: true,
  })
);

/* ======================================================
   4. BODY PARSER
====================================================== */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ======================================================
   5. LOG (SOLO DEV)
====================================================== */
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`[${new Date().toLocaleString("es-AR")}] ${req.method} ${req.originalUrl}`);
    console.log("Origin:", req.headers.origin || "sin origin");
    console.log("Body:", req.body);
    console.log("Query:", req.query);
    console.log("Params:", req.params);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    next();
  });
}

/* ======================================================
   6. RUTA RAÍZ
====================================================== */
app.get("/", (req, res) => {
  res.send("API funcionando 🚀");
});

/* ======================================================
   7. RUTAS API
====================================================== */
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes); // 🔥 IMPORTANTE

/* ======================================================
   8. TEST
====================================================== */
app.get("/api/test", (req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || "dev",
  });
});

/* ======================================================
   9. 404
====================================================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
  });
});

/* ======================================================
   10. ERROR GLOBAL
====================================================== */
app.use((err, req, res, next) => {
  console.error("💥 ERROR GLOBAL:", err);

  res.status(500).json({
    success: false,
    message: err.message || "Error interno",
  });
});

export default app;