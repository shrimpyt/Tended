export async function compressImage(file: File, maxSizeMB: number = 0.4): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Max dimension for the longest side to keep sizes reasonable
        // 800px ensures small payloads (<500KB) to avoid Edge Function limits and timeouts
        const maxDimension = 800;
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context is not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert back to base64, target JPEG format with a quality parameter (e.g. 0.7 for 70%)
        let quality = 0.8;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Estimate size in MB
        let sizeMB = getBase64SizeInMB(dataUrl);

        // Reduce quality if still too large (basic compression loop)
        while (sizeMB > maxSizeMB && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          sizeMB = getBase64SizeInMB(dataUrl);
        }

        // Return base64 string without the 'data:image/jpeg;base64,' prefix
        const base64Data = dataUrl.split(',')[1];
        resolve(base64Data);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      if (event.target?.result) {
        img.src = event.target.result as string;
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function getBase64SizeInMB(base64: string): number {
  // Approximate size of base64 string in bytes
  // Formula: length * (3/4) - padding
  let padding = 0;
  if (base64.endsWith('==')) padding = 2;
  else if (base64.endsWith('=')) padding = 1;

  const length = base64.length;
  const sizeInBytes = (length * 3) / 4 - padding;
  return sizeInBytes / (1024 * 1024);
}
