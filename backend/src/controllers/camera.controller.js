import * as cameraService from '../services/camera.service.js';

export const createCamera = async (req, res) => {
  try {
    const { name, location, rtspUrl } = req.body;

    if (!name || !location || !rtspUrl) {
      return res.status(400).json({ error: 'Name, location, and rtspUrl are required!' });
    }

    const camera = await cameraService.addCamera({ name, location, rtspUrl });
    res.status(201).json({ message: 'Camera added successfully!', camera });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCameras = async (req, res) => {
  try {
    const cameras = await cameraService.getAllCameras();
    res.status(200).json(cameras);
  } catch (error) {
    res.status(500).json({ error: error, message });
  }
};

export const getCamera = async (req, res) => {
  try {
    const camera = await cameraService.getCameraById(req.params.id);
    res.status(200).json(camera);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const { crowdThreshold, restrictedPolygon, restrictedStartTime, restrictedEndTime } = req.body;

    const updatedCamera = await cameraService.updateCameraSettings(id, {
      crowdThreshold,
      restrictedPolygon,
      restrictedStartTime,
      restrictedEndTime,
    });

    res.status(200).json({ message: 'Settings updated successfully', camera: updatedCamera });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
