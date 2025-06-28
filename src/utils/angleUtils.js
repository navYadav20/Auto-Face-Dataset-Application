export const ORIENTATION_SEQUENCE = [
  {
    name: "Look Straight till the circle is green ",
    condition: (yaw, pitch, roll) =>
    yaw > -8 && yaw < 8 && pitch > -10 && pitch < 14 && roll > -8 && roll < 8
    
  },
  {
    name: "Look slowly-slowly left till the circle is green",
    condition: (yaw, pitch, roll) => yaw > 22 && yaw < 40 &&
      pitch < 12 && pitch > -12 && roll > -10 && roll < 10
  },
  {
    name: "Look slowly-slowly Right till the circle is green",
    condition: (yaw, pitch, roll) => yaw < -20 && yaw > -40 && 
     pitch < 10 && pitch > -15 && roll > -10 && roll < 10
  },
  {
    name: "Look Up slowly-slowly till the circle is green",
    condition: (yaw, pitch, roll) => Math.abs(yaw) < 10  && pitch < -15 && pitch > -33
    // condition: (yaw, pitch, roll) => pitch > -8 && pitch < -14 && Math.abs(yaw) < 5 && Math.abs(roll) < 5
  },
  {
    name: "Look Down slowly-slowly till the circle is green",
    condition: (yaw, pitch, roll) => pitch<40 && pitch > 25 && Math.abs(yaw) < 5 
  }
];

export function calculatePitch(landmarks) {
  const forehead = landmarks[10];
  const chin = landmarks[152];
  const noseTip = landmarks[1];

  // Vector from forehead to chin
  const faceVec = {
    x: chin.x - forehead.x,
    y: chin.y - forehead.y,
    z: chin.z - forehead.z
  };

  // Magnitude of face vector
  const faceLength = Math.sqrt(faceVec.x ** 2 + faceVec.y ** 2 + faceVec.z ** 2);

  // Camera vertical vector (y-axis)
  const cameraVec = { x: 0, y: 1, z: 0 };

  // Dot product to calculate angle
  const dot = faceVec.x * cameraVec.x + faceVec.y * cameraVec.y + faceVec.z * cameraVec.z;
  let angleRad = Math.acos(dot / faceLength);  // mag(cameraVec) = 1
  let angleDeg = angleRad * (180 / Math.PI);

  // Use the position of the nose tip to determine up or down
  const midpoint = {
    x: (forehead.x + chin.x) / 2,
    y: (forehead.y + chin.y) / 2,
    z: (forehead.z + chin.z) / 2
  };

  if (noseTip.y > midpoint.y) {
    // Nose below midpoint = looking down
    angleDeg = angleDeg;
  } else {
    // Nose above midpoint = looking up
    angleDeg = -angleDeg;
  }

  return angleDeg;
}

export function calculateYaw(landmarks) {
  const leftCheek = landmarks[234];   // Left side of face
  const rightCheek = landmarks[454];  // Right side of face
  const noseTip = landmarks[1];

  // Vector from left to right cheek (horizontal face axis)
  const faceVec = {
    x: rightCheek.x - leftCheek.x,
    y: rightCheek.y - leftCheek.y,
    z: rightCheek.z - leftCheek.z
  };

  // Camera horizontal axis is the X-axis
  const cameraVec = { x: 1, y: 0, z: 0 };

  const faceWidth = Math.sqrt(faceVec.x ** 2 + faceVec.y ** 2 + faceVec.z ** 2);
  const dot = faceVec.x * cameraVec.x + faceVec.y * cameraVec.y + faceVec.z * cameraVec.z;

  let angleRad = Math.acos(dot / faceWidth);
  let angleDeg = angleRad * (180 / Math.PI);

  // Use nose tip position relative to cheek center to determine left/right
  const midpoint = {
    x: (leftCheek.x + rightCheek.x) / 2,
    y: (leftCheek.y + rightCheek.y) / 2,
    z: (leftCheek.z + rightCheek.z) / 2
  };

  if (noseTip.x < midpoint.x) {
    // Nose towards left = looking right
    angleDeg = -angleDeg;
  } else {
    // Nose towards right = looking left
    angleDeg = angleDeg;
  }

  return angleDeg;
}

export function calculateRoll(landmarks) {
  const leftEye = landmarks[33];   // Left eye outer corner
  const rightEye = landmarks[263]; // Right eye outer corner

  // Calculate angle between eyes
  const dx = rightEye.x - leftEye.x;
  const dy = rightEye.y - leftEye.y;
  const angleRad = Math.atan2(dy, dx);
  const angleDeg = angleRad * (180 / Math.PI);

  return angleDeg;
}


