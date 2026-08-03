import {
  generateUploadSignature,
  getUploadUrl,
  generatePublicId,
} from '../config/cloudinary.js';

export async function requestUploadUrl(organizationId, deviceId, incidentId, type, contentType) {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are missing in cloud-backend .env on server');
  }

  const resourceType = type === 'snapshot' ? 'image' : 'video';
  const publicId = generatePublicId(organizationId, deviceId, incidentId, type);
  const { signature, timestamp } = generateUploadSignature(publicId);
  const uploadUrl = getUploadUrl(resourceType);

  return {
    uploadUrl,
    publicId,
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  };
}
