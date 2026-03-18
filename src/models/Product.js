import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    // Número interno único (ej: 0001, 0002...) - útil para facturación y etiquetas
    productNumber: {
      type: Number,
      unique: true,
      index: true,
      min: [1, "El número de producto debe ser mayor o igual a 1"],
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
      minlength: [20, "La descripción debe tener al menos 20 caracteres"],
      maxlength: [3000, "La descripción no puede superar los 3000 caracteres"],
    },

    price: {
      type: Number,
      required: [true, "El precio es obligatorio"],
      min: [0, "El precio no puede ser negativo"],
      set: (v) => Math.round(v * 100) / 100,
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
            required: [true, "La URL de la imagen es obligatoria"],
            validate: {
              validator: (v) => /^https?:\/\//.test(v),
              message: "La URL de la imagen debe comenzar con http:// o https://",
            },
          },
          public_id: {
            type: String,
            required: [true, "El public_id de Cloudinary es obligatorio"],
          },
        },
      ],
      default: [],
      validate: {
        validator: function (v) {
          return v.length <= 10;
        },
        message: "Un producto no puede tener más de 10 imágenes",
      },
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

// Índices compuestos
productSchema.index({ name: "text", description: "text" });
productSchema.index({ category: 1, active: 1, createdAt: -1 });
productSchema.index({ "images.public_id": 1 });

// Virtuals
productSchema.virtual("imageCount").get(function () {
  return this.images.length;
});
productSchema.virtual("firstImage").get(function () {
  return this.images.length > 0 ? this.images[0].url : null;
});
productSchema.virtual("hasImages").get(function () {
  return this.images.length > 0;
});

// Pre-save hook: auto-increment productNumber
productSchema.pre("save", async function (next) {
  if (!this.isNew || this.productNumber) return next();

  try {
    const lastProduct = await mongoose.model("Product")
      .findOne()
      .sort({ productNumber: -1 })
      .select("productNumber");

    this.productNumber = lastProduct ? lastProduct.productNumber + 1 : 1;
    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model("Product", productSchema);