import Phaser from 'phaser';
import type { SpriteManifest } from './types';

const GAME_CHARACTER_SCALE = 0.68;

export function getGameScale(manifest: SpriteManifest): number {
  return manifest.defaultScale * GAME_CHARACTER_SCALE;
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

export function getGravitySettleY(y: number, floorY: number): number {
  return Phaser.Math.Clamp(y, 160, floorY);
}
