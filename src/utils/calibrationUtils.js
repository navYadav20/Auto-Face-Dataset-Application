import { AVERAGE_IPD_MM, calculateFaceDistance } from './distanceUtils';

/**
 * Calibrates camera focal length based on known distance
 * @param {Array} landmarks - Face mesh landmarks at known distance
 * @param {number} imageWidth - Width of the image/video frame
 * @param {number} knownDistanceMm - Actual distance in millimeters
 * @returns {number} Calculated focal length
 */
export function calibrateFocalLength(landmarks, imageWidth, knownDistanceMm) {
  const LEFT_EYE_CENTER = 468;
  const RIGHT_EYE_CENTER = 473;
  
  const leftEye = landmarks[LEFT_EYE_CENTER];
  const rightEye = landmarks[RIGHT_EYE_CENTER];

  const pixelDistance = Math.sqrt(
    Math.pow(rightEye.x * imageWidth - leftEye.x * imageWidth, 2) +
    Math.pow(rightEye.y * imageWidth - leftEye.y * imageWidth, 2)
  );

  return (pixelDistance * knownDistanceMm) / AVERAGE_IPD_MM;
}