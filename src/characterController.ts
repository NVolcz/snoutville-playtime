import Phaser from 'phaser';
import type { SpriteManifest } from './types';

const CHARACTER_SCALE_BY_ID: Record<string, number> = {
  george: 0.58,
  peppa: 0.64,
  suzy_sheep: 0.64,
  mummy_pig: 0.72,
  daddy_pig: 0.78,
  grandpa_pig: 0.74,
  madame_gazelle: 0.72
};

export function getGameScale(manifest: SpriteManifest): number {
  return manifest.defaultScale * (CHARACTER_SCALE_BY_ID[manifest.id] ?? 0.68);
}

export function getCharacterShadowSize(manifest: SpriteManifest): { width: number; height: number } {
  const scaleRatio = manifest.defaultScale / 0.42;
  return {
    width: Phaser.Math.Clamp(86 * scaleRatio, 58, 118),
    height: Phaser.Math.Clamp(20 * scaleRatio, 13, 28)
  };
}

export function clampDraggedCharacterPosition(x: number, y: number, worldWidth: number): Phaser.Math.Vector2 {
  return new Phaser.Math.Vector2(Phaser.Math.Clamp(x, 42, worldWidth - 42), y);
}

export function getGravitySettleY(_y: number, floorY: number): number {
  return floorY;
}
