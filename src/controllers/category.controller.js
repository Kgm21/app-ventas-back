import Category from "../models/Category.js";

export const createCategory = async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ message: "Error al crear categoría" });
  }
};

export const getCategories = async (req, res) => {
  const categories = await Category.find({ active: true });
  res.json(categories);
};
