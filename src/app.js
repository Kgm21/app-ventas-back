import "dotenv/config";   // 👈 ESTA LÍNEA ES CLAVE
import authRoutes from "./routes/auth.routes.js";
import express from "express";
import cors from "cors";
import productRoutes from "./routes/product.routes.js";
import categoryRoutes from "./routes/category.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API Carteras funcionando 🚀");
});

app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/auth", authRoutes);
export default app;

