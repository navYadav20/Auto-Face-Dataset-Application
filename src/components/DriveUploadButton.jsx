import React, { useState } from 'react';
import { uploadToGoogleDrive } from '../utils/DriveUpload';

const GoogleDriveUploadButton = ({ photos, rollNumber, allPhotosCaptured }) => {
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('Starting upload');

    try {
      const updateProgress = (progress, status) => {
        setUploadProgress(progress);
        setUploadStatus(status);
      };

      await uploadToGoogleDrive(photos, rollNumber, updateProgress);
      
      // Optional: Add a small delay before resetting to show completion
      setTimeout(() => {
        setIsUploading(false);
      }, 2000);
      
    } catch (error) {
      setUploadStatus(`Error: ${error.message}`);
      setIsUploading(false);
    }
  };

  return (
    <div className="upload-container">
      {allPhotosCaptured && (
        <>
          <button
            onClick={handleUpload}
            className="save-button"
            disabled={isUploading}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              backgroundColor: isUploading ? "#cccccc" : "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isUploading ? "not-allowed" : "pointer",
            }}
          >
            {isUploading ? 'Uploading...' : 'Save to drive'}
          </button>
          
          {isUploading && (
            <div className="upload-progress" style={{ marginTop: '10px' }}>
              <div style={{ 
                width: '100%',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px',
                height: '20px'
              }}>
                <div
                  style={{
                    width: `${uploadProgress}%`,
                    backgroundColor: uploadProgress === 100 ? '#4CAF50' : '#2196F3',
                    height: '100%',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }}
                ></div>
              </div>
              <div style={{ 
                marginTop: '5px',
                fontSize: '14px',
                color: uploadProgress === 100 ? '#4CAF50' : '#333'
              }}>
                {uploadStatus}
              </div>
            </div>
          )}
          
          {uploadStatus.startsWith('Error:') && (
            <div style={{ 
              marginTop: '10px',
              color: '#f44336',
              fontSize: '14px'
            }}>
              {uploadStatus}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GoogleDriveUploadButton;