import Phaser from 'phaser';
import type { SpriteManifest } from './types';

export interface AnimatedCharacterLike {
  image: Phaser.GameObjects.Image;
  manifest: SpriteManifest;
  idleEvent?: Phaser.Time.TimerEvent;
}

interface IdleAnimationOptions {
  scene: Phaser.Scene;
  character: AnimatedCharacterLike;
  getScale: (manifest: SpriteManifest) => number;
  getFrameKey: (manifestId: string, animationName: string, frameIndex: number) => string;
}

export function startIdleAnimation({ scene, character, getScale, getFrameKey }: IdleAnimationOptions): void {
  stopIdleAnimation(scene, character, getScale);

  const animation = character.manifest.animations.idle;
  const frames = animation?.frames ?? [];
  const frameKeys = frames.map((_frame, index) => getFrameKey(character.manifest.id, 'idle', index));
  let frameIndex = 0;

  character.idleEvent = scene.time.addEvent({
    delay: 1000 / Math.max(animation?.fps ?? 2, 1),
    loop: true,
    callback: () => {
      if (frameKeys.length === 0 || character.image.scene !== scene) return;
      frameIndex = (frameIndex + 1) % frameKeys.length;
      character.image.setTexture(frameKeys[frameIndex]);
    }
  });

  scene.tweens.add({
    targets: character.image,
    scaleX: getScale(character.manifest) * 1.015,
    scaleY: getScale(character.manifest) * 0.985,
    y: character.image.y - 3,
    duration: 1000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });
}

export function stopIdleAnimation(scene: Phaser.Scene, character: AnimatedCharacterLike, getScale: (manifest: SpriteManifest) => number): void {
  character.idleEvent?.remove(false);
  character.idleEvent = undefined;
  scene.tweens.killTweensOf(character.image);
  character.image.setScale(getScale(character.manifest));
  character.image.setRotation(0);
}
