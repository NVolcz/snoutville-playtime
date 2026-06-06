import type { SpriteManifest } from './types';

const manifestModules = import.meta.glob('../assets/sprite-manifests/**/*.json', {
  eager: true,
  import: 'default'
}) as Record<string, SpriteManifest>;

export const spriteManifests: SpriteManifest[] = Object.values(manifestModules).sort((a, b) =>
  a.displayName.localeCompare(b.displayName)
);

export const characterManifests = spriteManifests.filter((manifest) => manifest.type === 'character');
export const fixedObjectManifests = spriteManifests.filter((manifest) => manifest.type === 'fixed_object');

export function getAssetUrl(path: string): string {
  const normalizedPath = path.replace(/^\/+/, '');
  return `${import.meta.env.BASE_URL}${normalizedPath}`;
}

export function findManifest(id: string): SpriteManifest | undefined {
  return spriteManifests.find((manifest) => manifest.id === id);
}
