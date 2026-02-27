import Category from "../models/Category.js";

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

    // Evitar duplicados
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

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ active: true })
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error getCategories:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener categorías",
    });
  }
};
