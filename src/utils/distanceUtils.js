// Constants for distance calculation
export const AVERAGE_IPD_MM = 63; // Average inter-pupillary distance in millimeters (adults)
export const DEFAULT_FOCAL_LENGTH = 950; // Will need calibration

/**
 * Calculates face distance from camera using inter-pupillary distance
 * @param {Array} landmarks - Face mesh landmarks
 * @param {number} imageWidth - Width of the image/video frame
 * @param {number} [focalLength=DEFAULT_FOCAL_LENGTH] - Camera focal length
 * @returns {number} Distance in centimeters
 */
export function calculateFaceDistance(landmarks, imageWidth, focalLength = DEFAULT_FOCAL_LENGTH) {
  // MediaPipe Face Mesh landmark indices for eye centers
  const LEFT_EYE_CENTER = 468;
  const RIGHT_EYE_CENTER = 473;

  // Get eye landmarks
  const leftEye = landmarks[LEFT_EYE_CENTER];
  const rightEye = landmarks[RIGHT_EYE_CENTER];

  if (!leftEye || !rightEye) return null;

  // Calculate pixel distance between eyes
  const pixelDistance = Math.sqrt(
    Math.pow(rightEye.x * imageWidth - leftEye.x * imageWidth, 2) +
    Math.pow(rightEye.y * imageWidth - leftEye.y * imageWidth, 2)
  );

  // Distance estimation formula: distance = (known IPD * focal length) / pixel IPD
  const distanceMm = (AVERAGE_IPD_MM * focalLength) / pixelDistance;
  
  // Convert to centimeters
  return distanceMm / 10;
}

/**
 * Determines if face is within optimal distance range
 * @param {number} distance - Distance in cm
 * @param {number} [min=30] - Minimum optimal distance
 * @param {number} [max=50] - Maximum optimal distance
 * @returns {boolean}
 */
export function isOptimalDistance(distance, min = 35, max = 80) {
  return distance && distance >= min && distance <= max;
}