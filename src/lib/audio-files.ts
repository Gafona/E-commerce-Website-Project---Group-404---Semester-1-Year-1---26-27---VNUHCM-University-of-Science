/** Some licensed music hosts send real MP3s as application/octet-stream. */
export function normalizeAudioMime(
  name: string,
  mime: string,
  bytes: Uint8Array,
): string {
  if (mime !== "application/octet-stream" || !/\.mp3$/i.test(name)) return mime
  const id3 =
    bytes.length >= 10 &&
    bytes[0] === 0x49 &&
    bytes[1] === 0x44 &&
    bytes[2] === 0x33
  const mpeg =
    bytes.length >= 4 &&
    bytes[0] === 0xff &&
    (bytes[1] & 0xe0) === 0xe0 &&
    (bytes[1] & 0x06) !== 0 &&
    (bytes[2] & 0xf0) !== 0xf0
  return id3 || mpeg ? "audio/mpeg" : mime
}
