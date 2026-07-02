/**
 * Camera Configuration Schema Registry
 *
 * This is the single source of truth for all per-camera AI configurable parameters.
 * Adding a new entry here automatically surfaces it in the frontend settings panel,
 * validates it on the backend, and makes it available to the AI inference service.
 *
 * Each entry describes:
 *   key         - The database column / JSON field name
 *   label       - Human-readable name shown in the UI
 *   description - Tooltip / help text
 *   type        - 'integer' | 'float' | 'boolean' | 'time' | 'json'
 *   category    - Grouping for the UI (e.g. 'Detection', 'Alerts', 'Scheduling')
 *   default     - Default value used when the camera has no value set
 *   min / max   - Range constraints (for numeric types)
 *   step        - Increment step (for sliders / numeric inputs)
 *   readOnly    - If true, displayed but not editable from the UI
 */

export const cameraConfigSchema = [
  // ── Detection Settings ──────────────────────────────────────────
  {
    key: 'confidenceThreshold',
    label: 'AI Confidence Threshold',
    description: 'Minimum detection confidence (0–1). Lower values detect more objects but may produce false positives.',
    type: 'float',
    category: 'Detection',
    default: 0.5,
    min: 0.1,
    max: 1.0,
    step: 0.05,
  },
  {
    key: 'crowdThreshold',
    label: 'Crowd Alert Threshold',
    description: 'Number of people detected simultaneously before a crowd alert fires.',
    type: 'integer',
    category: 'Detection',
    default: 3,
    min: 1,
    max: 100,
    step: 1,
  },

  // ── Feature Toggles ─────────────────────────────────────────────
  {
    key: 'alertsEnabled',
    label: 'Enable Alerts',
    description: 'Master switch — when disabled, no alerts of any type will be sent for this camera.',
    type: 'boolean',
    category: 'Alerts',
    default: true,
  },
  {
    key: 'intrusionEnabled',
    label: 'Intrusion Detection',
    description: 'Toggle intrusion (restricted-zone breach) alerts for this camera.',
    type: 'boolean',
    category: 'Alerts',
    default: true,
  },
  {
    key: 'crowdEnabled',
    label: 'Crowd Detection',
    description: 'Toggle crowd-density alerts for this camera.',
    type: 'boolean',
    category: 'Alerts',
    default: true,
  },

  // ── Alert Cooldown ──────────────────────────────────────────────
  {
    key: 'cooldownSeconds',
    label: 'Alert Cooldown (seconds)',
    description: 'Minimum interval between repeated alerts of the same type. Prevents alert flooding.',
    type: 'integer',
    category: 'Alerts',
    default: 10,
    min: 1,
    max: 300,
    step: 1,
  },

  // ── Scheduling ──────────────────────────────────────────────────
  {
    key: 'restrictedStartTime',
    label: 'Restricted Zone Start Time',
    description: 'Intrusion alerts are only active between the start and end times. Leave empty for 24/7 monitoring.',
    type: 'time',
    category: 'Scheduling',
    default: null,
  },
  {
    key: 'restrictedEndTime',
    label: 'Restricted Zone End Time',
    description: 'Intrusion alerts are only active between the start and end times. Leave empty for 24/7 monitoring.',
    type: 'time',
    category: 'Scheduling',
    default: null,
  },
];

/**
 * Validate a single config value against its schema entry.
 *
 * @param {object} schemaEntry - One entry from `cameraConfigSchema`.
 * @param {*} value - The incoming value to validate.
 * @returns {{ valid: boolean, sanitized?: *, error?: string }}
 */
export function validateConfigValue(schemaEntry, value) {
  const { key, type, min, max } = schemaEntry;

  // Allow null / undefined for nullable fields (time, json)
  if (value === null || value === undefined || value === '') {
    if (type === 'time' || type === 'json') {
      return { valid: true, sanitized: null };
    }
    return { valid: false, error: `"${key}" cannot be null or empty.` };
  }

  switch (type) {
    case 'integer': {
      const n = Number(value);
      if (!Number.isFinite(n) || !Number.isInteger(n)) {
        return { valid: false, error: `"${key}" must be an integer.` };
      }
      if (min !== undefined && n < min)
        return { valid: false, error: `"${key}" must be at least ${min}.` };
      if (max !== undefined && n > max)
        return { valid: false, error: `"${key}" must be at most ${max}.` };
      return { valid: true, sanitized: n };
    }
    case 'float': {
      const f = Number(value);
      if (!Number.isFinite(f)) {
        return { valid: false, error: `"${key}" must be a number.` };
      }
      if (min !== undefined && f < min)
        return { valid: false, error: `"${key}" must be at least ${min}.` };
      if (max !== undefined && f > max)
        return { valid: false, error: `"${key}" must be at most ${max}.` };
      return { valid: true, sanitized: f };
    }
    case 'boolean': {
      let b = value;
      if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') b = true;
        else if (value.toLowerCase() === 'false') b = false;
      }
      if (typeof b !== 'boolean') {
        return { valid: false, error: `"${key}" must be true or false.` };
      }
      return { valid: true, sanitized: b };
    }
    case 'time': {
      if (typeof value !== 'string' || !/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
        return {
          valid: false,
          error: `"${key}" must be a time string (HH:MM or HH:MM:SS).`,
        };
      }
      const sanitized = value.length === 5 ? `${value}:00` : value;
      return { valid: true, sanitized };
    }
    case 'json': {
      return { valid: true, sanitized: value };
    }
    default:
      return { valid: false, error: `Unknown type "${type}" for key "${key}".` };
  }
}

/**
 * Validate cross-field constraints across multiple settings.
 * Currently enforces that restrictedStartTime and restrictedEndTime
 * must be either both set or both null.
 *
 * @param {object} settings - The full settings object being updated.
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateSettingsConstraints(settings) {
  const hasStart = 'restrictedStartTime' in settings;
  const hasEnd = 'restrictedEndTime' in settings;

  const startVal = settings.restrictedStartTime;
  const endVal = settings.restrictedEndTime;

  if (hasStart && hasEnd) {
    const startNull = startVal === null || startVal === undefined || startVal === '';
    const endNull = endVal === null || endVal === undefined || endVal === '';

    if (startNull !== endNull) {
      return {
        valid: false,
        error: 'Both restricted start time and end time must be set or both must be cleared.',
      };
    }
  }

  return { valid: true };
}
