import mongoose from "mongoose";
import order from "../models/order.js"; // 🔥 lo dejamos así como querés
import Product from "../models/Product.js";

/* ======================================================
   CREAR ORDEN
====================================================== */
export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, customer, paymentMethod, initialPayment } = req.body;

    if (!items || !items.length) {
      throw new Error("La orden debe tener productos");
    }

    if (!customer?.name || !customer?.phone || !customer?.city) {
      throw new Error("Datos de cliente incompletos");
    }

    let total = 0;
    const products = [];

    for (const item of items) {

      // 🔵 PRODUCTO DEL CATÁLOGO
      if (item.product) {

        if (!mongoose.Types.ObjectId.isValid(item.product)) {
          throw new Error("ID de producto inválido");
        }

        const product = await Product.findById(item.product).session(session);

        if (!product || !product.active) {
          throw new Error("Producto inválido");
        }

        if (product.stock < item.quantity) {
          throw new Error(`Stock insuficiente para ${product.name}`);
        }

        // descontar stock
        product.stock -= item.quantity;
        await product.save({ session });

        const subtotal = product.price * item.quantity;
        total += subtotal;

        products.push({
          product: product._id,
          type: "catalog",
          name: product.name,
          price: product.price,
          quantity: item.quantity,
        });

      } else {
        // 🟣 PRODUCTO MANUAL (IMPRENTA)

        if (!item.name || !item.price || !item.quantity) {
          throw new Error("Producto manual incompleto");
        }

        const subtotal = item.price * item.quantity;
        total += subtotal;

        products.push({
          type: "custom",
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        });
      }
    }

    /* ================= PAGOS ================= */

    const payments = [];

    if (initialPayment && initialPayment > 0) {
      if (initialPayment > total) {
        throw new Error("El pago inicial no puede superar el total");
      }

      payments.push({
        amount: initialPayment,
        method: paymentMethod,
        note: "Seña inicial",
      });
    }

    const newOrder = new order({
      products,
      total,
      customer,
      paymentMethod,
      payments,
      status: "pending",
    });

    await newOrder.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      data: newOrder,
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("CREATE ORDER ERROR:", error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* ======================================================
   LISTAR ÓRDENES
====================================================== */
export const getOrders = async (req, res) => {
  try {
    const orders = await order.find()
      .sort({ createdAt: -1 })
      .populate("products.product", "name price")
      .lean();

    res.json({
      success: true,
      data: orders,
    });

  } catch (error) {
    console.error("GET ORDERS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener órdenes",
    });
  }
};

/* ======================================================
   OBTENER ORDEN POR ID
====================================================== */
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID inválido",
      });
    }

    const foundOrder = await order.findById(id)
      .populate("products.product", "name price")
      .lean();

    if (!foundOrder) {
      return res.status(404).json({
        success: false,
        message: "Orden no encontrada",
      });
    }

    res.json({
      success: true,
      data: foundOrder,
    });

  } catch (error) {
    console.error("GET ORDER ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Error interno",
    });
  }
};

/* ======================================================
   ACTUALIZAR ESTADO
====================================================== */
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Estado inválido",
      });
    }

    const foundOrder = await order.findById(req.params.id);

    if (!foundOrder) {
      return res.status(404).json({
        success: false,
        message: "Orden no encontrada",
      });
    }

    foundOrder.status = status;
    await foundOrder.save();

    res.json({
      success: true,
      data: foundOrder,
    });

  } catch (error) {
    console.error("UPDATE ORDER STATUS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar estado",
    });
  }
};

/* ======================================================
   AGREGAR PAGO
====================================================== */
export const addPayment = async (req, res) => {
  try {
    const { amount, method, note } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Monto inválido",
      });
    }

    const foundOrder = await order.findById(req.params.id);

    if (!foundOrder) {
      return res.status(404).json({
        success: false,
        message: "Orden no encontrada",
      });
    }

    if (foundOrder.paidAmount + amount > foundOrder.total) {
      return res.status(400).json({
        success: false,
        message: "El pago excede el total de la orden",
      });
    }

    foundOrder.payments.push({
      amount,
      method,
      note,
    });

    await foundOrder.save();

    res.json({
      success: true,
      data: foundOrder,
    });

  } catch (error) {
    console.error("ADD PAYMENT ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Error al agregar pago",
    });
  }
};

/* ======================================================
   CANCELAR ORDEN
====================================================== */
export const cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const foundOrder = await order.findById(req.params.id).session(session);

    if (!foundOrder) throw new Error("Orden no encontrada");
    if (foundOrder.status === "cancelled") throw new Error("La orden ya está cancelada");

    for (const item of foundOrder.products) {
      if (!item.product) continue; // 🔥 evita romper con productos manuales

      const product = await Product.findById(item.product).session(session);

      if (product) {
        product.stock += item.quantity;
        await product.save({ session });
      }
    }

    foundOrder.status = "cancelled";
    await foundOrder.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: "Orden cancelada y stock restaurado",
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("CANCEL ORDER ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};