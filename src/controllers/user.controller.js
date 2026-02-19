// controllers/user.controller.js (o donde lo tengas)
import User from "../models/User.js";
import bcrypt from "bcryptjs";

export const changePassword = async (req, res) => {
  try {
    console.log("→ changePassword llamado");
    console.log("req.user:", req.user);
    console.log("req.body:", req.body);

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        message: "No se encontró ID de usuario autenticado",
      });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Faltan contraseña actual y/o nueva",
      });
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    // Verificar contraseña actual
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "La contraseña actual es incorrecta",
      });
    }

    // Hashear nueva contraseña
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    return res.json({
      message: "Contraseña actualizada correctamente",
    });
  } catch (error) {
    console.error("ERROR COMPLETO en changePassword:", error);
    return res.status(500).json({
      message: "Error al cambiar la contraseña",
    });
  }
};
