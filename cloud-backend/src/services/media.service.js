import { generateUploadUrl } from '../config/s3.js';

export function generateMediaKey(organizationId, deviceId, incidentId, type) {
  const ext = type === 'snapshot' ? 'jpg' : 'mp4';
  return `organizations/${organizationId}/devices/${deviceId}/incidents/${incidentId}/${type}_${Date.now()}.${ext}`;
}

export async function requestUploadUrl(organizationId, deviceId, incidentId, type, contentType) {
  const key = generateMediaKey(organizationId, deviceId, incidentId, type);
  const uploadUrl = await generateUploadUrl(key, contentType);
  return { uploadUrl, key };
}
