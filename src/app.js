import "dotenv/config"; // SIEMPRE ARRIBA
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();

// 🔥 CORS - maneja OPTIONS automáticamente, sin necesidad de app.options()
const allowedOrigins = [
  "http://localhost:5173",                       // Desarrollo local (Vite)
  "https://zerografica-prueba.netlify.app",      // Producción en Netlify
  // Agrega más si necesitas (ej. previews: process.env.ALLOWED_ORIGINS?.split(',') )
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir sin origin (Postman, curl, etc.) o si está en la lista
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin); // Devuelve el origin exacto (obligatorio con credentials: true)
      } else {
        callback(new Error(`Origen no permitido por CORS: ${origin}`));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,           // Si usas cookies o auth con credenciales
    optionsSuccessStatus: 200,   // Para compatibilidad con navegadores antiguos
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Útil si envías forms

// Ruta raíz de prueba
app.get("/", (req, res) => {
  res.send("API Carteras funcionando 🚀");
});

// Rutas principales
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);

// Ruta de test para depurar CORS y conexión
app.get("/api/test", (req, res) => {
  res.json({
    message: "Ruta de prueba OK",
    time: new Date().toISOString(),
    originRecibido: req.headers.origin || "sin origin",
    environment: process.env.NODE_ENV || "development",
  });
});

export default app;