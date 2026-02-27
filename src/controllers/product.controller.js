import mongoose from "mongoose";
import Counter from "../models/Counter.js";
import Product from "../models/Product.js";
import cloudinary from "../config/cloudinary.js";

// Helper para subir una imagen a Cloudinary (retorna solo la URL o null)
const uploadToCloudinary = async (file) => {
  if (!file || !file.buffer) {
    console.warn(`Archivo inválido o sin buffer: ${file?.originalname || "sin nombre"}`);
    return null;
  }

  try {
    console.log(`Subiendo: ${file.originalname} (${file.size} bytes)`);

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          folder: "carteras/productos",
          // Opcional: descomenta si querés optimización automática
          // quality: "auto:good",
          // fetch_format: "auto",
          // width: 1200,
          // crop: "limit"
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        }
      ).end(file.buffer);
    });

    console.log(`Subida OK: ${result}`);
    return result;
  } catch (error) {
    console.error(`Error subiendo ${file.originalname || "archivo"}:`, error.message);
    return null;
  }
};

// CREAR PRODUCTO
export const createProduct = async (req, res) => {
  try {
    console.log("POST /api/products - Body:", req.body);
    console.log("Archivos recibidos:", req.files?.length || 0);
    console.log("Nombres:", req.files?.map(f => f.originalname) || []);

    const { name, price, category, description, stock } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Nombre obligatorio" });
    }

    if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ success: false, message: "Precio inválido" });
    }

    if (!category || !mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ success: false, message: "Categoría inválida" });
    }

    let imageUrls = [];

    // Subir archivos nuevos
    if (req.files?.length > 0) {
      console.log(`Procesando ${req.files.length} archivos...`);
      const uploaded = await Promise.allSettled(
        req.files.map(uploadToCloudinary)
      );

      imageUrls = uploaded
        .filter(r => r.status === "fulfilled")
        .map(r => r.value)
        .filter(Boolean);
    }

    // Agregar URLs directas del body (opcional)
    if (req.body.images) {
      const bodyImages = Array.isArray(req.body.images)
        ? req.body.images.filter(u => typeof u === "string" && u.trim().startsWith("http"))
        : (typeof req.body.images === "string" && req.body.images.trim().startsWith("http")
            ? [req.body.images.trim()]
            : []);
      imageUrls.push(...bodyImages);
    }

    if (imageUrls.length > 0) {
      console.log("URLs a guardar:", imageUrls);
    } else {
      console.log("No hay imágenes válidas");
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
      images: imageUrls,
      active: true,
    });

    const populated = await Product.findById(product._id)
      .populate("category", "name");

    console.log("Producto creado OK:", product._id);
    console.log("Imágenes guardadas:", product.images);

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error("Error al crear producto:", error);
    res.status(500).json({
      success: false,
      message: "Error interno al crear producto",
      error: error.message,
    });
  }
};

// ACTUALIZAR PRODUCTO
export const updateProduct = async (req, res) => {
  try {
    const updateData = {};

    if (req.body.name !== undefined) updateData.name = req.body.name.trim();
    if (req.body.price !== undefined) updateData.price = Number(req.body.price);

    if (req.body.category !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(req.body.category)) {
        return res.status(400).json({ success: false, message: "ID de categoría inválido" });
      }
      updateData.category = req.body.category;
    }

    if (req.body.description !== undefined) updateData.description = req.body.description.trim();
    if (req.body.stock !== undefined) updateData.stock = Number(req.body.stock);

    let imageUrls = [];

    if (req.files?.length > 0) {
      console.log(`Subiendo ${req.files.length} nuevos archivos...`);
      const uploaded = await Promise.allSettled(
        req.files.map(uploadToCloudinary)
      );
      imageUrls = uploaded
        .filter(r => r.status === "fulfilled")
        .map(r => r.value)
        .filter(Boolean);
    }

    if (req.body.images !== undefined) {
      const bodyImages = Array.isArray(req.body.images)
        ? req.body.images.filter(u => typeof u === "string" && u.trim().startsWith("http"))
        : (typeof req.body.images === "string" && req.body.images.trim().startsWith("http")
            ? [req.body.images.trim()]
            : []);
      imageUrls.push(...bodyImages);
    }

    if (imageUrls.length > 0) {
      updateData.images = imageUrls;
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
    console.error("Error al actualizar producto:", error);
    res.status(500).json({ success: false, message: "Error interno al actualizar" });
  }
};

// LISTAR PRODUCTOS (con paginación)
export const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
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
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        perPage: limit,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ success: false, message: "Error al obtener productos" });
  }
};

// OBTENER PRODUCTO POR ID
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
    console.error("Error al obtener producto:", error);
    res.status(500).json({ success: false, message: "Error al obtener producto" });
  }
};

/// ELIMINAR PRODUCTO (borrado lógico + borrar imágenes de Cloudinary)
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, active: true });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado o ya eliminado",
      });
    }

    // Borrar imágenes de Cloudinary si existen
    if (product.images && product.images.length > 0) {
      console.log(`Eliminando producto ${product._id} - Intentando borrar ${product.images.length} imágenes...`);

      const deletePromises = product.images.map(async (img) => {
        let publicId;

        // Caso 1: imagen es objeto { url, public_id }
        if (typeof img === "object" && img.public_id) {
          publicId = img.public_id;
        }
        // Caso 2: imagen es solo string (URL) → extraemos public_id
        else if (typeof img === "string") {
          // Ejemplo URL: https://res.cloudinary.com/dilhutst6/image/upload/v1772043532/carteras/productos/ytsaawyc9jgv1ze5kxmm.jpg
          // Extraemos: carteras/productos/ytsaawyc9jgv1ze5kxmm
          const match = img.match(/\/upload\/v\d+\/(.+?)(?:\.[a-z]+)?$/i);
          publicId = match ? match[1] : null;
        }

        if (!publicId) {
          console.warn(`No se pudo extraer public_id de: ${JSON.stringify(img)}`);
          return;
        }

        try {
          const result = await cloudinary.uploader.destroy(publicId);
          console.log(`Imagen borrada OK: ${publicId} → ${result.result}`);
        } catch (err) {
          console.error(`Error borrando ${publicId}:`, err.message);
          // Continuamos aunque falle una
        }
      });

      await Promise.all(deletePromises);
    }

    // Borrado lógico
    product.active = false;
    await product.save();

    // Limpieza opcional: vaciar el array en la DB
    product.images = [];
    await product.save();

    res.json({
      success: true,
      message: "Producto eliminado correctamente (imágenes borradas de Cloudinary donde fue posible)",
    });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    res.status(500).json({
      success: false,
      message: "Error interno al eliminar el producto",
      error: error.message,
    });
  }
};

// LINK DE CONSULTA WHATSAPP
export const getWhatsappConsultLink = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "ID inválido" });
    }

    const product = await Product.findOne({ _id: id, active: true }).lean();

    if (!product) {
      return res.status(404).json({ success: false, message: "Producto no encontrado" });
    }

    const number = process.env.WHATSAPP_NUMBER;

    if (!number) {
      return res.status(500).json({ success: false, message: "Número de WhatsApp no configurado" });
    }

    const message = `Hola.\nQuiero consultar por este producto:\n\nID Producto: ${product.productNumber}\nProducto: ${product.name}\nPrecio: $${Number(product.price).toLocaleString("es-AR")}\n\n¿Hay stock disponible?`;

    const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

    res.json({ success: true, whatsappUrl: url });
  } catch (error) {
    console.error("Error WhatsApp:", error);
    res.status(500).json({ success: false, message: "Error al generar link" });
  }
};