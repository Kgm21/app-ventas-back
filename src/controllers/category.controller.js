import Category from "../models/Category.js";
import Product from "../models/Product.js";


// ======================
// GENERAR SLUG
// ======================

const generateSlug = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");



// ======================
// CREAR CATEGORÍA
// ======================

export const createCategory = async (req, res) => {
  try {

    let { name, parent } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Nombre es obligatorio",
      });
    }

    name = name.trim();
    const slug = generateSlug(name);

    parent = parent && parent !== "null" ? parent : null;

    // verificar padre
    if (parent) {
      const parentExists = await Category.findById(parent);

      if (!parentExists) {
        return res.status(400).json({
          success: false,
          message: "Categoría padre no existe",
        });
      }
    }

    // evitar duplicados en mismo nivel
    const exists = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      parent: parent || null,
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Ya existe una categoría con ese nombre en este nivel",
      });
    }

    const category = await Category.create({
      name,
      slug,
      parent,
      active: true,
    });

    res.status(201).json({
      success: true,
      data: category,
    });

  } catch (error) {
    console.error("createCategory:", error);

    res.status(500).json({
      success: false,
      message: "Error al crear categoría",
    });
  }
};



// ======================
// OBTENER CATEGORÍAS (ÁRBOL)
// ======================

export const getCategories = async (req, res) => {
  try {

    const categories = await Category.find({ active: true })
      .populate("parent", "name slug")
      .lean();

    // contar productos de una sola vez
    const productCounts = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);

    const productMap = {};
    productCounts.forEach((p) => {
      productMap[p._id.toString()] = p.count;
    });

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

      if (cat.parent) {
        const parentId = cat.parent._id
          ? cat.parent._id.toString()
          : cat.parent.toString();

        const parent = map.get(parentId);

        if (parent) {
          parent.children.push(item);
        } else {
          tree.push(item);
        }

      } else {
        tree.push(item);
      }

    });

    res.json({
      success: true,
      data: tree,
    });

  } catch (error) {
    console.error("getCategories:", error);

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
    let { name, active, parent } = req.body;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Categoría no encontrada",
      });
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

      parent = parent && parent !== "null" ? parent : null;

      if (parent) {

        if (parent.toString() === id.toString()) {
          return res.status(400).json({
            success: false,
            message: "Una categoría no puede ser su propio padre",
          });
        }

        const parentExists = await Category.findById(parent);

        if (!parentExists) {
          return res.status(400).json({
            success: false,
            message: "Categoría padre no existe",
          });
        }

      }

      category.parent = parent;
    }

    await category.save();

    res.json({
      success: true,
      data: category,
    });

  } catch (error) {
    console.error("updateCategory:", error);

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

    // verificar subcategorías
    const children = await Category.countDocuments({ parent: id });

    if (children > 0) {
      return res.status(400).json({
        success: false,
        message: "No se puede eliminar una categoría con subcategorías",
      });
    }

    const category = await Category.findOneAndDelete({ _id: id });

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
    console.error("deleteCategory:", error);

    res.status(500).json({
      success: false,
      message: "Error al eliminar categoría",
    });
  }
};