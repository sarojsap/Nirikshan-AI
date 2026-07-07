import {
  generateUploadSignature,
  getUploadUrl,
  generatePublicId,
} from '../config/cloudinary.js';

export async function requestUploadUrl(organizationId, deviceId, incidentId, type, contentType) {
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
