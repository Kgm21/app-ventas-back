
import Category from "../models/Category.js";
import Product from "../models/Product.js";


// ======================
// GENERAR SLUG (SEO)
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

    if (parent) {
      const parentExists = await Category.findById(parent);

      if (!parentExists) {
        return res.status(400).json({
          success: false,
          message: "Categoría padre no existe",
        });
      }
    }

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
// BREADCRUMB DE CATEGORÍA
// ======================

export const getCategoryBreadcrumb = async (req, res) => {

  try {

    const { id } = req.params;

    let category = await Category.findById(id).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Categoría no encontrada",
      });
    }

    const breadcrumb = [];

    while (category) {

      breadcrumb.unshift({
        _id: category._id,
        name: category.name,
        slug: category.slug
      });

      if (!category.parent) break;

      category = await Category.findById(category.parent).lean();

    }

    res.json({
      success: true,
      data: breadcrumb,
    });

  } catch (error) {

    console.error("getCategoryBreadcrumb:", error);

    res.status(500).json({
      success: false,
      message: "Error al obtener breadcrumb",
    });

  }

};



// ======================
// OBTENER CATEGORÍAS
// TREE + FLAT
// ======================

export const getCategories = async (req, res) => {

  try {

    const categories = await Category.find({ active: true }).lean();

    // contar productos
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

        const parent = map.get(cat.parent.toString());

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
      data: {
        tree,
        flat: categories
      }
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
// OBTENER CATEGORÍAS (PLANO)
// ======================

export const getCategoriesFlat = async (req, res) => {

  try {

    const categories = await Category.find()
      .select("_id name slug parent active")
      .sort({ parent: 1, name: 1 })
      .lean();

    res.json({
      success: true,
      data: categories,
    });

  } catch (error) {

    console.error("getCategoriesFlat:", error);

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

    const products = await Product.countDocuments({ category: id });

    if (products > 0) {
      return res.status(400).json({
        success: false,
        message: "No se puede eliminar una categoría con productos",
      });
    }

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

