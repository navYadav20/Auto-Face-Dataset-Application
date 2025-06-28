export function checkFaceObstructions(landmarks) {
  if (!landmarks || landmarks.length < 468) return true;

  // Critical face points (eye corners, nose tip, lips)
  const keyIndices = [33, 133, 362, 263, 1, 13, 14];

  let missingOrBroken = 0;

  for (const i of keyIndices) {
    const lm = landmarks[i];

    if (
      !lm ||                     // completely missing
      isNaN(lm.x) || isNaN(lm.y) || isNaN(lm.z) || // corrupted
      lm.x <= 0 || lm.x >= 1 ||  // invalid x range (normalized coordinates)
      lm.y <= 0 || lm.y >= 1     // invalid y range
    ) {
      missingOrBroken++;
    }
  }

  return missingOrBroken >= 1; // obstruction likely if 2 or more key points are broken
}
