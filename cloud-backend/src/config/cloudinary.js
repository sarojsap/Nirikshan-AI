import { v2 as cloudinary } from 'cloudinary';

function ensureConfigured() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(`Cloudinary missing configuration: CLOUDINARY_CLOUD_NAME=${cloudName ? 'set' : 'missing'}, CLOUDINARY_API_KEY=${apiKey ? 'set' : 'missing'}, CLOUDINARY_API_SECRET=${apiSecret ? 'set' : 'missing'}`);
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

export function generateUploadSignature(publicId) {
  ensureConfigured();
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { public_id: publicId, timestamp },
    process.env.CLOUDINARY_API_SECRET,
  );
  return { signature, timestamp };
}

export function getUploadUrl(resourceType) {
  ensureConfigured();
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  return `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
}

export function generatePublicId(organizationId, deviceId, incidentId, type) {
  return `nirikshan/organizations/${organizationId}/devices/${deviceId}/incidents/${incidentId}/${type}`;
}
