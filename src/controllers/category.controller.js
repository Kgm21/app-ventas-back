import Category from "../models/Category.js";
import Product from "../models/Product.js";

// función simple para crear slug
const generateSlug = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/ /g, "-")
    .replace(/[^\w-]+/g, "");

// ======================
// CREAR CATEGORÍA
// ======================
export const createCategory = async (req, res) => {
  try {
    const { name, parent } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "El nombre de la categoría es obligatorio",
      });
    }

    const nameNormalized = name.trim();
    const slug = generateSlug(nameNormalized);

    // evitar duplicados
    const exists = await Category.findOne({
      name: new RegExp(`^${nameNormalized}$`, "i"),
      parent: parent || null,
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "La categoría ya existe",
      });
    }

    const category = await Category.create({
      name: nameNormalized,
      slug,
      parent: parent || null,
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

// ======================
// OBTENER CATEGORÍAS
// ======================
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ active: true })
      .populate("parent", "name")
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

// ======================
// ACTUALIZAR CATEGORÍA
// ======================
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, active, parent } = req.body;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Categoría no encontrada",
      });
    }

    if (name) {
      category.name = name.trim();
      category.slug = generateSlug(name);
    }

    if (active !== undefined) {
      category.active = active;
    }

    if (parent !== undefined) {
      category.parent = parent || null;
    }

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

// ======================
// ELIMINAR CATEGORÍA
// ======================
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // verificar productos
    const products = await Product.countDocuments({ category: id });

    if (products > 0) {
      return res.status(400).json({
        success: false,
        message: "No se puede eliminar una categoría con productos",
      });
    }

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