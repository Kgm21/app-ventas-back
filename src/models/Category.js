import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre de la categoría es obligatorio"],
      trim: true,
      minlength: [2, "El nombre debe tener al menos 2 caracteres"],
      maxlength: [100, "El nombre no puede exceder los 100 caracteres"],
    },

    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido"],
    },

    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    level: {
      type: Number,
      default: 0,
      min: 0,
    },

    productCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);


// ===============================
// ÍNDICES
// ===============================

// nombre único dentro del mismo padre
categorySchema.index(
  { parent: 1, name: 1 },
  { unique: true }
);

// slug único global
categorySchema.index(
  { slug: 1 },
  { unique: true }
);

// consultas rápidas
categorySchema.index({ active: 1, parent: 1 });


// ===============================
// VIRTUAL: SUBCATEGORÍAS
// ===============================

categorySchema.virtual("children", {
  ref: "Category",
  localField: "_id",
  foreignField: "parent",
});


// ===============================
// PRE SAVE
// ===============================

categorySchema.pre("save", async function (next) {

  if (!this.isModified("parent") && !this.isNew) {
    return next();
  }

  // evitar auto referencia
  if (this.parent && this.parent.toString() === this._id?.toString()) {
    return next(new Error("Una categoría no puede ser su propio padre"));
  }

  if (this.parent) {

    const parentDoc = await mongoose
      .model("Category")
      .findById(this.parent)
      .select("level");

    if (!parentDoc) {
      return next(new Error("Categoría padre no encontrada"));
    }

    this.level = parentDoc.level + 1;

    if (this.level > 5) {
      return next(new Error("Máximo 5 niveles de categorías"));
    }

  } else {
    this.level = 0;
  }

  next();
});


// ===============================
// PROTEGER ELIMINACIÓN
// ===============================

categorySchema.pre("findOneAndDelete", async function (next) {

  const doc = await this.model.findOne(this.getFilter());

  if (!doc) return next();

  const children = await mongoose
    .model("Category")
    .countDocuments({ parent: doc._id });

  if (children > 0) {
    return next(new Error("No se puede eliminar una categoría con subcategorías"));
  }

  const products = await mongoose
    .model("Product")
    .countDocuments({ category: doc._id });

  if (products > 0) {
    return next(new Error("No se puede eliminar una categoría con productos"));
  }

  next();
});

export default mongoose.model("Category", categorySchema);