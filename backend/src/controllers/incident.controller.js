import * as incidentService from '../services/incident.service.js';

export const logIncident = async (req, res) => {
  try {
    const { type, description, severity, imageUrl, cameraId } = req.body;

    if (!type || !cameraId) {
      return res.status(400).json({ error: 'Incident type and cameraID are required.' });
    }

    const incident = await incidentService.createIncident({
      type,
      description,
      severity,
      imageUrl,
      cameraId,
    });
    res.status(201).json({ message: 'Incident logged successfully', incident });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getIncidents = async (req, res) => {
  try {
    const incidents = await incidentService.getAllIncidents();
    res.status(200).json(incidents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
