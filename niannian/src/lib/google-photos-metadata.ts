/**
 * Google Photos 官方导出（Takeout）JSON 元数据解析
 * 支持 .json 与 .supplemental-metadata.json（含截断文件名）
 */

export interface GooglePhotosMetadata {
  title?: string;
  description?: string;
  photoTakenTime?: { timestamp?: string; formatted?: string };
  creationTime?: { timestamp?: string; formatted?: string };
  geoData?: { latitude?: number; longitude?: number; altitude?: number };
  geoDataExif?: { latitude?: number; longitude?: number; altitude?: number };
  people?: Array<{ name?: string }>;
  favorited?: boolean;
  googlePhotosOrigin?: {
    mobileUpload?: { deviceType?: string; deviceFolder?: { localFolderName?: string } };
  };
}

/** 从 JSON 提取的标准化「原始事实」 */
export interface PhotoSourceFacts {
  source: 'google_photos';
  title: string;
  takenAt: string;
  takenAtFormatted: string;
  uploadedAt: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  description: string;
  deviceType: string;
  people: string[];
  favorited: boolean;
  raw: GooglePhotosMetadata;
}

const JSON_SUFFIXES = [
  '.supplemental-metadata.json',
  '.supplemental-metadat.json',
  '.supplemental-met.json',
  '.supplemental-me.json',
  '.supplementa.json',
  '.json',
];

export function isGooglePhotosJsonFile(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith('.json') && !lower.endsWith('.json.json');
}

export function isImageFile(name: string): boolean {
  return /\.(jpe?g|png|heic|heif|webp|gif|bmp|tiff?)$/i.test(name);
}

/** 从 JSON 文件名推断对应的照片文件名 */
export function photoNameFromJsonFile(jsonFileName: string): string {
  let base = jsonFileName;
  for (const suffix of JSON_SUFFIXES) {
    if (base.toLowerCase().endsWith(suffix)) {
      base = base.slice(0, -suffix.length);
      break;
    }
  }
  return base;
}

export function parseGooglePhotosJson(content: string): GooglePhotosMetadata | null {
  try {
    const data = JSON.parse(content) as GooglePhotosMetadata;
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}

function normalizeFileName(name: string): string {
  return name.trim().toLowerCase();
}

/** 判断 JSON 侧车文件是否与照片匹配 */
export function matchJsonToPhoto(
  photoFileName: string,
  jsonFileName: string,
  jsonContent?: GooglePhotosMetadata
): boolean {
  const photoNorm = normalizeFileName(photoFileName);
  const inferredPhoto = normalizeFileName(photoNameFromJsonFile(jsonFileName));

  if (photoNorm === inferredPhoto) return true;
  if (photoNorm.startsWith(inferredPhoto) || inferredPhoto.startsWith(photoNorm.replace(/\.[^.]+$/, ''))) {
    return true;
  }
  if (jsonContent?.title && normalizeFileName(jsonContent.title) === photoNorm) {
    return true;
  }
  // 截断文件名：比较无扩展名前缀
  const photoStem = photoNorm.replace(/\.[^.]+$/, '');
  const jsonStem = inferredPhoto.replace(/\.[^.]+$/, '');
  if (photoStem.length >= 8 && jsonStem.length >= 8) {
    if (photoStem.startsWith(jsonStem) || jsonStem.startsWith(photoStem)) return true;
  }
  return false;
}

export function extractPhotoSourceFacts(meta: GooglePhotosMetadata): PhotoSourceFacts {
  const geo = meta.geoDataExif?.latitude ? meta.geoDataExif : meta.geoData;
  const lat = geo?.latitude && geo.latitude !== 0 ? geo.latitude : null;
  const lng = geo?.longitude && geo.longitude !== 0 ? geo.longitude : null;
  const alt = geo?.altitude && geo.altitude !== 0 ? geo.altitude : null;

  const takenFormatted = meta.photoTakenTime?.formatted || '';
  const takenTimestamp = meta.photoTakenTime?.timestamp || '';

  let location = '';
  if (lat !== null && lng !== null) {
    location = formatCoordinates(lat, lng);
  }

  const people = (meta.people || [])
    .map((p) => p.name?.trim())
    .filter((n): n is string => !!n);

  return {
    source: 'google_photos',
    title: meta.title || '',
    takenAt: takenTimestamp,
    takenAtFormatted: takenFormatted,
    uploadedAt: meta.creationTime?.formatted || '',
    location,
    latitude: lat,
    longitude: lng,
    altitude: alt,
    description: (meta.description || '').trim(),
    deviceType: meta.googlePhotosOrigin?.mobileUpload?.deviceType || '',
    people,
    favorited: !!meta.favorited,
    raw: meta,
  };
}

/** 将 Google Photos 原始事实转为 AI prompt 上下文 */
export function buildSourceFactsPrompt(facts: PhotoSourceFacts): string {
  const lines: string[] = ['以下是从 Google Photos 官方导出 JSON 还原的原始信息（请优先采用，不要与之矛盾）：'];
  if (facts.takenAtFormatted) lines.push(`- 拍摄时间：${facts.takenAtFormatted}`);
  if (facts.location) lines.push(`- 拍摄地点（GPS）：${facts.location}`);
  if (facts.description) lines.push(`- 用户描述：${facts.description}`);
  if (facts.people.length > 0) lines.push(`- 标注人物：${facts.people.join('、')}`);
  if (facts.deviceType) lines.push(`- 拍摄设备：${facts.deviceType}`);
  if (facts.favorited) lines.push('- 用户在 Google Photos 中标记为收藏');
  return lines.join('\n');
}

/** 从原始事实生成客观层标签 */
export function sourceFactsToTags(facts: PhotoSourceFacts): Array<{ layer: number; key: string; value: string }> {
  const tags: Array<{ layer: number; key: string; value: string }> = [];
  if (facts.takenAtFormatted) {
    tags.push({ layer: 1, key: '时间', value: facts.takenAtFormatted });
  }
  if (facts.location) {
    tags.push({ layer: 1, key: '地点', value: facts.location });
  }
  for (const person of facts.people) {
    tags.push({ layer: 1, key: '人物', value: person });
  }
  if (facts.description) {
    tags.push({ layer: 1, key: '描述', value: facts.description.slice(0, 50) });
  }
  if (facts.deviceType) {
    tags.push({ layer: 1, key: '设备', value: facts.deviceType });
  }
  return tags;
}

/** 在批量上传中，为照片找到匹配的 JSON 元数据 */
export function findMetadataForPhoto(
  photoFileName: string,
  jsonEntries: Array<{ fileName: string; facts: PhotoSourceFacts }>
): PhotoSourceFacts | null {
  for (const entry of jsonEntries) {
    if (matchJsonToPhoto(photoFileName, entry.fileName, entry.facts.raw)) {
      return entry.facts;
    }
  }
  return null;
}
