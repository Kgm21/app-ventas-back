import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();

// 🔥 CORS - esta configuración ya maneja OPTIONS automáticamente
const allowedOrigins = [
  "http://localhost:5173",
  "https://zerografica-prueba.netlify.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin || "*"); // permite sin origin (Postman, etc.)
      } else {
        callback(new Error(`Origen no permitido: ${origin}`));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("API Carteras funcionando 🚀");
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);

app.get("/api/test", (req, res) => {
  res.json({
    message: "Ruta de prueba OK",
    time: new Date().toISOString(),
    originRecibido: req.headers.origin || "sin origin",
    environment: process.env.NODE_ENV || "unknown",
  });
});

// ¡NO agregues wildcard con * aquí a menos que lo nombres!

export default app;