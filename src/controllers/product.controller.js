// controllers/productController.js
import mongoose from "mongoose";
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
        else resolve({
          url: result.secure_url,
          public_id: result.public_id,
        });
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

    // Validaciones básicas
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Nombre obligatorio" });
    }

    if (price == null || isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ success: false, message: "Precio inválido" });
    }

    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ success: false, message: "Categoría inválida" });
    }

    // Procesar imágenes solo por URL (como pediste)
    let imagesData = [];
    if (Array.isArray(images)) {
      imagesData = images
        .filter((url) => typeof url === "string" && url.startsWith("https://"))
        .map((url) => ({
          url,
          public_id: extractPublicIdFromUrl(url) || null,
        }));
    }

    const product = await Product.create({
      name: name.trim(),
      description: description?.trim() || "",
      price: Number(price),
      stock: Number(stock) || 0,
      category,
      images: imagesData,
      active: true,
    });

    return res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Error al crear producto",
      error: error.message,
    });
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

    // Imágenes desde URLs (JSON)
    if (Array.isArray(req.body.images)) {
      updateData.images = req.body.images
        .filter((url) => typeof url === "string" && url.startsWith("https://"))
        .map((url) => ({
          url,
          public_id: extractPublicIdFromUrl(url) || null,
        }))
        .filter(Boolean);
    }

    // Imágenes desde archivos (multipart)
    if (req.files?.length > 0) {
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
    res.status(500).json({ success: false, message: error.message });
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
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "ID inválido" });
    }

    const product = await Product.findOne({ _id: id, active: true })
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

    // Borrar imágenes de Cloudinary
    if (product.images?.length) {
      await Promise.allSettled(
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
   LINK WHATSAPP - CONSULTA SIMPLE
====================================================== */

export const getWhatsappConsultLink = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID de producto inválido",
      });
    }

    // Buscar producto activo
    const product = await Product.findOne({ _id: id, active: true }).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado o no disponible",
      });
    }

    // Número de WhatsApp desde .env
    const whatsappNumber = process.env.WHATSAPP_NUMBER?.trim();

    if (!whatsappNumber) {
      console.error("WHATSAPP_NUMBER no está configurado en .env");
      return res.status(500).json({
        success: false,
        message: "Servicio de WhatsApp no configurado en el servidor",
      });
    }

    // Mensaje prearmado (simple y natural)
    const message = `¡Hola! Estoy interesado en este producto:\n\n` +
                    `Producto: ${product.name}\n` +
                    `Precio: $${product.price.toLocaleString("es-AR")}\n` +
                    `ID: ${product._id}\n\n` +
                    `¿Tenés stock disponible?\n` +
                    `¿En qué colores/talles lo tenés?\n` +
                    `Gracias de antemano! `;

    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    return res.status(200).json({
      success: true,
      whatsappUrl,
      productName: product.name,
      productPrice: product.price,
    });
  } catch (error) {
    console.error("Error generando link de WhatsApp:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};