import multer from "multer";
import { storage } from "./cloudinary.js";

export const upload = multer({ storage });
