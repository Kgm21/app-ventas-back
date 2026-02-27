import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    productNumber: {
      type: Number,
      required: true,
      unique: true,
      index: true,  // acelera consultas por número de producto
    },

    name: {
      type: String,
      required: [true, "El nombre del producto es obligatorio"],
      trim: true,
      minlength: [3, "El nombre debe tener al menos 3 caracteres"],
      maxlength: [100, "El nombre no puede superar los 100 caracteres"],
      index: "text", // permite búsqueda por texto en name
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: [2000, "La descripción no puede superar los 2000 caracteres"], // subí un poco el límite
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
      index: true,
    },

    images: {
      type: [
        {
          url: {
            type: String,
            required: true,
            validate: {
              validator: v => v.startsWith("http"),
              message: "La URL de la imagen debe ser válida (http/https)",
            },
          },
          public_id: {
            type: String,
            required: true,  // ← muy importante para borrar de Cloudinary
          },
        },
      ],
      default: [],
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Índices compuestos y de texto
productSchema.index({ name: "text", description: "text" }); // búsqueda por texto en nombre y descripción
productSchema.index({ category: 1, active: 1, createdAt: -1 }); // consultas frecuentes
productSchema.index({ "images.public_id": 1 }); // si alguna vez querés buscar por public_id

// Virtuals útiles
productSchema.virtual("imageCount").get(function () {
  return this.images?.length || 0;
});

productSchema.virtual("firstImage").get(function () {
  return this.images?.[0]?.url || null;
});

export default mongoose.model("Product", productSchema);