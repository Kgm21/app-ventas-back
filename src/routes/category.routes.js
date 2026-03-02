import { Router } from "express";
import { 
  createCategory, 
  getCategories, 
  updateCategory, 
  deleteCategory 
} from "../controllers/category.controller.js";

const router = Router();

// Crear categoría
router.post("/", createCategory);

// Obtener todas las categorías
router.get("/", getCategories);

// Editar categoría por ID
router.put("/:id", updateCategory);

// Eliminar categoría por ID
router.delete("/:id", deleteCategory);

export default router;