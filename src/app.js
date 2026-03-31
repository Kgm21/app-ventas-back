import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();

// 1. Seguridad básica (Helmet)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "https://res.cloudinary.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

// 2. Compresión
app.use(compression());

// 3. CORS (ARREGLADO 🔥)
const allowedOrigins = [
  "http://localhost:5173",
  "https://zerografica-prueba.netlify.app",
  "https://zeromultishop.com",
  "https://www.zeromultishop.com"
];

app.use(cors({
  origin: (origin, callback) => {
    // Permite requests sin origin (Postman, mobile apps, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS bloqueó origen: ${origin}`);
      callback(new Error(`Origen no permitido: ${origin}`));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true,
  optionsSuccessStatus: 200,
}));

// 4. Log (solo desarrollo)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log("\n╔══════════════════════════════════════════════╗");
    console.log(`║ [${new Date().toLocaleString('es-AR')}] ${req.method} ${req.originalUrl}`);
    console.log(`║ Origen: ${req.headers.origin || "sin origin"}`);
    console.log(`║ Content-Type: ${req.headers['content-type'] || "no enviado"}`);
    console.log(`║ Authorization: ${req.headers.authorization ? "Sí (Bearer)" : "No"}`);
    console.log(`║ Body keys: ${Object.keys(req.body || {})}`);
    console.log(`║ Query: ${JSON.stringify(req.query)}`);
    console.log(`║ Params: ${JSON.stringify(req.params)}`);
    console.log("╚══════════════════════════════════════════════╝\n");
    next();
  });
}

// 5. Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 6. Ruta raíz
app.get("/", (req, res) => {
  res.send("API Carteras funcionando 🚀");
});

// 7. Rutas
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);

// 8. Test
app.get("/api/test", (req, res) => {
  res.json({
    message: "Ruta de prueba OK",
    time: new Date().toISOString(),
    origin: req.headers.origin || "sin origin",
    environment: process.env.NODE_ENV || "development",
  });
});

// 9. 404
app.use((req, res) => {
  console.warn(`404 - Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
  });
});

// 10. Error handler
app.use((err, req, res, next) => {
  console.error("Error global:", err.stack || err);
  res.status(500).json({
    success: false,
    message: err.message || "Error interno del servidor",
  });
});

export default app;