import Category from "../models/Category.js";
import Product from "../models/Product.js";

// ======================
// UTILIDAD: Generar slug SEO-friendly
// ======================
const generateSlug = (text) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");

// ======================
// UTILIDAD: Obtener conteo de productos por categoría (reutilizable)
// ======================
async function getProductCounts(categoryIds) {
  if (!categoryIds?.length) return {};

  const counts = await Product.aggregate([
    {
      $match: {
        category: { $in: categoryIds },
      },
    },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
      },
    },
  ]);

  return Object.fromEntries(counts.map((p) => [p._id.toString(), p.count]));
}

// ======================
// CREAR CATEGORÍA
// ======================
export const createCategory = async (req, res) => {
  try {
    let { name, parent } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "El nombre es obligatorio" });
    }

    name = name.trim();
    const slug = generateSlug(name);

    const parentId = parent && parent !== "null" ? parent : null;

    if (parentId) {
      const parentExists = await Category.exists({ _id: parentId, active: true });
      if (!parentExists) {
        return res.status(400).json({ success: false, message: "La categoría padre no existe o está inactiva" });
      }
    }

    const duplicate = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      parent: parentId || null,
      active: true,
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Ya existe una categoría con ese nombre en este nivel",
      });
    }

    const category = await Category.create({
      name,
      slug,
      parent: parentId,
      active: true,
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error("createCategory error:", error);
    res.status(500).json({ success: false, message: "Error al crear la categoría" });
  }
};

// ======================
// OBTENER CATEGORÍAS (tree + flat con conteo)
// ======================
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ active: true })
      .sort({ name: 1 })
      .lean();

    const categoryIds = categories.map((c) => c._id);
    const productMap = await getProductCounts(categoryIds);

    const map = new Map();
    categories.forEach((cat) => {
      map.set(cat._id.toString(), {
        ...cat,
        productCount: productMap[cat._id.toString()] || 0,
        children: [],
      });
    });

    const tree = [];

    categories.forEach((cat) => {
      const item = map.get(cat._id.toString());
      const parentIdStr = cat.parent?.toString();

      if (parentIdStr) {
        const parent = map.get(parentIdStr);
        if (parent) {
          parent.children.push(item);
        } else {
          tree.push(item); // huérfana → raíz
        }
      } else {
        tree.push(item);
      }
    });

    const flat = Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    res.json({
      success: true,
      data: { tree, flat },
    });
  } catch (error) {
    console.error("getCategories error:", error);
    res.status(500).json({ success: false, message: "Error al obtener categorías" });
  }
};

// ======================
// LISTA PLANA (para admin, selects, etc.) – con conteo
// ======================
export const getCategoriesFlat = async (req, res) => {
  try {
    const categories = await Category.find({ active: true })
      .sort({ name: 1 })
      .lean();

    const categoryIds = categories.map((c) => c._id);
    const productMap = await getProductCounts(categoryIds);

    const flatWithCount = categories.map((cat) => ({
      ...cat,
      productCount: productMap[cat._id.toString()] || 0,
    }));

    res.json({
      success: true,
      data: flatWithCount,
    });
  } catch (error) {
    console.error("getCategoriesFlat error:", error);
    res.status(500).json({ success: false, message: "Error al obtener categorías planas" });
  }
};

// ======================
// ACTUALIZAR CATEGORÍA
// ======================
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    let { name, active, parent } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Categoría no encontrada" });
    }

    if (name) {
      name = name.trim();
      category.name = name;
      category.slug = generateSlug(name);
    }

    if (active !== undefined) {
      category.active = !!active;
    }

    if (parent !== undefined) {
      const parentId = parent && parent !== "null" ? parent : null;

      if (parentId?.toString() === id.toString()) {
        return res.status(400).json({
          success: false,
          message: "Una categoría no puede ser su propio padre",
        });
      }

      if (parentId) {
        const parentExists = await Category.exists({ _id: parentId, active: true });
        if (!parentExists) {
          return res.status(400).json({
            success: false,
            message: "Categoría padre no existe o está inactiva",
          });
        }
      }

      category.parent = parentId;
    }

    await category.save();

    res.json({ success: true, data: category });
  } catch (error) {
    console.error("updateCategory error:", error);
    res.status(500).json({ success: false, message: "Error al actualizar categoría" });
  }
};

// ======================
// ELIMINAR CATEGORÍA
// ======================
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const [productsCount, childrenCount] = await Promise.all([
      Product.countDocuments({ category: id }),
      Category.countDocuments({ parent: id }),
    ]);

    if (productsCount > 0) {
      return res.status(400).json({
        success: false,
        message: "No se puede eliminar una categoría con productos asociados",
      });
    }

    if (childrenCount > 0) {
      return res.status(400).json({
        success: false,
        message: "No se puede eliminar una categoría que tiene subcategorías",
      });
    }

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Categoría no encontrada" });
    }

    res.json({ success: true, message: "Categoría eliminada correctamente" });
  } catch (error) {
    console.error("deleteCategory error:", error);
    res.status(500).json({ success: false, message: "Error al eliminar categoría" });
  }
};

// ======================
// BREADCRUMB
// ======================
export const getCategoryBreadcrumb = async (req, res) => {
  try {
    const { id } = req.params;

    let category = await Category.findById(id).lean();
    if (!category) {
      return res.status(404).json({ success: false, message: "Categoría no encontrada" });
    }

    const breadcrumb = [];

    while (category) {
      breadcrumb.unshift({
        _id: category._id,
        name: category.name,
        slug: category.slug,
      });

      if (!category.parent) break;
      category = await Category.findById(category.parent).lean();
    }

    res.json({ success: true, data: breadcrumb });
  } catch (error) {
    console.error("getCategoryBreadcrumb error:", error);
    res.status(500).json({ success: false, message: "Error al obtener breadcrumb" });
  }
};