import Phaser from 'phaser';
import type { FixedObjectInstance, FixedObjectReaction } from './sceneDefinitions';
import type { InteractionZone } from './types';

export type FixedObjectGameObject = Phaser.GameObjects.GameObject & {
  x: number;
  y: number;
  setTint?: (tint: number) => unknown;
  clearTint?: () => unknown;
};

export class FixedObjectSystem {
  private fixedObjects: FixedObjectInstance[] = [];

  clear(): void {
    this.fixedObjects = [];
  }

  register(id: string, object: FixedObjectGameObject, zone: InteractionZone, scale: number, reaction: FixedObjectReaction): void {
    this.fixedObjects.push({ id, object, zone, scale, reaction, lastTriggeredAt: 0 });
  }

  updateHover(x: number, y: number): void {
    for (const fixedObject of this.fixedObjects) {
      const active = isInsideZone(x, y, fixedObject.object.x, fixedObject.object.y, fixedObject.zone, fixedObject.scale);
      if (active) fixedObject.object.setTint?.(0xfff3a3);
      else fixedObject.object.clearTint?.();
    }
  }

  clearHover(): void {
    for (const fixedObject of this.fixedObjects) {
      fixedObject.object.clearTint?.();
    }
  }

  findTriggeredObject(x: number, y: number, now: number, globalCooldownAt: number): FixedObjectInstance | undefined {
    if (now - globalCooldownAt < 350) return undefined;

    for (const fixedObject of this.fixedObjects) {
      if (now - fixedObject.lastTriggeredAt < 900) continue;
      if (!isInsideZone(x, y, fixedObject.object.x, fixedObject.object.y, fixedObject.zone, fixedObject.scale)) continue;
      fixedObject.lastTriggeredAt = now;
      return fixedObject;
    }

    return undefined;
  }
}

function isInsideZone(
  characterX: number,
  characterY: number,
  objectX: number,
  objectY: number,
  zone: InteractionZone,
  objectScale: number
): boolean {
  const zoneCenterX = objectX + zone.x * objectScale;
  const zoneCenterY = objectY + zone.y * objectScale;
  const halfWidth = (zone.width * objectScale) / 2;
  const halfHeight = (zone.height * objectScale) / 2;

  if (zone.shape === 'rectangle') {
    return Math.abs(characterX - zoneCenterX) <= halfWidth && Math.abs(characterY - zoneCenterY) <= halfHeight;
  }

  const normalizedX = (characterX - zoneCenterX) / halfWidth;
  const normalizedY = (characterY - zoneCenterY) / halfHeight;
  return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
}
