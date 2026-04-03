import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    /* ================= PRODUCTOS ================= */

    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: false, // 🔥 permite productos manuales
        },

        type: {
          type: String,
          enum: ["catalog", "custom"],
          default: "catalog",
        },

        name: {
          type: String,
          required: true,
          trim: true,
        },

        price: {
          type: Number,
          required: true,
          min: 0,
        },

        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    /* ================= PAGOS ================= */

    payments: [
      {
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        method: String,
        note: String,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid"],
      default: "pending",
    },

    /* ================= ESTADO PEDIDO ================= */

    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },

    paymentMethod: String,

    /* ================= CLIENTE ================= */

    customer: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
      },
      address: String,
      city: {
        type: String,
        required: true,
        trim: true,
      },
      province: String,
      notes: String,
    },
  },
  {
    timestamps: true,

    // 🔥 importante para ver virtuals en responses
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ======================================================
   🔥 CALCULAR PAGOS AUTOMÁTICO + AUTO-CONFIRMAR
====================================================== */

orderSchema.pre("save", function (next) {
  const payments = this.payments || [];

  this.paidAmount = payments.reduce(
    (acc, p) => acc + (Number(p.amount) || 0),
    0
  );

  if (this.paidAmount <= 0) {
    this.paymentStatus = "pending";
  } else if (this.paidAmount < this.total) {
    this.paymentStatus = "partial";
  } else {
    this.paymentStatus = "paid";

    // 🔥 AUTO CONFIRMAR SI YA PAGÓ TODO
    if (this.status === "pending") {
      this.status = "confirmed";
    }
  }

  next();
});

/* ======================================================
   🔥 VIRTUAL (LO QUE FALTA PAGAR)
====================================================== */

orderSchema.virtual("remainingAmount").get(function () {
  return Math.max((this.total || 0) - (this.paidAmount || 0), 0);
});

export default mongoose.model("Order", orderSchema);