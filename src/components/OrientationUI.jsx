export default function OrientationUI({ angles, isAligned }) {
  const { yaw, pitch, roll } = angles

  return (
    <div className="orientation-feedback">
      <div className={`arrow-left ${yaw > 20 ? 'active' : ''}`}>←</div>
      <div className={`arrow-right ${yaw < -20 ? 'active' : ''}`}>→</div>
      <p>Yaw: {yaw.toFixed(1)}°</p>
      <p>Status: {isAligned ? 'Ready to Capture!' : 'Adjust your face'}</p>
    </div>
//     <div className="angle-debug">
//     <p>Yaw: {angles.yaw.toFixed(1)}°</p>
//     <p>Pitch: {angles.pitch.toFixed(1)}°</p>
//     <p>Roll: {angles.roll.toFixed(1)}°</p>
//     <p>Target: {ORIENTATION_SEQUENCE[currentOrientation].name}</p>
// </div>
  )
}