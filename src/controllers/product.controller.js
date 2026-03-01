import mongoose from "mongoose";
import Counter from "../models/Counter.js";
import Product from "../models/Product.js";
import cloudinary from "../config/cloudinary.js";

/* ======================================================
   HELPERS
====================================================== */

// Extraer public_id desde URL de Cloudinary
const extractPublicIdFromUrl = (url) => {
  if (typeof url !== "string" || !url.includes("cloudinary.com")) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z]+)?$/i);
  return match ? match[1] : null;
};

// Subir archivo (buffer) a Cloudinary
const uploadToCloudinary = async (file) => {
  if (!file?.buffer) return null;

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: "carteras/productos", resource_type: "image" },
      (error, result) => {
        if (error) reject(error);
        else {
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
          });
        }
      }
    ).end(file.buffer);
  });
};

/* ======================================================
   CREAR PRODUCTO
====================================================== */

export const createProduct = async (req, res) => {
  try {
    const { name, price, category, description, stock, images } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Nombre obligatorio" });
    }

    if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ success: false, message: "Precio inválido" });
    }

    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ success: false, message: "Categoría inválida" });
    }

    let imagesData = [];

    // 🔥 PRIORIDAD: archivos
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const img = await uploadToCloudinary(file);
        if (img) imagesData.push(img);
      }
    }
    // 🔁 Fallback: URLs
    else if (images) {
      const urls = Array.isArray(images) ? images : [images];
      imagesData = urls
        .map((url) => {
          const public_id = extractPublicIdFromUrl(url);
          return public_id ? { url, public_id } : null;
        })
        .filter(Boolean);
    }

    const counter = await Counter.findOneAndUpdate(
      { name: "product" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const product = await Product.create({
      productNumber: counter.seq,
      name: name.trim(),
      price: Number(price),
      category,
      description: description?.trim() || "",
      stock: Number(stock) || 0,
      images: imagesData,
      active: true,
    });

    const populated = await Product.findById(product._id).populate("category", "name");

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error);
    res.status(500).json({ success: false, message: "Error interno", error: error.message });
  }
};

/* ======================================================
   ACTUALIZAR PRODUCTO
====================================================== */

export const updateProduct = async (req, res) => {
  try {
    const updateData = {};

    if (req.body.name !== undefined) updateData.name = req.body.name.trim();
    if (req.body.price !== undefined) updateData.price = Number(req.body.price);
    if (req.body.description !== undefined) updateData.description = req.body.description.trim();
    if (req.body.stock !== undefined) updateData.stock = Number(req.body.stock);

    if (req.body.category !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(req.body.category)) {
        return res.status(400).json({ success: false, message: "Categoría inválida" });
      }
      updateData.category = req.body.category;
    }

    // 🔥 Reemplazar imágenes si vienen nuevas
    if (req.files && req.files.length > 0) {
      const imagesData = [];
      for (const file of req.files) {
        const img = await uploadToCloudinary(file);
        if (img) imagesData.push(img);
      }
      updateData.images = imagesData;
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, active: true },
      updateData,
      { new: true, runValidators: true }
    ).populate("category", "name");

    if (!product) {
      return res.status(404).json({ success: false, message: "Producto no encontrado" });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error("UPDATE PRODUCT ERROR:", error);
    res.status(500).json({ success: false, message: "Error interno", error: error.message });
  }
};

/* ======================================================
   LISTAR PRODUCTOS
====================================================== */

export const getProducts = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { active: true };
    if (req.query.category) query.category = req.query.category;

    const products = await Product.find(query)
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
      pagination: {
        page,
        totalPages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("GET PRODUCTS ERROR:", error);
    res.status(500).json({ success: false, message: "Error al obtener productos" });
  }
};

/* ======================================================
   OBTENER PRODUCTO POR ID
====================================================== */

export const getProductById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "ID inválido" });
    }

    const product = await Product.findOne({ _id: req.params.id, active: true })
      .populate("category", "name")
      .lean();

    if (!product) {
      return res.status(404).json({ success: false, message: "Producto no encontrado" });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error("GET PRODUCT ERROR:", error);
    res.status(500).json({ success: false, message: "Error interno" });
  }
};

/* ======================================================
   ELIMINAR PRODUCTO (soft delete + Cloudinary)
====================================================== */

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, active: true });

    if (!product) {
      return res.status(404).json({ success: false, message: "Producto no encontrado" });
    }

    // Borrar imágenes en Cloudinary
    if (product.images?.length) {
      await Promise.all(
        product.images.map((img) =>
          cloudinary.uploader.destroy(img.public_id).catch(() => null)
        )
      );
    }

    product.active = false;
    product.images = [];
    await product.save();

    res.json({ success: true, message: "Producto eliminado correctamente" });
  } catch (error) {
    console.error("DELETE PRODUCT ERROR:", error);
    res.status(500).json({ success: false, message: "Error interno", error: error.message });
  }
};

/* ======================================================
   LINK WHATSAPP
====================================================== */

export const getWhatsappConsultLink = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "ID inválido" });
    }

    const product = await Product.findOne({ _id: req.params.id, active: true }).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: "Producto no encontrado" });
    }

    const number = process.env.WHATSAPP_NUMBER;
    if (!number) {
      return res.status(500).json({ success: false, message: "WhatsApp no configurado" });
    }

    const message = `Hola, quiero consultar por este producto:
Producto: ${product.name}
Precio: $${product.price.toLocaleString("es-AR")}
¿Hay stock disponible?`;

    const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

    res.json({ success: true, whatsappUrl: url });
  } catch (error) {
    console.error("WHATSAPP ERROR:", error);
    res.status(500).json({ success: false, message: "Error interno" });
  }
};