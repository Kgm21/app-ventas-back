import "dotenv/config"; // SIEMPRE ARRIBA
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();



// 🔥 LOG GLOBAL MÁS CLARO Y VISIBLE (primero que todo)
app.use((req, res, next) => {
  console.log("\n═══════════════════════════════════════════════");
  console.log(`[${new Date().toLocaleString('es-AR')}] ${req.method} ${req.originalUrl}`);
  console.log("Origen:", req.headers.origin || "sin origin (Postman/cURL?)");
  console.log("Content-Type:", req.headers['content-type'] || "no enviado");
  console.log("Body keys:", Object.keys(req.body || {}));
  console.log("Query:", req.query);
  console.log("Params:", req.params);
  console.log("═══════════════════════════════════════════════\n");
  next();
});

// 🔥 CORS - configurado para que funcione con Postman y frontend
const allowedOrigins = [
  "http://localhost:5173",
  "https://zerografica-prueba.netlify.app",
  // si querés permitir todo para pruebas rápidas (solo temporal):
  // true
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("CORS bloqueó origen:", origin);
      callback(new Error(`Origen no permitido: ${origin}`));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true,
  optionsSuccessStatus: 200,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta raíz de prueba
app.get("/", (req, res) => {
  res.send("API Carteras funcionando 🚀");
});

// Rutas principales
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);

// Ruta de test fácil para confirmar que el servidor responde
app.get("/api/test", (req, res) => {
  res.json({
    message: "Ruta de prueba OK",
    time: new Date().toISOString(),
    origin: req.headers.origin || "sin origin",
    environment: process.env.NODE_ENV || "development",
  });
});

export default app;