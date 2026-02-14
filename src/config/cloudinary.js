import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// 🔐 Configuración Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ⚠️ opcional: solo para debug, luego BORRAR
// console.log("Cloudinary:", cloudinary.config().cloud_name);

// 📦 Storage Multer + Cloudinary
export const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "carteras_web",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],

    // 🔑 CLAVE: generar public_id controlado
    public_id: (req, file) => {
      const timestamp = Date.now();
      const originalName = file.originalname
        .split(".")[0]
        .replace(/\s+/g, "-")
        .toLowerCase();

      return `${timestamp}-${originalName}`;
    },

    transformation: [
      { width: 800, crop: "limit" },
      { quality: "auto" },
      { fetch_format: "auto" },
    ],
  },
});

export default cloudinary;
