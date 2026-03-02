import Category from "../models/Category.js";
import Product from "../models/Product.js";

// Crear categoría
export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "El nombre de la categoría es obligatorio",
      });
    }

    const nameNormalized = name.trim();

    // Evitar duplicados (case-insensitive)
    const exists = await Category.findOne({
      name: new RegExp(`^${nameNormalized}$`, "i"),
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "La categoría ya existe",
      });
    }

    const category = await Category.create({
      name: nameNormalized,
      active: true,
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Error createCategory:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear categoría",
    });
  }
};

// Obtener categorías con cantidad de productos
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ active: true })
      .sort({ name: 1 })
      .lean();

    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const count = await Product.countDocuments({ category: cat._id });
        return {
          ...cat,
          productCount: count,
        };
      })
    );

    res.json({
      success: true,
      data: categoriesWithCount,
    });
  } catch (error) {
    console.error("Error getCategories:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener categorías",
    });
  }
};

// Editar categoría
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, active } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Categoría no encontrada",
      });
    }

    if (name) category.name = name.trim();
    if (active !== undefined) category.active = active;

    await category.save();

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Error updateCategory:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar categoría",
    });
  }
};

// Eliminar categoría
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Categoría no encontrada",
      });
    }

    res.json({
      success: true,
      message: "Categoría eliminada correctamente",
    });
  } catch (error) {
    console.error("Error deleteCategory:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar categoría",
    });
  }
};