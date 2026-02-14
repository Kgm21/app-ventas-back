import { Router } from "express";
import { createCategory, getCategories } from "../controllers/category.controller.js";

const router = Router();

router.post("/", createCategory);
router.get("/", getCategories);

export default router;
