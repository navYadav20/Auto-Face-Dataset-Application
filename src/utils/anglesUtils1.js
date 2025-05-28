const ORIENTATION_SEQUENCE = [
  {
    name: "Looking Straight",
    condition: (yaw, pitch, roll) => Math.abs(pitch) < 15
  },
  {
    name: "Looking Up",
    condition: (yaw, pitch, roll) => pitch < -25
  },
  {
    name: "Looking Down",
    condition: (yaw, pitch, roll) => pitch > 25
  }
];

function calculatePitch(landmarks) {
  // We only need these specific landmarks for pitch calculation
  const forehead = landmarks[10];  // Between eyebrows
  const noseTip = landmarks[1];    // Nose tip
  const chin = landmarks[152];     // Chin

  // Calculate vertical vector (chin to forehead)
  const verticalVec = {
    x: chin.x - forehead.x,
    y: chin.y - forehead.y,
    z: chin.z - forehead.z
  };

  // Calculate pitch using simple trigonometry
  const pitch = Math.atan2(
    Math.abs(verticalVec.y),
    Math.sqrt(verticalVec.x**2 + verticalVec.z**2)
  ) * (180 / Math.PI);

  // Determine direction (up or down)
  return noseTip.y < forehead.y ? -pitch : pitch;
}

export {
  ORIENTATION_SEQUENCE,
  calculatePitch
};