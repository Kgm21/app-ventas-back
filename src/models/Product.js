import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    productNumber: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "El nombre del producto es obligatorio"],
      trim: true,
      minlength: [3, "El nombre debe tener al menos 3 caracteres"],
      maxlength: [100, "El nombre no puede superar los 100 caracteres"],
      index: "text",
    },

  description: {
  type: String,
  required: [true, "La descripción del producto es obligatoria"],
  trim: true,
  minlength: [20, "La descripción debe tener al menos 20 caracteres para ser útil"],
  maxlength: [3000, "La descripción no puede superar los 3000 caracteres"],
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
              validator: v => /^https?:\/\//.test(v),
              message: "La URL de la imagen debe ser válida (http/https)",
            },
          },
          public_id: {
            type: String,
            required: true,
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

// 🔎 Índices
productSchema.index({ name: "text", description: "text" });
productSchema.index({ category: 1, active: 1, createdAt: -1 });
productSchema.index({ "images.public_id": 1 });

// 🔗 Virtuals
productSchema.virtual("imageCount").get(function () {
  return this.images.length;
});

productSchema.virtual("firstImage").get(function () {
  return this.images[0]?.url || null;
});

export default mongoose.model("Product", productSchema);