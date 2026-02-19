import "dotenv/config"; // 👈 SIEMPRE ARRIBA
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import userRoutes from "./routes/user.routes.js";          // ← AGREGA ESTA LÍNEA

const app = express();

/* 🔥 CORS CONFIGURADO (ANTES DE LAS RUTAS) */
app.use(
  cors({
    origin: "http://localhost:5173", // Frontend Vite
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());

/* test */
app.get("/", (req, res) => {
  res.send("API Carteras funcionando 🚀");
});

/* rutas */
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);          // ← AGREGA ESTA LÍNEA

// Si quieres una ruta de prueba para verificar que el servidor responde:
app.get("/api/test", (req, res) => {
  res.json({ message: "Ruta de prueba OK", time: new Date().toISOString() });
});

export default app;
