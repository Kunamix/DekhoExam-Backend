import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { myEnvironment } from "./env.config";

// Configure Cloudinary
cloudinary.config({
  cloud_name: myEnvironment.CLOUDINARY_CLOUD_NAME,
  api_key: myEnvironment.CLOUDINARY_API_KEY,
  api_secret: myEnvironment.CLOUDINARY_API_SECRET,
});

/**
 * Upload an image from the public/image folder to Cloudinary
 * @param imagePath - Relative path from public/image folder (e.g., 'avatar.jpg' or 'products/product1.png')
 * @param folder - Optional folder name in Cloudinary to organize uploads
 * @returns Promise with upload result containing URL and public_id
 */
export const uploadImage = async (
  imagePath: string,
  folder?: string,
): Promise<{
  url: string;
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
}> => {
  try {
    // Construct full path to image in public/image folder
    const fullPath = path.join(process.cwd(), "public", "image", imagePath);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Image not found at path: ${fullPath}`);
    }

    // Upload options
    const uploadOptions: any = {
      resource_type: "image",
      folder: folder || "uploads", // Default folder if not specified
    };

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(fullPath, uploadOptions);

    return {
      url: result.url,
      secure_url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    throw error;
  }
};

/**
 * Upload an image from full file path to Cloudinary and delete local file
 * @param fullPath - Absolute path to the image file
 * @param folder - Optional folder name in Cloudinary to organize uploads
 * @returns Promise with upload result containing URL and public_id
 */
export const uploadImageFromPath = async (
  fullPath: string,
  folder?: string,
): Promise<{
  url: string;
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
}> => {
  try {
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Image not found at path: ${fullPath}`);
    }

    // Upload options
    const uploadOptions: any = {
      resource_type: "image",
      folder: folder || "uploads", // Default folder if not specified
    };

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(fullPath, uploadOptions);

    // Delete local file after successful upload
    try {
      fs.unlinkSync(fullPath);
    } catch (unlinkError) {
      console.warn("Failed to delete local file after upload:", unlinkError);
    }

    return {
      url: result.url,
      secure_url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    // Delete local file even if upload fails
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (unlinkError) {
      console.warn("Failed to delete local file after error:", unlinkError);
    }

    console.error("Error uploading image to Cloudinary:", error);
    throw error;
  }
};

/**
 * Extract public_id from Cloudinary URL
 * @param url - Cloudinary URL (e.g., 'https://res.cloudinary.com/demo/image/upload/v1234567890/uploads/sample.jpg')
 * @returns public_id (e.g., 'uploads/sample')
 */
export const extractPublicIdFromUrl = (url: string): string | null => {
  try {
    if (!url) return null;

    // Match pattern: /upload/[version]/[public_id].[extension]
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);

    if (match && match[1]) {
      return match[1];
    }

    return null;
  } catch (error) {
    console.error("Error extracting public_id from URL:", error);
    return null;
  }
};

/**
 * Delete local file safely
 * @param filePath - Path to the file to delete
 */
export const deleteLocalFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.warn("Failed to delete local file:", error);
  }
};

/**
 * Delete an image from Cloudinary using its public_id
 * @param publicId - The public_id of the image to delete
 * @returns Promise with deletion result
 */
export const deleteImage = async (
  publicId: string,
): Promise<{ result: string }> => {
  try {
    if (!publicId) {
      throw new Error("Public ID is required for deletion");
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== "ok") {
      throw new Error(`Failed to delete image: ${result.result}`);
    }

    return {
      result: result.result,
    };
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    throw error;
  }
};

/**
 * Upload multiple images at once
 * @param imagePaths - Array of relative paths from public/image folder
 * @param folder - Optional folder name in Cloudinary
 * @returns Promise with array of upload results
 */
export const uploadMultipleImages = async (
  imagePaths: string[],
  folder?: string,
): Promise<
  Array<{
    url: string;
    secure_url: string;
    public_id: string;
    width: number;
    height: number;
  }>
> => {
  try {
    const uploadPromises = imagePaths.map((imagePath) =>
      uploadImage(imagePath, folder),
    );
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error("Error uploading multiple images:", error);
    throw error;
  }
};

/**
 * Delete multiple images at once
 * @param publicIds - Array of public_ids to delete
 * @returns Promise with array of deletion results
 */
export const deleteMultipleImages = async (
  publicIds: string[],
): Promise<Array<{ result: string }>> => {
  try {
    const deletePromises = publicIds.map((publicId) => deleteImage(publicId));
    return await Promise.all(deletePromises);
  } catch (error) {
    console.error("Error deleting multiple images:", error);
    throw error;
  }
};

export default cloudinary;
