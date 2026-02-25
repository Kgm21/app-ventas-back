import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    productNumber: {
      type: Number,
      required: true,
      unique: true,          // evita duplicados de número de producto
    },

    name: {
      type: String,
      required: [true, "El nombre del producto es obligatorio"],
      trim: true,
      minlength: [3, "El nombre debe tener al menos 3 caracteres"],
      maxlength: [100, "El nombre no puede superar los 100 caracteres"],
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: [1000, "La descripción no puede superar los 1000 caracteres"],
    },

    price: {
      type: Number,
      required: [true, "El precio es obligatorio"],
      min: [0, "El precio no puede ser negativo"],
    },

    stock: {
      type: Number,
      default: 0,
      min: [0, "El stock no puede ser negativo"],
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "La categoría es obligatoria"],
      index: true,  // mejora rendimiento en consultas por categoría
    },

    images: {
      type: [String],  // array de URLs (strings)
      default: [],     // siempre inicia vacío
      validate: {
        validator: function (arr) {
          return arr.every(url => typeof url === "string" && url.trim().startsWith("http"));
        },
        message: "Todas las imágenes deben ser URLs válidas (http/https)",
      },
    },

    active: {
      type: Boolean,
      default: true,
      index: true,  // útil para consultas rápidas de productos activos
    },
  },
  {
    timestamps: true,  // createdAt y updatedAt automáticos
    toJSON: { virtuals: true },   // incluye virtuals si los agregás después
    toObject: { virtuals: true },
  }
);

// Índices adicionales para rendimiento
productSchema.index({ name: "text" });               // búsqueda por nombre
productSchema.index({ category: 1, active: 1 });    // consultas por categoría activa
productSchema.index({ createdAt: -1 });             // orden por más recientes

// Virtual para contar imágenes (opcional, pero útil)
productSchema.virtual("imageCount").get(function () {
  return this.images?.length || 0;
});

export default mongoose.model("Product", productSchema);