import React, { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import "../App.css";
import { saveAs } from "file-saver";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import Webcam from "react-webcam";
import { checkLightingCondition } from "../utils/LightingUtils";
import { checkBackgroundIsWhite } from "../utils/bgIsWhite";
import {
  calculateFaceDistance,
  isOptimalDistance,
  AVERAGE_IPD_MM,
  DEFAULT_FOCAL_LENGTH,
} from "../utils/distanceUtils";
import { calibrateFocalLength } from "../utils/calibrationUtils";
import { checkFaceObstructions } from "../utils/validationUtils";
import GoogleDriveUploadButton from './DriveUploadButton';

// helo
import {
  ORIENTATION_SEQUENCE,
  calculatePitch,
  calculateYaw,
  calculateRoll,
} from "../utils/angleUtils";
import { useLocation } from "react-router-dom";
import audioFile from "../assets/audio.mp3";

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
  const [capturePhase, setCapturePhase] = useState("withSpectacles"); // 'withSpectacles' or 'withoutSpectacles'
  const [showRemoveSpectaclesPrompt, setShowRemoveSpectaclesPrompt] = useState(false);
  const [autoCaptureMode, setAutoCaptureMode] = useState(false);
  const [captureDelay, setCaptureDelay] = useState(2.0); // seconds
  const [countdown, setCountdown] = useState(null);
  const alignmentTimer = useRef(null);
  const countdownTimer = useRef(null);
  const audioRef = useRef(new Audio(audioFile));
  const [allPhotosCompleted, setAllPhotosCompleted] = useState(false);
  const [lastCaptureTime, setLastCaptureTime] = useState(0);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [isLightingGood, setIsLightingGood] = useState(true);
  const [isRetakeMode, setIsRetakeMode] = useState(false);
  const [retakeIndex, setRetakeIndex] = useState(null);
  const [avgLuminance, setAvgLuminance] = useState(0);
  const [isWhiteBg, setIsWhiteBg] = useState(true);
//   const [faceDistance, setFaceDistance] = useState(null);
  const [focalLength, setFocalLength] = useState(DEFAULT_FOCAL_LENGTH);
  const [isValidFace, setIsValidFace] = useState(true); 
  const [error, setError] = useState(null);
  const countdownRef = useRef(null);


  // bounding box on face and dimension

    const drawAlignmentMask = (ctx, width, height, isAligned, countdown) => {
    const maskWidth = 200;
    const maskHeight = 280;

    const centerX = width / 2;
    const centerY = height / 2;

    // 1. Dim background except oval cut-out
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.arc(centerX, centerY, maskHeight / 2, 0, 2 * Math.PI, true);
    ctx.clip("evenodd");
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // 2. Draw oval border
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, maskWidth / 2, maskHeight / 2, 0, 0, 2 * Math.PI);
    ctx.strokeStyle = isAligned ? "limegreen" : "red";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.stroke();

    //  3. Draw countdown above the oval
    ctx.font = "25px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFD700"; // Yellow for countdown

    if (countdown !== null) {
    const now = Date.now();
    const blink = Math.floor(now / 200) % 2 === 0; // blink every 500ms

    // Fade in-out effect using sine wave for smooth opacity
    const fade = 0.5 + 0.5 * Math.sin(now / 250); // value between 0-1
    ctx.save();

    const pulse = 1 + 0.05 * Math.sin(now / 150); // scale 1x–1.05x
    ctx.font = `bold ${30 * pulse}px Arial`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFD700"; // Yellow
    ctx.globalAlpha = blink ? fade : 0.2; // combine fade and blink

    ctx.fillText(
        `Wait ${countdown}s`,
        centerX,
        centerY - maskHeight / 2 - 25
    );

    ctx.restore();
    } else {
        // For testing: always show something so we know if drawing works
        ctx.fillStyle = "white";
        ctx.fillText(" -", centerX, centerY - maskHeight / 2 - 20);
    }

    // 4. Draw alignment message below the oval
    ctx.font = "18px Arial";
    ctx.fillStyle = isAligned ? "limegreen" : "red";
    ctx.fillText(
        isAligned ? "Face aligned" : "Align face inside circle",
        centerX,
        centerY + maskHeight / 2 + 30
    );
    };


  const capturePhoto = () => {
    // Prevent capture if all photos are completed and not in retake mode

    if (!isValidFace) {
        setError("Please remove obstructions and ensure only one face is visible");
        return;
    }
    if (allPhotosCompleted && !isRetakeMode) return;
    const now = Date.now();
    const timeSinceLastCapture = now - lastCaptureTime;
    if (!isAligned || isCoolingDown || timeSinceLastCapture < 3000) return; // Prevent capture if all photos are done
    setIsCoolingDown(true);
    setLastCaptureTime(now);

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
      const cropY = (canvas.height - faceHeight) * 0.65; //  from top

      // Set cropped canvas size
      cropCanvas.width = faceWidth;
      cropCanvas.height = faceHeight;

      // Draw cropped portion
      // cropCtx.filter = `brightness(1.0) contrast(0.8)`; // before drawImage
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

      // Play the capture sound
      audioRef.current.currentTime = 0; // Rewind to start
      audioRef.current
        .play()
        .catch((e) => console.log("Audio play failed:", e));

      // Add suffix to indicate spectacles status
      const orientationName = wearsSpectacles
        ? `${ORIENTATION_SEQUENCE[currentOrientation].name}_${
            capturePhase === "withSpectacles" ? "with" : "without"
          }_spectacles`
        : ORIENTATION_SEQUENCE[currentOrientation].name;

      if (isRetakeMode && retakeIndex !== null) {
        // Replace the photo at retakeIndex
        const newPhotos = [...photos];
        newPhotos[retakeIndex] = {
          orientation: orientationName,
          image: photo,
          phase: capturePhase,
        };
        setPhotos(newPhotos);

        // Exit retake mode
        setIsRetakeMode(false);
        setRetakeIndex(null);

        setAllPhotosCompleted(true);
      } else {
        setPhotos([
          ...photos,
          {
            orientation: orientationName,
            image: photo,
            phase: capturePhase,
          },
        ]);

        // Check if we've completed all required photos
        const completedWithSpectacles =
          wearsSpectacles &&
          capturePhase === "withSpectacles" &&
          currentOrientation === ORIENTATION_SEQUENCE.length - 1;

        const completedWithoutSpectacles =
          wearsSpectacles &&
          capturePhase === "withoutSpectacles" &&
          currentOrientation === ORIENTATION_SEQUENCE.length - 1;

        const completedNonSpectacles =
          !wearsSpectacles &&
          currentOrientation === ORIENTATION_SEQUENCE.length - 1;

        if (completedWithSpectacles) {
          setShowRemoveSpectaclesPrompt(true);
          setCurrentOrientation(0);
        } else if (completedWithoutSpectacles || completedNonSpectacles) {
          setAllPhotosCompleted(true);
        } else if (currentOrientation < ORIENTATION_SEQUENCE.length - 1) {
          setCurrentOrientation(currentOrientation + 1);
        }
      }

      // After successful capture
      setTimeout(() => {
        setIsCoolingDown(false);
      }, 3000); // 3 second cooldown
    }
  };

  const handleContinueWithoutSpectacles = () => {
    setCapturePhase("withoutSpectacles");
    setShowRemoveSpectaclesPrompt(false);
    setAllPhotosCompleted(false); // Reset for the without-spectacles phase
  };


  const retakePhoto = (index) => {
    // Find the photo to retake
    const photoToRetake = photos[index];

    // Determine the orientation index based on the photo's orientation name
    let orientationIndex = ORIENTATION_SEQUENCE.findIndex((orientation) =>
      photoToRetake.orientation.includes(orientation.name)
    );

    if (orientationIndex === -1) {
      orientationIndex = 0; // Default to first orientation if not found
    }

    // Set retake mode state
    setIsRetakeMode(true);
    setRetakeIndex(index);

    // Set the appropriate state for retaking
    setCurrentOrientation(orientationIndex);

    if (wearsSpectacles) {
      setCapturePhase(photoToRetake.phase);
    }
  };

  // Auto-capture logic
  useEffect(() => {
    // Clear any existing timers when conditions aren't met
    if (
      !autoCaptureMode ||
      !isAligned ||
      !isLightingGood ||
      showRemoveSpectaclesPrompt ||
      isCoolingDown ||
      !isWhiteBg ||
       !isValidFace
    ) {
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
        setCountdown(null);
      }
      if (alignmentTimer.current) {
        clearTimeout(alignmentTimer.current);
      }
      return;
    }

    //  cooldown period
    const now = Date.now();
    if (now - lastCaptureTime < 3000) {
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
        setCountdown(null);
      }
      return;
    }

    // Clear any existing timers before starting new ones
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
    }
    if (alignmentTimer.current) {
      clearTimeout(alignmentTimer.current);
    }

    // Start fresh countdown
    setCountdown(captureDelay);
    countdownTimer.current = setInterval(() => {
      setCountdown((prev) => {
        const newCount = prev - 1;
        if (newCount <= 0) {
          clearInterval(countdownTimer.current);
          return null;
        }
        return newCount;
      });
    }, 1000);

    // Set timer for actual capture
    alignmentTimer.current = setTimeout(() => {
      // Verify conditions again before capturing (they might have changed during countdown)
      if (isAligned && !isCoolingDown && now - lastCaptureTime >= 3000) {
        capturePhoto();
      }
    }, captureDelay * 1000);

    return () => {
      clearTimeout(alignmentTimer.current);
      clearInterval(countdownTimer.current);
    };
  }, [
    isAligned,
    currentOrientation,
    capturePhase,
    autoCaptureMode,
    isCoolingDown,
    lastCaptureTime,
    captureDelay,
    isRetakeMode,
    isLightingGood,
    isWhiteBg,
  ]);



  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 2,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    // Add this utility function to check for occlusions
   const checkFaceOcclusion = (landmarks) => {
  const noseToChinDist = Math.abs(landmarks[1].y - landmarks[199].y);
  const eyeDist = Math.abs(landmarks[133].x - landmarks[362].x);

  const faceWidth = Math.abs(landmarks[234].x - landmarks[454].x); // full face width
  console.log("Face Width:", faceWidth);

  console.log("Nose-Chin:", noseToChinDist);
  console.log("Eye Distance:", eyeDist);

  const minNoseChinDist = 0.08;
  const minEyeDist = 0.07;

  const isOccluded = noseToChinDist < minNoseChinDist || eyeDist < minEyeDist;
  console.log("Occlusion detected:", isOccluded);
  return isOccluded;
};



    faceMesh.onResults((results) => {
      const overlayCtx = overlayCanvasRef.current.getContext("2d");
      const width = overlayCanvasRef.current.width;
      const height = overlayCanvasRef.current.height;

      // Clear previous drawings
      overlayCtx.clearRect(
        0,
        0,
        overlayCanvasRef.current.width,
        overlayCanvasRef.current.height
      );

        setIsValidFace(true);
        setError(null);


      console.log("faces " + results.multiFaceLandmarks?.length);
      if (results.multiFaceLandmarks?.length > 1) {
        alert("Occlusion occured or multiple faces detected.");
        setIsValidFace(false);
        return;
      }

   if (results.multiFaceLandmarks?.length > 0) {
  const landmarks = results.multiFaceLandmarks[0];
  console.log("total", landmarks.length);

  try {
    const isOccluded = checkFaceOcclusion(landmarks);
    if (isOccluded) {
      setIsValidFace(false);
      setError("Please remove obstructions from your face");
      console.warn("Occluded, exiting early");
      return;
    }

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

    const { isBright, luminance } = checkLightingCondition(
      webcamRef.current?.video,
      landmarks
    );
    setIsLightingGood(isBright);
    setAvgLuminance(luminance);

    const isWhiteBackground = checkBackgroundIsWhite(
      webcamRef.current?.video
    );
    setIsWhiteBg(isWhiteBackground);

    drawAlignmentMask(
      overlayCtx,
      overlayCanvasRef.current.width,
      overlayCanvasRef.current.height,
      aligned,
      countdownRef.current
    );
  } catch (error) {
    console.error("Error during face processing:", error);
  }
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

    return () => {
      camera?.stop();
      if (alignmentTimer.current) {
        clearTimeout(alignmentTimer.current);
      }
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
      }
    };
  }, [currentOrientation]);


  useEffect(() => {
  countdownRef.current = countdown;
}, [countdown]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  // Determine if all required photos have been captured
  const allPhotosCaptured = wearsSpectacles
    ? photos.length === ORIENTATION_SEQUENCE.length * 2
    : photos.length === ORIENTATION_SEQUENCE.length;

  return (
    <div className="camera-container">
      <h4>Roll Number: {rollNumber}</h4>

      <div className="controls">
        <label style={{ color: "green", fontSize: "130%", cursor: 'pointer'}}>
          Start Capturing-
          <input
            type="checkbox"
            checked={autoCaptureMode}
            onChange={() => setAutoCaptureMode(!autoCaptureMode)}
          />
        </label>
      </div>

      {wearsSpectacles && (
        <div className="spectacles-status">
          <h3>
            {" "}
            {showRemoveSpectaclesPrompt
              ? "Remove Spectacles"
              : capturePhase === "withSpectacles"
              ? " Wear Spectacles & ensure no glare on spectacles"
              : " Remove Spectacles"}
          </h3>
        </div>
      )}

      <p style={{ color: "#f55555", fontSize: "150%" }}>
        <strong>Hold camera at eye level</strong>
      </p>

      {showRemoveSpectaclesPrompt && (
        <div className="remove-spectacles-prompt">
          <h2>Remove your spectacles</h2>
          <p> Capture the same orientations without spectacles</p>
          <button onClick={handleContinueWithoutSpectacles}>
            Continue Without Spectacles
          </button>
        </div>
      )}

      <div
        className="video-wrapper camera-area"
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
            // filter: `brightness(1.2) contrast(1.1)`,
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
        {/* <p>
          Pitch: {angles.pitch.toFixed(1)}° | Yaw: {angles.yaw.toFixed(1)}° |
          Roll: {angles.roll.toFixed(1)}°
        </p> */}
        <h3
          style={{
            color: "#4CAF50",
            fontSize: "1.35rem",
            fontWeight: 600,
            margin: "0.5em 0",
          }}
        >
          <strong>{ORIENTATION_SEQUENCE[currentOrientation].name}</strong>
        </h3>
        <p style={{ color: "red", fontSize: "135%" }}>
        Status:
        {isAligned
            ? isCoolingDown
            ? "Hold on saving..."
            : autoCaptureMode
            ? ` Hold this position - Capturing in ${countdown || captureDelay}s`
            : " Ready to Capture"
            : " Adjust your face"}
        </p>


        <p style={{ color: avgLuminance < 60 ? "orange" : "green" }}>
          Lighting: {avgLuminance} / 120
        </p>

        {isCoolingDown && (
          <p className="cooldown-message">Wait moving to next orientation.</p>
        )}

        {!isLightingGood && (
          <p style={{ color: "orange" }}>
            Low lighting detected. Please move to a brighter area.
          </p>
        )}

        {!isWhiteBg && (
          <p style={{ color: "red" }}>Background is not white enough.</p>
        )}
             
             


        {/* {faceDistance && (
          <>
            <p>Distance: {faceDistance.toFixed(1)} cm</p>
            {!isOptimalDistance(faceDistance) && (
              <p style={{ color: "orange" }}>
                Hold the phone 60-80cm from your face
              </p>
            )}
          </>
        )} */}
      </div>


      {allPhotosCompleted && !isRetakeMode && (
        <div className="completion-message">
          <h2> Upload images from below button</h2>
          <p>You can retake any photo by clicking the retake button</p>
        </div>
      )}
      {isRetakeMode && (
        <div className="retake-message">
          <h3>Retaking: {photos[retakeIndex]?.orientation}</h3>
          <p>Adjust your face to retake this photo</p>
        </div>
      )}

      <div className="photo-grid">
        {photos.map((photo, i) => (
          <div
            key={i}
            style={{
              margin: "10px",
              textAlign: "center",
              position: "relative",
            }}
          >
            <div style={{ position: "relative", display: "inline-block" }}>
              <img
                src={photo.image}
                alt={photo.orientation}
                style={{
                  width: "120px",
                  height: "156px",
                  objectFit: "cover",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  opacity: isRetakeMode && retakeIndex === i ? 0.7 : 1,
                }}
              />
              {(allPhotosCompleted || isRetakeMode) && (
                <button
                  onClick={() => retakePhoto(i)}
                  className="retake-button"
                  style={{
                    position: "absolute",
                    top: "5px",
                    right: "5px",
                    backgroundColor: "rgba(255, 255, 255, 0.7)",
                    border: "none",
                    borderRadius: "50%",
                    width: "30px",
                    height: "30px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Retake this photo"
                  disabled={isRetakeMode && retakeIndex !== i}
                >
                  <i className="fas fa-redo" style={{ fontSize: "14px" }}></i>
                </button>
              )}
            </div>
            <p style={{ marginTop: "5px" }}>{photo.orientation}</p>
          </div>
        ))}
      </div>

        {allPhotosCaptured && (
        <GoogleDriveUploadButton 
            photos={photos}
            rollNumber={rollNumber}
            allPhotosCaptured={allPhotosCaptured}
        />
        )}
      <br></br>
      <br></br>
      <a href="https://forms.gle/zdeXfJDn5HBT3Wa88">
        <button>
          <strong>Feedback form</strong>
        </button>
      </a>
    </div>
  );
}
