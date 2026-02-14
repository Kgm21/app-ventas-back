import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authAdmin = async (req, res, next) => {

  try {

    const authHeader = req.headers.authorization;

    if (!authHeader)
      return res.status(401).json({
        message: "Token requerido",
      });

    const token = authHeader.split(" ")[1];

    if (!token)
      return res.status(401).json({
        message: "Token inválido",
      });

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.id);

    if (!user)
      return res.status(401).json({
        message: "Usuario no existe",
      });

    if (user.role !== "admin")
      return res.status(403).json({
        message: "Acceso denegado",
      });

    req.user = user;

    next();

  } catch (error) {

    return res.status(401).json({
      message: "Token inválido o expirado",
    });

  }

};
