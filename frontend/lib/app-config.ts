const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const DATA_MODE = process.env.NEXT_PUBLIC_DATA_MODE === 'static' ? 'static' : 'api';
export const IS_STATIC_DATA_MODE = DATA_MODE === 'static';
export const BASE_PATH = rawBasePath === '/' ? '' : rawBasePath.replace(/\/$/, '');

export function withBasePath(path: string): string {
  if (!BASE_PATH) {
    return path;
  }

  return path.startsWith('/') ? `${BASE_PATH}${path}` : `${BASE_PATH}/${path}`;
}
