export type ReviewStatus = 'draft' | 'needs_changes' | 'approved' | 'rejected';

export type SpriteType = 'character' | 'fixed_object';

export interface SpriteAnimation {
  fps: number;
  loop: boolean;
  frames: string[];
}

export interface SpriteOrigin {
  x: number;
  y: number;
}

export interface InteractionZone {
  id: string;
  shape: 'ellipse' | 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpriteManifest {
  id: string;
  displayName: string;
  type: SpriteType;
  reviewStatus: ReviewStatus;
  reviewNotes: string;
  origin: SpriteOrigin;
  defaultScale: number;
  interactionZones?: InteractionZone[];
  animations: Record<string, SpriteAnimation>;
}
