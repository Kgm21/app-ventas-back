import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Validar campos
    if (!email || !password) {
      return res.status(400).json({
        message: "Email y password requeridos",
      });
    }

    const emailNormalized = email.toLowerCase().trim();

    // 2️⃣ Buscar usuario (traer password)
    const user = await User.findOne({ email: emailNormalized }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Credenciales inválidas",
      });
    }

    // 3️⃣ Verificar password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({
        message: "Credenciales inválidas",
      });
    }

    // 4️⃣ Verificar JWT_SECRET
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET no definido");
    }

    // 5️⃣ Generar token
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // 6️⃣ Respuesta
    res.json({
      success: true,
      token,
      role: user.role,
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};
