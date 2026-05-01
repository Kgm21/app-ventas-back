import mongoose from "mongoose";
import order from "../models/Order.js";
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
      /* PRODUCTO CATÁLOGO */
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
        /* PRODUCTO MANUAL */
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
   EDITAR ORDEN
====================================================== */
export const updateOrder = async (req, res) => {
  try {
    const { customer, products } = req.body;

    const foundOrder = await order.findById(req.params.id);

    if (!foundOrder) {
      return res.status(404).json({
        success: false,
        message: "Orden no encontrada",
      });
    }

    /* CLIENTE */
    if (customer) {
      foundOrder.customer = {
        ...foundOrder.customer,
        ...customer,
      };
    }

    /* PRODUCTOS */
    if (products && Array.isArray(products)) {
      const cleanProducts = products.map((p) => ({
        type: "custom",
        name: p.name,
        price: Number(p.price),
        quantity: Number(p.quantity),
      }));

      foundOrder.products = cleanProducts;

      foundOrder.total = cleanProducts.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0
      );
    }

    await foundOrder.save();

    res.json({
      success: true,
      data: foundOrder,
    });

  } catch (error) {
    console.error("UPDATE ORDER ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ======================================================
   LISTAR ORDENES
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
    res.status(500).json({
      success: false,
      message: "Error al obtener órdenes",
    });
  }
};

/* ======================================================
   OBTENER ORDEN
====================================================== */
export const getOrderById = async (req, res) => {
  try {
    const foundOrder = await order.findById(req.params.id)
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

    const foundOrder = await order.findById(req.params.id);

    if (!foundOrder) {
      return res.status(404).json({
        success: false,
        message: "Orden no encontrada",
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
  try {
    const foundOrder = await order.findById(req.params.id);

    if (!foundOrder) {
      return res.status(404).json({
        success: false,
        message: "Orden no encontrada",
      });
    }

    foundOrder.status = "cancelled";
    await foundOrder.save();

    res.json({
      success: true,
      message: "Orden cancelada",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al cancelar orden",
    });
  }
};