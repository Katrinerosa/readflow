import { defineOperationApi } from '@directus/extensions-sdk';
import { Readable } from 'stream';

interface OperationOptions {
  base64Data: string;
  title?: string;
  folder?: string;
}

interface Base64ParseResult {
  mimeType: string;
  extension: string;
  buffer: Buffer;
}

function parseBase64(dataString: string): Base64ParseResult {
  // Check if it's a data URI
  const dataUriMatch = dataString.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);

  if (dataUriMatch) {
    const mimeType = dataUriMatch[1];
    const base64Data = dataUriMatch[2];
    const extension = mimeType.split('/')[1]?.replace('+xml', '') || 'bin';

    return {
      mimeType,
      extension,
      buffer: Buffer.from(base64Data, 'base64'),
    };
  }

  // Plain base64 string - try to detect type from magic bytes
  const buffer = Buffer.from(dataString, 'base64');
  const { mimeType, extension } = detectFileType(buffer);

  return { mimeType, extension, buffer };
}

function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start
    .replace(/-+$/, ''); // Trim - from end
}

function detectFileType(buffer: Buffer): { mimeType: string; extension: string } {
  // Check magic bytes for common file types

  // Images
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { mimeType: 'image/png', extension: 'png' };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return { mimeType: 'image/gif', extension: 'gif' };
  }

  // RIFF container (WebP or WAV)
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    // Check bytes 8-11 for format
    if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return { mimeType: 'image/webp', extension: 'webp' };
    }
    if (buffer[8] === 0x57 && buffer[9] === 0x41 && buffer[10] === 0x56 && buffer[11] === 0x45) {
      return { mimeType: 'audio/wav', extension: 'wav' };
    }
    // Default RIFF to WAV
    return { mimeType: 'audio/wav', extension: 'wav' };
  }

  // Audio formats
  // MP3 with ID3 tag
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    return { mimeType: 'audio/mpeg', extension: 'mp3' };
  }
  // MP3 without ID3 tag (frame sync)
  if (buffer[0] === 0xff && (buffer[1] === 0xfb || buffer[1] === 0xfa || buffer[1] === 0xf3 || buffer[1] === 0xf2 || buffer[1] === 0xe3)) {
    return { mimeType: 'audio/mpeg', extension: 'mp3' };
  }
  // OGG (Vorbis/Opus)
  if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
    return { mimeType: 'audio/ogg', extension: 'ogg' };
  }
  // FLAC
  if (buffer[0] === 0x66 && buffer[1] === 0x4c && buffer[2] === 0x61 && buffer[3] === 0x43) {
    return { mimeType: 'audio/flac', extension: 'flac' };
  }

  // Documents
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { mimeType: 'application/pdf', extension: 'pdf' };
  }

  // MP4/M4A/MOV (ftyp container)
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    const brand = buffer.slice(8, 12).toString('ascii');
    if (brand.startsWith('M4A') || brand.startsWith('M4B')) {
      return { mimeType: 'audio/mp4', extension: 'm4a' };
    }
    return { mimeType: 'video/mp4', extension: 'mp4' };
  }

  // Default to binary
  return { mimeType: 'application/octet-stream', extension: 'bin' };
}

export default defineOperationApi<OperationOptions>({
  id: 'base64-upload',
  handler: async (options, context) => {
    const { services, getSchema, accountability, env, logger } = context;
    const { FilesService } = services;

    // Validate required inputs
    if (!options.base64Data) {
      throw new Error('Base64 data is required');
    }

    // Parse the base64 data
    const { mimeType, extension, buffer } = parseBase64(options.base64Data);

    // Determine filename from title (slugify and add extension)
    let filename: string;
    if (options.title) {
      const slugifiedName = slugify(options.title);
      filename = `${slugifiedName || 'file'}.${extension}`;
    } else {
      filename = `upload-${Date.now()}.${extension}`;
    }

    // Use default storage location
    const storageLocations = (env['STORAGE_LOCATIONS'] as string || 'local').split(',');
    const storage = storageLocations[0].trim();

    // Create a readable stream from the buffer
    const stream = Readable.from(buffer);

    // Initialize FilesService with schema and accountability
    const schema = await getSchema();
    const filesService = new FilesService({
      schema,
      accountability,
    });

    // Prepare file metadata
    const fileData: Record<string, any> = {
      storage,
      filename_download: filename,
      type: mimeType,
    };

    // Add optional fields
    if (options.folder) {
      fileData.folder = options.folder;
    }
    if (options.title) {
      fileData.title = options.title;
    }

    logger.info(`Uploading base64 file: ${filename} (${mimeType}, ${buffer.length} bytes)`);

    // Upload the file
    const fileId = await filesService.uploadOne(stream, fileData);

    logger.info(`File uploaded successfully: ${fileId}`);

    // Return comprehensive output for use in subsequent flow operations
    // Access in flow as: {{$last.id}} or {{operation_key.id}}
    return {
      id: fileId,
      filename_disk: filename,
      filename_download: filename,
      title: options.title || null,
      type: mimeType,
      filesize: buffer.length,
      folder: options.folder || null,
    };
  },
});
