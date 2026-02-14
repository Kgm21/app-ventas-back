import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  public_id: {
    type: String,
    required: true
  }
}, { _id: false });

const productSchema = new mongoose.Schema(
{
  productNumber: {
    type: Number,
    unique: true
  },

  name: {
    type: String,
    required: true,
    trim: true
  },

  price: {
    type: Number,
    required: true
  },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },

  description: {
    type: String,
    default: ""
  },

  stock: {
    type: Number,
    default: 0
  },

  images: {
    type: [imageSchema],
    default: []
  },

  active: {
    type: Boolean,
    default: true
  }

},
{ timestamps: true }
);

export default mongoose.model("Product", productSchema);
