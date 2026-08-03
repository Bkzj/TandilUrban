const MAX_LABEL_LENGTH = 32;

type HeaderRecord = Record<string, string | string[] | undefined>;

function cleanLabel(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/gu, '').slice(0, MAX_LABEL_LENGTH);
}

export function sessionMetadataFromHeaders(headers: HeaderRecord | undefined) {
  const value = headers?.['user-agent'];
  return coarseSessionMetadata(Array.isArray(value) ? value[0] : value);
}

export function coarseSessionMetadata(userAgent: string | null | undefined): {
  browser: string;
  operatingSystem: string;
} {
  const value = (userAgent ?? '').slice(0, 512);
  const browser = /Edg\//u.test(value) ? 'Edge'
    : /OPR\//u.test(value) ? 'Opera'
      : /Firefox\//u.test(value) ? 'Firefox'
        : /CriOS\//u.test(value) ? 'Chrome'
          : /Chrome\//u.test(value) ? 'Chrome'
            : /Safari\//u.test(value) ? 'Safari'
              : 'Navegador desconocido';
  const operatingSystem = /iPhone|iPad|iPod/u.test(value) ? 'iOS'
    : /Android/u.test(value) ? 'Android'
      : /Windows NT/u.test(value) ? 'Windows'
        : /Mac OS X|Macintosh/u.test(value) ? 'macOS'
          : /Linux/u.test(value) ? 'Linux'
            : 'Sistema desconocido';
  return { browser: cleanLabel(browser), operatingSystem: cleanLabel(operatingSystem) };
}
