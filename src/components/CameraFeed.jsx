import React, { useEffect, useRef, useState } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import Webcam from "react-webcam";
import {
  ORIENTATION_SEQUENCE,
  calculatePitch,
  calculateYaw,
  calculateRoll,
} from "../utils/angleUtils";
import { checkLightingConditions } from "../utils/LightingUtils";

export default function CameraFeed() {
  const [lighting, setLighting] = useState({
    passed: false,
    details: null,
  });

  // smooth for the pitch
  const pitchBuffer = useRef([]);
  function getSmoothedPitch(newPitch, windowSize = 5) {
    pitchBuffer.current.push(newPitch);
    if (pitchBuffer.current.length > windowSize) {
      pitchBuffer.current.shift(); // Keep the buffer size fixed
    }
    const sum = pitchBuffer.current.reduce((a, b) => a + b, 0);
    return sum / pitchBuffer.current.length;
  }

  // smooth for the Yaw
  const yawBuffer = useRef([]);
  function getSmoothedYaw(newYaw, windowSize = 5) {
    yawBuffer.current.push(newYaw);
    if (yawBuffer.current.length > windowSize) {
      yawBuffer.current.shift();
    }
    const sum = yawBuffer.current.reduce((a, b) => a + b, 0);
    return sum / yawBuffer.current.length;
  }

  // smooth fot the roll
  const rollBuffer = useRef([]);

  function getSmoothedRoll(newRoll, windowSize = 5) {
    rollBuffer.current.push(newRoll);
    if (rollBuffer.current.length > windowSize) {
      rollBuffer.current.shift();
    }
    const sum = rollBuffer.current.reduce((a, b) => a + b, 0);
    return sum / rollBuffer.current.length;
  }

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [currentOrientation, setCurrentOrientation] = useState(0);
  const [angles, setAngles] = useState({ pitch: 0, yaw: 0, roll: 0 });
  const [isAligned, setIsAligned] = useState(false);
  const [photos, setPhotos] = useState([]);

  // Simplified alignment check (pitch only)
  const checkAlignment = (pitch) => {
    return ORIENTATION_SEQUENCE[currentOrientation].condition(pitch);
  };

  const capturePhoto = () => {
    if (!isAligned) return;

    const canvas = canvasRef.current;
    const video = webcamRef.current.video;

    console.log(canvas);
    console.log(video);
    if (canvas && video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photo = canvas.toDataURL("image/jpeg");

      setPhotos([
        ...photos,
        {
          orientation: ORIENTATION_SEQUENCE[currentOrientation].name,
          image: photo,
        },
      ]);

      if (currentOrientation < ORIENTATION_SEQUENCE.length - 1) {
        setCurrentOrientation(currentOrientation + 1);
      }
    }
  };

  // lighting effect like brightness, contrast and BG
  useEffect(() => {
    const interval = setInterval(() => {
      if (webcamRef.current) {
        const canvas = document.createElement("canvas");
        canvas.width = webcamRef.current.video.videoWidth;
        canvas.height = webcamRef.current.video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(webcamRef.current.video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setLighting(checkLightingConditions(imageData));
      }
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults((results) => {
      if (results.multiFaceLandmarks?.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];

        const rawPitch = calculatePitch(landmarks);
        const rawYaw = calculateYaw(landmarks);
        const rawRoll = calculateRoll(landmarks);

        const smoothedPitch = getSmoothedPitch(rawPitch);
        const smoothedYaw = getSmoothedYaw(rawYaw);
        const smoothedRoll = getSmoothedRoll(rawRoll);

        setAngles({
          pitch: smoothedPitch,
          yaw: smoothedYaw,
          roll: smoothedRoll,
        });

        setIsAligned(
          ORIENTATION_SEQUENCE[currentOrientation].condition(
            smoothedYaw,
            smoothedPitch,
            smoothedRoll
          )
        );

        console.log("Face Dimensions:", {
          height: Math.abs(landmarks[152].y - landmarks[10].y),
          width: Math.abs(landmarks[454].x - landmarks[234].x),
        });

        console.log("Normalized Angles:", {
          pitch: smoothedPitch,
          yaw: smoothedYaw,
          roll: smoothedRoll,
        });
      }
    });

    let camera;
    if (webcamRef.current?.video) {
      camera = new Camera(webcamRef.current.video, {
        onFrame: async () =>
          await faceMesh.send({ image: webcamRef.current.video }),
        width: 640,
        height: 480,
      });
      camera.start();
    }

    return () => camera?.stop();
  }, [currentOrientation]);

  return (
    <div className="camera-container">
      <div className="angle-debug">
        {/* <p>Pitch: {angles.pitch.toFixed(1)}°</p>
        <p>Yaw: {angles.yaw.toFixed(1)}°</p>
        <p>Roll: {angles.roll.toFixed(1)}°</p>
        <p>Target: {ORIENTATION_SEQUENCE[currentOrientation].name}</p> */}
      </div>

      <Webcam ref={webcamRef} mirrored={true} />
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <div className="orientation-feedback">
        <h3>Current Target: {ORIENTATION_SEQUENCE[currentOrientation].name}</h3>
        <p>
          Pitch: {angles.pitch.toFixed(1)}° | Yaw: {angles.yaw.toFixed(1)}° |
          Roll: {angles.roll.toFixed(1)}°
        </p>
        {/* <p>Yaw: {angles.yaw.toFixed(1)}°</p>
        <p>Roll: {angles.roll.toFixed(1)}°</p> */}
        <p>Status: {isAligned ? "Ready to Capture!" : "Adjust your face"}</p>
      </div>
        { /* Add lighting feedback UI */}
      <div className="lighting-feedback">
        {lighting.details && (
          <>
            <div>Brightness: {lighting.details.brightness}%</div>
            <div>Background: {lighting.details.backgroundWhiteness}% white</div>
            <div>Face Light: {lighting.details.faceIllumination}/255</div>
          </>
        )}
        {/* {!lighting.passed && (
          <div className="lighting-tips">
            <p>Tips:</p>
            <ul>
              <li>Face a white wall</li>
              <li>Avoid backlighting</li>
              <li>Use even lighting</li>
            </ul>
          </div>
        )} */}
      </div>
      <button
        onClick={capturePhoto}
        disabled={!isAligned || !lighting.passed}
        className={`capture-btn ${
          isAligned && lighting.passed ? "ready" : "disabled"
        }`}
      >
        {/* Capture {ORIENTATION_SEQUENCE[currentOrientation].name} */}
        {lighting.passed ? "Capture" : "Improve Lighting"}
      </button>
      <div className="photo-grid">
        {photos.map((photo, i) => (
          <div key={i}>
            <img src={photo.image} alt={photo.orientation} width="100" />
            <p>{photo.orientation}</p>
          </div>
        ))}
      </div>

    </div>
  );
}
