import * as incidentService from '../services/incident.service.js';
import { getIO } from '../config/socket.js';

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

    // -- REAL TIME ALERT BROADCAST --
    // Fetch the connected Socket.io instance
    const io = getIO();

    // Emit an event named 'new_incident' containing the incident data
    io.emit('new_incident', incident);

    res.status(201).json({ message: 'Incident logged successfully', incident });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getIncidents = async (req, res) => {
  try {
    // Extract page and limit from the query string, and procide default values
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    // Validation to ensure valid numbers
    if (page < 1 || limit < 1) {
      return res.status(400).json({ error: 'Page and limit must be positive integers.' });
    }

    const result = await incidentService.getAllIncidents(page, limit);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
