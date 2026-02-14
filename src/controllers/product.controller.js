import mongoose from "mongoose";
import Counter from "../models/Counter.js";
import Product from "../models/Product.js";

/* =========================
   CREAR PRODUCTO
========================= */
export const createProduct = async (req, res) => {
  try {

    const { name, price, category, description, stock } = req.body;

    if (!name || price === undefined || !category) {
      return res.status(400).json({
        success: false,
        message: "Faltan campos requeridos: name, price, category",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({
        success: false,
        message: "ID de categoría inválido",
      });
    }

    // generar número secuencial
    const counter = await Counter.findOneAndUpdate(
      { name: "product" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const productNumber = counter.seq;

    // 🔥 guardar url y public_id
    const images = req.files?.length
      ? req.files.map(file => ({
          url: file.path,
          public_id: file.filename
        }))
      : [];

    const productData = {

      productNumber,
      name: name.trim(),
      price: Number(price),
      category,
      description: description?.trim() || "",
      stock: stock !== undefined ? Number(stock) : 0,
      images,
      active: true,

    };

    const product = await Product.create(productData);

    const populatedProduct = await Product.findById(product._id)
      .populate("category", "name");

    res.status(201).json({
      success: true,
      data: populatedProduct,
    });

  }
  catch (error) {

    console.error("Error al crear producto:", error);

    res.status(500).json({
      success: false,
      message: "Error al crear el producto",
    });

  }
};


/* =========================
   OBTENER TODOS LOS PRODUCTOS
========================= */
export const getProducts = async (req, res) => {

  try {

    const products = await Product.find({ active: true })
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: products,
    });

  }
  catch (error) {

    console.error("Error al obtener productos:", error);

    res.status(500).json({
      success: false,
      message: "Error al obtener productos",
    });

  }

};


/* =========================
   OBTENER PRODUCTO POR ID
========================= */
export const getProductById = async (req, res) => {

  try {

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {

      return res.status(400).json({
        success: false,
        message: "ID de producto inválido",
      });

    }

    const product = await Product.findOne({
      _id: id,
      active: true
    })
    .populate("category", "name")
    .lean();

    if (!product) {

      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });

    }

    res.json({
      success: true,
      data: product,
    });

  }
  catch (error) {

    console.error("Error al obtener producto:", error);

    res.status(500).json({
      success: false,
      message: "Error al obtener producto",
    });

  }

};


/* =========================
   ACTUALIZAR PRODUCTO
========================= */
export const updateProduct = async (req, res) => {

  try {

    const updateData = {};

    if (req.body.name !== undefined)
      updateData.name = req.body.name.trim();

    if (req.body.price !== undefined)
      updateData.price = Number(req.body.price);

    if (req.body.category !== undefined) {

      if (!mongoose.Types.ObjectId.isValid(req.body.category)) {

        return res.status(400).json({
          success: false,
          message: "ID de categoría inválido",
        });

      }

      updateData.category = req.body.category;

    }

    if (req.body.description !== undefined)
      updateData.description = req.body.description.trim() || "";

    if (req.body.stock !== undefined)
      updateData.stock = Number(req.body.stock);

    // 🔥 guardar nuevas imágenes correctamente
    if (req.files?.length) {

      updateData.images = req.files.map(file => ({
        url: file.path,
        public_id: file.filename
      }));

    }

    if (!Object.keys(updateData).length) {

      return res.status(400).json({
        success: false,
        message: "No se enviaron campos para actualizar",
      });

    }

    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        active: true
      },
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate("category", "name");

    if (!product) {

      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });

    }

    res.json({
      success: true,
      data: product,
    });

  }
  catch (error) {

    console.error("Error al actualizar producto:", error);

    res.status(500).json({
      success: false,
      message: "Error al actualizar producto",
    });

  }

};


/* =========================
   ELIMINAR PRODUCTO (BORRADO LÓGICO)
========================= */
export const deleteProduct = async (req, res) => {

  try {

    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        active: true
      },
      {
        active: false
      },
      {
        new: true
      }
    );

    if (!product) {

      return res.status(404).json({
        success: false,
        message: "Producto no encontrado o ya eliminado",
      });

    }

    res.json({
      success: true,
      message: "Producto eliminado correctamente",
    });

  }
  catch (error) {

    console.error("Error al eliminar producto:", error);

    res.status(500).json({
      success: false,
      message: "Error al eliminar producto",
    });

  }

};


/* =========================
   LINK DE CONSULTA WHATSAPP
========================= */
export const getWhatsappConsultLink = async (req, res) => {

  try {

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {

      return res.status(400).json({
        success: false,
        message: "ID de producto inválido",
      });

    }

    const product = await Product.findOne({
      _id: id,
      active: true,
    }).lean();

    if (!product) {

      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });

    }

    const number = process.env.WHATSAPP_NUMBER;

    if (!number) {

      return res.status(500).json({
        success: false,
        message: "Número de WhatsApp no configurado",
      });

    }

    const message = `Hola.
Quiero consultar por este producto:

ID Producto: ${product.productNumber}
Producto: ${product.name}
Precio: $${Number(product.price).toLocaleString("es-AR")}

¿Hay stock disponible?`;

    const url =
      `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

    res.json({
      success: true,
      whatsappUrl: url,
    });

  }
  catch (error) {

    console.error("Error WhatsApp:", error);

    res.status(500).json({
      success: false,
      message: "Error al generar link de WhatsApp",
    });

  }

};
