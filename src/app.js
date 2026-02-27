import "dotenv/config"; // SIEMPRE ARRIBA

import express from "express";
import cors from "cors";
import helmet from "helmet"; // ← agregado (seguridad básica HTTP)
import compression from "compression"; // ← agregado (reduce tamaño de respuestas)

import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();

// 1. Seguridad básica (Helmet) - agrega headers importantes
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "https://res.cloudinary.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // ajusta si usas scripts externos
    },
  },
}));

// 2. Compresión (reduce ancho de banda)
app.use(compression());

// 3. CORS - más seguro y con log de bloqueos
const allowedOrigins = [
  "http://localhost:5173",
  "https://zerografica-prueba.netlify.app",
  // Agrega tu dominio final cuando lo tengas
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS bloqueó origen no permitido: ${origin}`);
      callback(new Error(`Origen no permitido: ${origin}`));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true,
  optionsSuccessStatus: 200,
}));

// 4. Log global (solo en desarrollo o con nivel controlado)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log("\n╔══════════════════════════════════════════════╗");
    console.log(`║ [${new Date().toLocaleString('es-AR')}] ${req.method} ${req.originalUrl}`);
    console.log(`║ Origen: ${req.headers.origin || "sin origin (Postman/cURL?)"}`);
    console.log(`║ Content-Type: ${req.headers['content-type'] || "no enviado"}`);
    console.log(`║ Authorization: ${req.headers.authorization ? "Sí (Bearer)" : "No"}`);
    console.log(`║ Body keys: ${Object.keys(req.body || {})}`);
    console.log(`║ Query: ${JSON.stringify(req.query)}`);
    console.log(`║ Params: ${JSON.stringify(req.params)}`);
    console.log("╚══════════════════════════════════════════════╝\n");
    next();
  });
}

// 5. Parseo de body (con límites para evitar ataques DoS)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 6. Ruta raíz de prueba
app.get("/", (req, res) => {
  res.send("API Carteras funcionando 🚀");
});

// 7. Rutas principales
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);

// 8. Ruta de test (útil para verificar CORS y conexión)
app.get("/api/test", (req, res) => {
  res.json({
    message: "Ruta de prueba OK",
    time: new Date().toISOString(),
    origin: req.headers.origin || "sin origin",
    environment: process.env.NODE_ENV || "development",
  });
});

// 9. Middleware 404 (captura rutas no encontradas)
app.use((req, res) => {
  console.warn(`404 - Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
  });
});

// 10. Middleware de errores (captura errores no manejados)
app.use((err, req, res, next) => {
  console.error("Error global no manejado:", err.stack || err);
  res.status(500).json({
    success: false,
    message: "Error interno del servidor",
  });
});

export default app;