import React, { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import Webcam from "react-webcam";
import {
  ORIENTATION_SEQUENCE,
  calculatePitch,
  calculateYaw,
  calculateRoll,
} from "../utils/angleUtils";
import { useLocation } from "react-router-dom";

export default function CameraFeed() {
  // Smoothing buffers
  const pitchBuffer = useRef([]);
  const yawBuffer = useRef([]);
  const rollBuffer = useRef([]);

  function getSmoothedPitch(newPitch, windowSize = 5) {
    pitchBuffer.current.push(newPitch);
    if (pitchBuffer.current.length > windowSize) {
      pitchBuffer.current.shift();
    }
    return (
      pitchBuffer.current.reduce((a, b) => a + b, 0) /
      pitchBuffer.current.length
    );
  }

  function getSmoothedYaw(newYaw, windowSize = 5) {
    yawBuffer.current.push(newYaw);
    if (yawBuffer.current.length > windowSize) {
      yawBuffer.current.shift();
    }
    return (
      yawBuffer.current.reduce((a, b) => a + b, 0) / yawBuffer.current.length
    );
  }

  function getSmoothedRoll(newRoll, windowSize = 5) {
    rollBuffer.current.push(newRoll);
    if (rollBuffer.current.length > windowSize) {
      rollBuffer.current.shift();
    }
    return (
      rollBuffer.current.reduce((a, b) => a + b, 0) / rollBuffer.current.length
    );
  }

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null); // New canvas for drawing overlay
  const [currentOrientation, setCurrentOrientation] = useState(0);
  const [angles, setAngles] = useState({ pitch: 0, yaw: 0, roll: 0 });
  const [isAligned, setIsAligned] = useState(false);
  const [photos, setPhotos] = useState([]);
  const location = useLocation();
  const { rollNumber, wearsSpectacles } = location.state || {};

  // bounding box on face and dimension
  const drawFaceBox = (ctx, landmarks, isAligned) => {
    // Get extreme points of the face
    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    landmarks.forEach((landmark) => {
      const x = overlayCanvasRef.current.width - landmark.x * overlayCanvasRef.current.width; //  mirror X
      const y = landmark.y * overlayCanvasRef.current.height;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });

    // Calculate passport crop area
    const faceHeight = (maxY - minY) * 1.8; // 80% more than face height
    const faceWidth = faceHeight * 0.77; // Standard passport ratio

    const cropX = (minX + maxX) / 2 - faceWidth / 2;
    const cropY = minY - faceHeight * 0.3; // 30% space above head

    // Draw the passport crop guide
    ctx.strokeStyle = isAligned
      ? "rgba(0, 255, 0, 0.7)"
      : "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(cropX, cropY, faceWidth, faceHeight);

    // Add some padding
    const padding = 20;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    // Draw the box
    ctx.strokeStyle = isAligned ? "#00FF00" : "#FF0000";
    ctx.lineWidth = 4;
    ctx.setLineDash(isAligned ? [] : [5, 5]);
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

    // Add semi-transparent fill
    ctx.fillStyle = isAligned ? "rgba(0, 255, 0, 0.1)" : "rgba(255, 0, 0, 0.1)";
    ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

    // Add label
    ctx.fillStyle = isAligned ? "#00FF00" : "#FF0000";
    ctx.font = "16px Arial";
    ctx.fillText(
      isAligned ? "Aligned_capture" : "Adjust your face",
      minX,
      minY - 10
    );
  };

  const capturePhoto = () => {
    if (!isAligned) return;

    const canvas = canvasRef.current;
    const video = webcamRef.current.video;

    if (canvas && video) {
      // Set canvas to video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Create a new canvas for cropped image
      const cropCanvas = document.createElement("canvas");
      const cropCtx = cropCanvas.getContext("2d");

      // Calculate passport-style dimensions (adjust as needed)
      const faceWidth = canvas.width * 1; // 50% of original width
      const faceHeight = faceWidth * 1; // Standard passport ratio (35x45mm)

      // Calculate crop area (centered on face)
      const cropX = (canvas.width - faceWidth) / 2;
      const cropY = (canvas.height - faceHeight) * 0.85; // 25% from top

      // Set cropped canvas size
      cropCanvas.width = faceWidth;
      cropCanvas.height = faceHeight;

      // Draw cropped portion
      cropCtx.drawImage(
        canvas,
        cropX,
        cropY, // Source x, y
        faceWidth,
        faceHeight, // Source width, height
        0,
        0, // Destination x, y
        faceWidth,
        faceHeight // Destination width, height
      );

      // Get cropped image data
      const photo = cropCanvas.toDataURL("image/jpeg", 0.92); // 92% quality

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

  const savePhotos = async () => {
    if (photos.length === 0) return;

    try {
      const zip = new JSZip();
      const folder = zip.folder(rollNumber);

      await Promise.all(
        photos.map(async (photo, index) => {
          const response = await fetch(photo.image);
          const blob = await response.blob();
          folder.file(`${photo.orientation}_${index + 1}.jpg`, blob);
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${rollNumber}.zip`);
    } catch (error) {
      console.error("Error creating zip file:", error);
      alert("Failed to save photos. Please try again.");
    }
  };

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
      const overlayCtx = overlayCanvasRef.current.getContext("2d");

      // Clear previous drawings
      overlayCtx.clearRect(
        0,
        0,
        overlayCanvasRef.current.width,
        overlayCanvasRef.current.height
      );

      if (results.multiFaceLandmarks?.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];

        // Calculate angles
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

        const aligned = ORIENTATION_SEQUENCE[currentOrientation].condition(
          smoothedYaw,
          smoothedPitch,
          smoothedRoll
        );
        setIsAligned(aligned);

        // Draw face bounding box
        drawFaceBox(overlayCtx, landmarks, aligned);
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
      <h1>Roll Number: {rollNumber}</h1>

      <div
        className="video-wrapper"
        style={{ position: "relative", width: "640px", height: "480px" }}
      >
        <Webcam
          ref={webcamRef}
          mirrored={true}
          videoConstraints={{
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        />
        <canvas
          ref={overlayCanvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none", // Allows clicks to pass through to the video
          }}
          width={640}
          height={480}
        />
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div className="orientation-feedback">
        <h3>Current Target: {ORIENTATION_SEQUENCE[currentOrientation].name}</h3>
        <p>
          Pitch: {angles.pitch.toFixed(1)}° | Yaw: {angles.yaw.toFixed(1)}° |
          Roll: {angles.roll.toFixed(1)}°
        </p>
        <p>Status: {isAligned ? "Ready to Capture!" : "Adjust your face"}</p>
      </div>

      <button
        onClick={capturePhoto}
        disabled={!isAligned}
        className={isAligned ? "active-capture" : ""}
      >
        Capture {ORIENTATION_SEQUENCE[currentOrientation].name}
      </button>

      <div className="photo-grid">
        {photos.map((photo, i) => (
          <div key={i} style={{ margin: "10px", textAlign: "center" }}>
            <img
              src={photo.image}
              alt={photo.orientation}
              style={{
                width: "120px",
                height: "156px", // 35x45mm ratio (1:1.3)
                objectFit: "cover",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            />
            <p style={{ marginTop: "5px" }}>{photo.orientation}</p>
          </div>
        ))}
      </div>

      {photos.length > 0 && (
        <button
          onClick={savePhotos}
          className="save-button"
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Download All Photos as ZIP
        </button>
      )}
    </div>
  );
}
