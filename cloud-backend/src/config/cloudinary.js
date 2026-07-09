import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function generateUploadSignature(publicId) {
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { public_id: publicId, timestamp },
    process.env.CLOUDINARY_API_SECRET,
  );
  return { signature, timestamp };
}

export function getUploadUrl(resourceType) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  return `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
}

export function generatePublicId(organizationId, deviceId, incidentId, type) {
  return `nirikshan/organizations/${organizationId}/devices/${deviceId}/incidents/${incidentId}/${type}`;
}


