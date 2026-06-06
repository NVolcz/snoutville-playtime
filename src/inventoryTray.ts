import type { SpriteManifest } from './types';

export function getAvailableInventoryCharacters(
  characterManifests: SpriteManifest[],
  inventoryCharacterIds: string[],
  activeCharacterIds: Set<string>
): SpriteManifest[] {
  return characterManifests.filter((manifest) => inventoryCharacterIds.includes(manifest.id) && !activeCharacterIds.has(manifest.id));
}
