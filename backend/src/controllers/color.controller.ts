import { Request, Response } from 'express';
import sharp from 'sharp';

export async function analizarColor(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No se ha subido ningún archivo de imagen.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { x: rawX, y: rawY, width: rawWidth, height: rawHeight } = req.body;
    if (rawX === undefined || rawY === undefined || rawWidth === undefined || rawHeight === undefined) {
      res.status(400).json({
        success: false,
        message: 'Las coordenadas del área seleccionada (x, y, width, height) son obligatorias.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const buffer = req.file.buffer;
    const metadata = await sharp(buffer).metadata();

    const imgWidth = metadata.width || 0;
    const imgHeight = metadata.height || 0;

    if (imgWidth === 0 || imgHeight === 0) {
      res.status(400).json({
        success: false,
        message: 'No se pudo leer las dimensiones de la imagen.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Parse and clamp coordinates to image dimensions
    let x = Math.max(0, Math.min(imgWidth, Math.round(parseFloat(String(rawX)))));
    let y = Math.max(0, Math.min(imgHeight, Math.round(parseFloat(String(rawY)))));
    let width = Math.max(1, Math.min(imgWidth - x, Math.round(parseFloat(String(rawWidth)))));
    let height = Math.max(1, Math.min(imgHeight - y, Math.round(parseFloat(String(rawHeight)))));

    // Extract selected region
    const croppedSharp = sharp(buffer).extract({ left: x, top: y, width, height });

    // Calculate average RGB values
    const { data: pixelBuffer, info } = await croppedSharp.clone().raw().toBuffer({ resolveWithObject: true });
    
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    const totalPixels = info.width * info.height;
    const channels = info.channels;

    for (let i = 0; i < pixelBuffer.length; i += channels) {
      sumR += pixelBuffer[i];
      sumG += pixelBuffer[i + 1];
      sumB += pixelBuffer[i + 2];
    }

    const r = Math.round(sumR / totalPixels);
    const g = Math.round(sumG / totalPixels);
    const b = Math.round(sumB / totalPixels);

    // Convert average RGB to hex code
    const toHex = (val: number) => val.toString(16).padStart(2, '0').toUpperCase();
    const colorHex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

    // Resize cropped region to thumbnail (maximum 200x200px)
    const miniaturaBuffer = await croppedSharp
      .resize({
        width: 200,
        height: 200,
        fit: 'inside', // preserves aspect ratio
      })
      .toFormat('jpeg')
      .toBuffer();

    const miniaturaBase64 = `data:image/jpeg;base64,${miniaturaBuffer.toString('base64')}`;

    // Return the response as requested:
    res.status(200).json({
      colorHex,
      colorRgb: { r, g, b },
      miniaturaBase64,
    });
  } catch (error) {
    console.error('[analizarColor] Error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error interno al procesar la imagen.',
      timestamp: new Date().toISOString(),
    });
  }
}
