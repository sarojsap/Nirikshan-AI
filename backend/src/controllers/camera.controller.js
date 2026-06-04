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

export const getCamera = async (req, res) => {
  try {
    const cameras = await cameraService.getAllCameras();
    res.status(200).json(cameras);
  } catch (error) {
    res.status(500).json({ error: error, message });
  }
};
