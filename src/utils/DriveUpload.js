import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { error } from '@techstark/opencv-js';

export const uploadToGoogleDrive = async (photos, rollNumber, updateProgress) => {
  if (photos.length === 0) {
    throw new Error('No photos to upload');
  }

  // Load Google API if needed
  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google API not loaded');
  }

  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: "44560273362-tj70ij5jpaph6lv014cl22i6d220kq5q.apps.googleusercontent.com",
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: async (tokenResponse) => {
        try {
          updateProgress(10, 'Creating zip file');
          
          // Create ZIP
          const zip = new JSZip();
          const folder = zip.folder(rollNumber);

          await Promise.all(
            photos.map(async (photo, index) => {
              const response = await fetch(photo.image);
              const blob = await response.blob();
              folder.file(`${photo.orientation}_${index + 1}.jpg`, blob);
            })
          );

          updateProgress(30, 'Compressing photos');
          const zipBlob = await zip.generateAsync(
            { type: "blob" },
            (metadata) => {
              updateProgress(
                30 + Math.floor(metadata.percent * 0.6), 
                `Compressing: ${metadata.percent.toFixed(1)}%`
              );
            }
          );

          updateProgress(90, 'Uploading to  Drive...');
          
          // Create metadata for Drive
          const metadata = {
            name: `${rollNumber}.zip`,
            parents: ["1QbNZf9QTAp-ZaLpLC-Wyh2BvEJAWTSCkU1RaGQL0W5kaTECNv6sD6u6FNR7pA-Da3yiqCEYi"],
            mimeType: "application/zip",
          };

          const form = new FormData();
          form.append(
            "metadata",
            new Blob([JSON.stringify(metadata)], { type: "application/json" })
          );
          form.append("file", zipBlob);

          const xhr = new XMLHttpRequest();
          xhr.open(
            "POST",
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
          );
          xhr.setRequestHeader("Authorization", `Bearer ${tokenResponse.access_token}`);

          // Track upload progress
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = 90 + Math.floor((event.loaded / event.total) * 10);
              updateProgress(percent, `Uploading: ${percent}%`);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              updateProgress(100, 'Upload complete');
              alert("Successfully uploaded")
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
          };

          xhr.onerror = () => {
            reject(new Error('Network error during upload'));
          };

          xhr.send(form);

        } catch (error) {
          reject(error);
        }
      },
    });

    tokenClient.requestAccessToken();
  });
};