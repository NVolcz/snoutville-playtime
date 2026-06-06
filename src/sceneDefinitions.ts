import Phaser from 'phaser';
import type { InteractionZone } from './types';

export interface SceneCharacterPlacement {
  id: string;
  x: number;
  y: number;
}

export type FixedObjectReaction = 'puddleSplash' | 'sofaBounce' | 'bathBubbles' | 'tableGiggle' | 'chalkScribble' | 'paintSplat' | 'blocksTumble';

export interface FixedObjectInstance {
  id: string;
  object: Phaser.GameObjects.GameObject & { x: number; y: number; setTint?: (tint: number) => unknown; clearTint?: () => unknown };
  zone: InteractionZone;
  scale: number;
  reaction: FixedObjectReaction;
  lastTriggeredAt: number;
}

export interface SceneBuildContext {
  add: Phaser.GameObjects.GameObjectFactory;
  addSceneObject<T extends Phaser.GameObjects.GameObject>(object: T): T;
  createMuddyPuddle(x: number, y: number): void;
  registerFixedObject(
    id: string,
    object: Phaser.GameObjects.GameObject & { x: number; y: number; setTint?: (tint: number) => unknown; clearTint?: () => unknown },
    zone: InteractionZone,
    scale: number,
    reaction: FixedObjectReaction
  ): void;
}

export interface LocationDefinition {
  id: string;
  label: string;
  mapX: number;
  mapY: number;
  worldWidth: number;
  floorY: number;
  defaultCast: SceneCharacterPlacement[];
  drawBackground: (scene: SceneBuildContext) => void;
  createFixedObjects?: (scene: SceneBuildContext) => void;
}

export const locations: LocationDefinition[] = [
  {
    id: 'park',
    label: 'Muddy Puddle Park',
    mapX: 340,
    mapY: 365,
    worldWidth: 2400,
    floorY: 585,
    defaultCast: [
      { id: 'peppa', x: 320, y: 585 },
      { id: 'george', x: 470, y: 585 }
    ],
    drawBackground: (scene) => {
      scene.addSceneObject(scene.add.image(1200, 360, 'background_park').setDisplaySize(2400, 720));
      scene.addSceneObject(scene.add.circle(1030, 115, 62, 0xfff7a8));
      scene.addSceneObject(scene.add.circle(130, 125, 45, 0xffffff, 0.9));
      scene.addSceneObject(scene.add.circle(170, 125, 55, 0xffffff, 0.9));
      scene.addSceneObject(scene.add.circle(215, 125, 40, 0xffffff, 0.9));
      scene.addSceneObject(scene.add.rectangle(1240, 555, 110, 28, 0x8b5a2b).setRotation(-0.15));
      scene.addSceneObject(scene.add.rectangle(1540, 520, 150, 210, 0x7c3f1d));
      scene.addSceneObject(scene.add.circle(1540, 360, 160, 0x2f9e44));
      scene.addSceneObject(scene.add.rectangle(1960, 560, 220, 24, 0x8b5a2b));
      scene.addSceneObject(scene.add.rectangle(1880, 610, 30, 88, 0x8b5a2b));
      scene.addSceneObject(scene.add.rectangle(2040, 610, 30, 88, 0x8b5a2b));
    },
    createFixedObjects: (scene) => scene.createMuddyPuddle(760, 585)
  },
  {
    id: 'house',
    label: 'Family House',
    mapX: 650,
    mapY: 430,
    worldWidth: 2200,
    floorY: 590,
    defaultCast: [
      { id: 'mummy_pig', x: 320, y: 590 },
      { id: 'daddy_pig', x: 500, y: 590 },
      { id: 'peppa', x: 680, y: 590 }
    ],
    drawBackground: (scene) => {
      scene.addSceneObject(scene.add.image(1100, 360, 'background_house').setDisplaySize(2200, 720));
      scene.addSceneObject(scene.add.rectangle(160, 240, 190, 150, 0xffffff, 0.65).setStrokeStyle(4, 0x9cc4e4));
      scene.addSceneObject(scene.add.line(160, 240, -95, 0, 95, 0, 0x9cc4e4).setLineWidth(4));
      scene.addSceneObject(scene.add.line(160, 240, 0, -75, 0, 75, 0x9cc4e4).setLineWidth(4));
      scene.addSceneObject(scene.add.rectangle(760, 360, 220, 80, 0xef4444).setStrokeStyle(4, 0x7f1d1d));
      scene.addSceneObject(scene.add.rectangle(675, 320, 82, 60, 0xfca5a5).setStrokeStyle(3, 0x7f1d1d));
      scene.addSceneObject(scene.add.rectangle(835, 320, 82, 60, 0xfca5a5).setStrokeStyle(3, 0x7f1d1d));
      scene.addSceneObject(scene.add.rectangle(1220, 345, 220, 95, 0x93c5fd).setStrokeStyle(4, 0x1d4ed8));
      scene.addSceneObject(scene.add.rectangle(1370, 310, 90, 170, 0xa16207).setStrokeStyle(4, 0x713f12));
    },
    createFixedObjects: (scene) => {
      const sofa = scene.addSceneObject(scene.add.rectangle(760, 560, 320, 82, 0xef4444).setStrokeStyle(4, 0x7f1d1d));
      scene.registerFixedObject('house_sofa', sofa, createZone('house_sofa_zone', 0, 18, 280, 92), 1, 'sofaBounce');

      const bath = scene.addSceneObject(scene.add.ellipse(1220, 565, 260, 88, 0x93c5fd, 0.72).setStrokeStyle(4, 0x1d4ed8));
      scene.registerFixedObject('house_bath', bath, createZone('house_bath_zone', 0, 8, 230, 90), 1, 'bathBubbles');

      const table = scene.addSceneObject(scene.add.rectangle(1640, 560, 260, 56, 0xf59e0b).setStrokeStyle(4, 0x92400e));
      scene.addSceneObject(scene.add.circle(1585, 524, 22, 0xffffff).setStrokeStyle(3, 0xf97316));
      scene.addSceneObject(scene.add.circle(1695, 524, 22, 0xffffff).setStrokeStyle(3, 0xf97316));
      scene.registerFixedObject('house_table', table, createZone('house_table_zone', 0, 22, 260, 90), 1, 'tableGiggle');
    }
  },
  {
    id: 'school',
    label: 'School / Playgroup',
    mapX: 935,
    mapY: 335,
    worldWidth: 2300,
    floorY: 590,
    defaultCast: [
      { id: 'peppa', x: 330, y: 590 },
      { id: 'george', x: 480, y: 590 },
      { id: 'mummy_pig', x: 640, y: 590 }
    ],
    drawBackground: (scene) => {
      scene.addSceneObject(scene.add.image(1150, 360, 'background_school').setDisplaySize(2300, 720));
      scene.addSceneObject(scene.add.rectangle(210, 230, 245, 150, 0x22c55e).setStrokeStyle(5, 0x166534));
      scene.addSceneObject(scene.add.text(135, 195, 'ABC', { fontFamily: 'Arial, sans-serif', fontSize: '42px', color: '#ffffff' }));
      scene.addSceneObject(scene.add.rectangle(760, 360, 250, 60, 0xf97316).setStrokeStyle(4, 0x9a3412));
      scene.addSceneObject(scene.add.circle(700, 320, 24, 0xef4444));
      scene.addSceneObject(scene.add.circle(760, 318, 24, 0x3b82f6));
      scene.addSceneObject(scene.add.circle(820, 320, 24, 0x22c55e));
      scene.addSceneObject(scene.add.rectangle(1230, 330, 190, 140, 0xffffff).setStrokeStyle(4, 0x94a3b8));
      scene.addSceneObject(scene.add.circle(1400, 390, 48, 0xef4444));
      scene.addSceneObject(scene.add.circle(1490, 390, 48, 0x3b82f6));
    },
    createFixedObjects: (scene) => {
      const chalkboard = scene.addSceneObject(scene.add.rectangle(210, 380, 270, 62, 0x22c55e, 0.35).setStrokeStyle(3, 0x166534));
      scene.registerFixedObject('school_chalkboard', chalkboard, createZone('school_chalkboard_zone', 0, 12, 280, 108), 1, 'chalkScribble');

      const paint = scene.addSceneObject(scene.add.ellipse(760, 560, 260, 78, 0xf97316, 0.55).setStrokeStyle(4, 0x9a3412));
      scene.registerFixedObject('school_paint_table', paint, createZone('school_paint_zone', 0, 10, 250, 90), 1, 'paintSplat');

      const blocks = scene.addSceneObject(scene.add.rectangle(1445, 560, 245, 80, 0x93c5fd, 0.45).setStrokeStyle(4, 0x2563eb));
      scene.addSceneObject(scene.add.rectangle(1390, 520, 54, 54, 0xef4444));
      scene.addSceneObject(scene.add.rectangle(1450, 520, 54, 54, 0x3b82f6));
      scene.addSceneObject(scene.add.rectangle(1510, 520, 54, 54, 0x22c55e));
      scene.registerFixedObject('school_blocks', blocks, createZone('school_blocks_zone', 0, 14, 250, 100), 1, 'blocksTumble');
    }
  }
];

export function getLocation(locationId: string): LocationDefinition {
  return locations.find((location) => location.id === locationId) ?? locations[0];
}

export function getLocationIcon(locationId: string): string {
  if (locationId === 'house') return '🏠';
  if (locationId === 'school') return '🎨';
  return '🌧️';
}

function createZone(id: string, x: number, y: number, width: number, height: number, shape: InteractionZone['shape'] = 'ellipse'): InteractionZone {
  return { id, shape, x, y, width, height };
}
