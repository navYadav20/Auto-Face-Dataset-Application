import React, { useState } from 'react';
import './Home.css';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [rollNumber, setRollNumber] = useState('');
  const [wearsSpectacles, setWearsSpectacles] = useState(false);
  let navigate = useNavigate();

  //   const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU...");
  // audio.play().then(() => audio.pause());

  const handleStartCamera = () => {
    if (!rollNumber) {
      alert('Please enter your roll number / Name');
      return;
    } else {
      navigate('/capture', {
        state: {
          rollNumber,
          wearsSpectacles,
        },
      });
    }
  };

  return (
    <div className='photo-container'>
      <h1>
        Dataset <span>App</span>
      </h1>
      <label style={{ color: "black", fontSize: "120%" }}>
       Enter Roll Number or Name:
        <input
          type='text'
          placeholder='Enter your roll number / Name'
          value={rollNumber}
          onChange={(e) => setRollNumber(e.target.value)}
        />
      </label>

      <h4  style={{ color: "red", fontSize: "125%" }}> Instructions </h4>
  
      <p style={{ color: "blue", fontSize: "120%" }}> 1. Ensure no glare on spectacles</p>
      <p style={{ color: "blue", fontSize: "120%" }}> 2. Hold mobile at eye level</p>
      <p  style={{ color: "blue", fontSize: "120%" }}>2. Use white-colored background and good lighting on face</p>
      <p  style={{ color: "blue", fontSize: "120%" }}>3. Capture 5 images or 10 images for who wear spectacles</p>

      <div className='checkbox-container'>
        <input
          type='checkbox'
          checked={wearsSpectacles}
          onChange={() => setWearsSpectacles(!wearsSpectacles)}
          id='spectacles'
        />
        <label htmlFor='spectacles' style={{ color: "red", fontSize: "130%", cursor: 'pointer'}}>Do you wear spectacles</label>
      </div>

      <button onClick={handleStartCamera} className='camera' style={{ color: "blue", fontSize: "120%" }}>Start Capture</button>
    </div>
  );
};

export default Home;
