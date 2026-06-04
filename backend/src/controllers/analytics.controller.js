import * as analyticsService from '../services/analytics.service.js';

export const getSummary = async (req, res) => {
  try {
    const summary = await analyticsService.getDashboardSummary();
    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
