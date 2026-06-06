import Phaser from 'phaser';
import { characterManifests, fixedObjectManifests, getAssetUrl } from './assetRegistry';
import type { InteractionZone, SpriteManifest } from './types';

interface CharacterInstance {
  image: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  manifest: SpriteManifest;
  idleEvent?: Phaser.Time.TimerEvent;
  isDragging?: boolean;
  isReacting?: boolean;
  lastX?: number;
}

interface SceneCharacterPlacement {
  id: string;
  x: number;
  y: number;
}

type FixedObjectReaction = 'puddleSplash' | 'sofaBounce' | 'bathBubbles' | 'tableGiggle' | 'chalkScribble' | 'paintSplat' | 'blocksTumble';

interface FixedObjectInstance {
  id: string;
  object: Phaser.GameObjects.GameObject & { x: number; y: number; setTint?: (tint: number) => unknown; clearTint?: () => unknown };
  zone: InteractionZone;
  scale: number;
  reaction: FixedObjectReaction;
  lastTriggeredAt: number;
}

interface LocationDefinition {
  id: string;
  label: string;
  mapX: number;
  mapY: number;
  worldWidth: number;
  floorY: number;
  defaultCast: SceneCharacterPlacement[];
  drawBackground: (scene: PretendPlayScene) => void;
  createFixedObjects?: (scene: PretendPlayScene) => void;
}

const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 720;
const TRAY_Y = 600;
const TRAY_HEIGHT = 120;
const GAME_CHARACTER_SCALE = 0.68;
const SHADOW_Y_OFFSET = 1;
const INITIAL_CHARACTER_IDS = ['peppa', 'george', 'mummy_pig', 'daddy_pig', 'suzy_sheep', 'grandpa_pig', 'madame_gazelle'];

export function mountGame(root: HTMLElement): () => void {
  root.innerHTML = '<div id="game-canvas"></div>';

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-canvas',
    backgroundColor: '#bde7ff',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: VIEW_WIDTH,
      height: VIEW_HEIGHT
    },
    scene: [PretendPlayScene]
  };

  const game = new Phaser.Game(config);
  return () => game.destroy(true);
}

class PretendPlayScene extends Phaser.Scene {
  private currentLocation?: LocationDefinition;
  private characters: CharacterInstance[] = [];
  private fixedObjects: FixedObjectInstance[] = [];
  private sceneObjects: Phaser.GameObjects.GameObject[] = [];
  private uiObjects: Phaser.GameObjects.GameObject[] = [];
  private trayObjects: Phaser.GameObjects.GameObject[] = [];
  private trayOpen = false;
  private puddle?: Phaser.GameObjects.Image;
  private puddleManifest?: SpriteManifest;
  private lastSplashAt = 0;
  private audio = new TinyAudio();
  private cameraDragStart?: { pointerX: number; scrollX: number };
  private draggingCharacter = false;

  constructor() {
    super('pretend-play');
  }

  preload(): void {
    this.load.image('world_map', getAssetUrl('assets/sprites/map/world_map.jpg'));

    const playerManifests = [
      ...characterManifests.filter((manifest) => INITIAL_CHARACTER_IDS.includes(manifest.id)),
      ...fixedObjectManifests
    ];

    for (const manifest of playerManifests) {
      for (const [animationName, animation] of Object.entries(manifest.animations)) {
        for (const [index, frame] of animation.frames.entries()) {
          this.load.image(toFrameKey(manifest.id, animationName, index), getAssetUrl(frame));
        }
      }
    }
  }

  create(): void {
    this.input.on('pointerdown', () => this.audio.unlock());
    this.showMap();
  }

  update(): void {
    for (const character of this.characters) {
      this.updateCharacterShadow(character);
    }
  }

  showMap(): void {
    this.teardownCameraDrag();
    this.currentLocation = undefined;
    this.clearSceneObjects();
    this.cameras.main.setBounds(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    this.cameras.main.setScroll(0, 0);

    const map = this.addSceneObject(this.add.image(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 'world_map'));
    map.setDisplaySize(VIEW_WIDTH, VIEW_HEIGHT);
    map.setScrollFactor(0);

    this.createFullscreenButton();

    for (const location of locations) {
      this.createMapLocationButton(location);
    }

  }

  loadLocation(locationId: string): void {
    const location = getLocation(locationId);
    this.currentLocation = location;
    this.lastSplashAt = 0;
    this.puddle = undefined;
    this.puddleManifest = undefined;
    this.fixedObjects = [];
    this.trayOpen = false;

    this.clearSceneObjects();
    this.cameras.main.setBounds(0, 0, location.worldWidth, VIEW_HEIGHT);
    this.cameras.main.setScroll(0, 0);

    location.drawBackground(this);
    this.createPanSurface(location);
    location.createFixedObjects?.(this);

    for (const placement of location.defaultCast) {
      this.spawnCharacter(placement.id, placement.x, placement.y);
    }

    this.createSceneUi(location);
  }

  addSceneObject<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.sceneObjects.push(object);
    return object;
  }

  createMuddyPuddle(x: number, y: number): void {
    const manifest = fixedObjectManifests.find((item) => item.id === 'muddy_puddle');
    if (!manifest) return;

    this.puddleManifest = manifest;
    this.puddle = this.addSceneObject(this.add.image(x, y, toFrameKey(manifest.id, 'idle', 0)));
    this.puddle.setOrigin(manifest.origin.x, manifest.origin.y);
    this.puddle.setScale(manifest.defaultScale * 1.25);
    this.puddle.setDepth(5);

    const zone = manifest.interactionZones?.[0];
    if (zone) {
      this.registerFixedObject('muddy_puddle', this.puddle, zone, this.puddle.scaleX, 'puddleSplash');
    }
  }

  registerFixedObject(
    id: string,
    object: Phaser.GameObjects.GameObject & { x: number; y: number; setTint?: (tint: number) => unknown; clearTint?: () => unknown },
    zone: InteractionZone,
    scale: number,
    reaction: FixedObjectReaction
  ): void {
    this.fixedObjects.push({ id, object, zone, scale, reaction, lastTriggeredAt: 0 });
  }

  private createPanSurface(location: LocationDefinition): void {
    const panSurface = this.addSceneObject(
      this.add.rectangle(location.worldWidth / 2, (TRAY_Y + 64) / 2, location.worldWidth, TRAY_Y - 64, 0xffffff, 0.001)
    );
    panSurface.setDepth(-1000);
    panSurface.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(panSurface);

    panSurface.on('dragstart', (pointer: Phaser.Input.Pointer) => {
      if (this.draggingCharacter || this.trayOpen) return;
      this.cameraDragStart = { pointerX: pointer.x, scrollX: this.cameras.main.scrollX };
    });

    panSurface.on('drag', (pointer: Phaser.Input.Pointer) => {
      if (!this.cameraDragStart || this.draggingCharacter || this.trayOpen) return;
      const nextScroll = this.cameraDragStart.scrollX + (this.cameraDragStart.pointerX - pointer.x) * 1.25;
      this.cameras.main.scrollX = Phaser.Math.Clamp(nextScroll, 0, Math.max(location.worldWidth - VIEW_WIDTH, 0));
    });

    panSurface.on('dragend', () => {
      this.cameraDragStart = undefined;
    });
  }

  private createMapLocationButton(location: LocationDefinition): void {
    const hotspot = this.addUi(
      this.add
        .ellipse(location.mapX, location.mapY, 230, 170, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true })
    );

    const pulse = this.addUi(this.add.ellipse(location.mapX, location.mapY, 44, 44, 0xffffff, 0.28));
    const icon = this.addUi(
      this.add
        .text(location.mapX, location.mapY - 16, getLocationIcon(location.id), { fontSize: '42px' })
        .setOrigin(0.5)
    );
    const label = this.addUi(
      this.add
        .text(location.mapX, location.mapY + 42, location.label, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          color: '#1f2937',
          backgroundColor: '#fffaf0',
          padding: { x: 10, y: 5 }
        })
        .setOrigin(0.5)
    );

    hotspot.on('pointerdown', () => {
      this.audio.pop();
      this.loadLocation(location.id);
    });

    this.tweens.add({
      targets: pulse,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0.05,
      duration: 1400 + location.mapX,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    void icon;
    void label;
  }

  private createSceneUi(location: LocationDefinition): void {
    const topBar = this.addUi(this.add.rectangle(VIEW_WIDTH / 2, 30, VIEW_WIDTH, 60, 0xfffaf0, 0.92));
    const mapButton = this.addUi(
      this.add
        .rectangle(74, 30, 112, 38, 0xffffff)
        .setStrokeStyle(2, 0xeadfcf)
        .setInteractive({ useHandCursor: true })
    );
    const mapText = this.addUi(
      this.add
        .text(74, 30, 'Map', { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#1f2937' })
        .setOrigin(0.5)
    );
    const title = this.addUi(
      this.add
        .text(VIEW_WIDTH / 2, 30, location.label, { fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#1f2937' })
        .setOrigin(0.5)
    );
    mapButton.on('pointerdown', () => {
      this.audio.pop();
      this.showMap();
    });

    const leftPan = this.addUi(
      this.add
        .ellipse(42, VIEW_HEIGHT / 2, 54, 86, 0xffffff, 0.72)
        .setStrokeStyle(2, 0xeadfcf)
        .setInteractive({ useHandCursor: true })
    );
    const leftPanText = this.addUi(this.add.text(42, VIEW_HEIGHT / 2, '‹', { fontSize: '54px', color: '#1f2937' }).setOrigin(0.5));
    const rightPan = this.addUi(
      this.add
        .ellipse(VIEW_WIDTH - 42, VIEW_HEIGHT / 2, 54, 86, 0xffffff, 0.72)
        .setStrokeStyle(2, 0xeadfcf)
        .setInteractive({ useHandCursor: true })
    );
    const rightPanText = this.addUi(this.add.text(VIEW_WIDTH - 42, VIEW_HEIGHT / 2, '›', { fontSize: '54px', color: '#1f2937' }).setOrigin(0.5));

    leftPan.on('pointerdown', () => this.panCameraBy(-420));
    rightPan.on('pointerdown', () => this.panCameraBy(420));

    this.createFullscreenButton();

    const trayToggle = this.addUi(
      this.add
        .ellipse(VIEW_WIDTH - 64, VIEW_HEIGHT - 64, 76, 76, 0xef4444)
        .setStrokeStyle(4, 0xffffff)
        .setInteractive({ useHandCursor: true })
    );
    const trayIcon = this.addUi(this.add.text(VIEW_WIDTH - 64, VIEW_HEIGHT - 64, '🐷', { fontSize: '34px' }).setOrigin(0.5));

    trayToggle.on('pointerdown', () => {
      this.audio.pop();
      this.toggleCharacterTray();
    });

    void topBar;
    void mapText;
    void title;
    void leftPanText;
    void rightPanText;
    void trayIcon;
  }

  private createFullscreenButton(): void {
    if (!canEnterFullscreen()) return;

    const button = this.addUi(
      this.add
        .rectangle(VIEW_WIDTH - 142, 30, 112, 38, 0xffffff)
        .setStrokeStyle(2, 0xeadfcf)
        .setInteractive({ useHandCursor: true })
    );
    const label = this.addUi(
      this.add
        .text(VIEW_WIDTH - 142, 30, '⛶ Full', { fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#1f2937' })
        .setOrigin(0.5)
    );

    button.on('pointerdown', () => {
      this.audio.pop();
      void enterFullscreen();
      button.destroy();
      label.destroy();
    });
  }

  private toggleCharacterTray(): void {
    this.trayOpen = !this.trayOpen;
    this.clearTrayObjects();
    if (this.trayOpen) this.createInventoryTray();
  }

  private createInventoryTray(): void {
    const tray = this.addUi(this.add.rectangle(VIEW_WIDTH / 2, TRAY_Y + TRAY_HEIGHT / 2, VIEW_WIDTH, TRAY_HEIGHT, 0xfffaf0, 0.96));
    this.trayObjects.push(tray);

    const label = this.addUi(
      this.add.text(20, TRAY_Y + 12, 'Characters', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#6b7280'
      })
    );
    this.trayObjects.push(label);

    const activeIds = new Set(this.characters.map((character) => character.manifest.id));
    const available = characterManifests.filter((manifest) => INITIAL_CHARACTER_IDS.includes(manifest.id) && !activeIds.has(manifest.id));

    if (available.length === 0) {
      const empty = this.addUi(
        this.add
          .text(VIEW_WIDTH / 2, TRAY_Y + 54, 'Everyone is already playing', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            color: '#6b7280'
          })
          .setOrigin(0.5)
      );
      this.trayObjects.push(empty);
      return;
    }

    available.forEach((manifest, index) => {
      const x = 112 + index * 92;
      const icon = this.addUi(this.add.image(x, TRAY_Y + 74, toFrameKey(manifest.id, 'idle', 0)));
      icon.setOrigin(manifest.origin.x, manifest.origin.y);
      icon.setScale(manifest.defaultScale * 0.46);
      icon.setInteractive({ draggable: true, useHandCursor: true });
      this.input.setDraggable(icon);
      this.trayObjects.push(icon);

      let preview: CharacterInstance | undefined;

      icon.on('dragstart', (pointer: Phaser.Input.Pointer) => {
        this.audio.pop();
        const worldPoint = this.screenToWorld(pointer.x, pointer.y);
        preview = this.spawnCharacter(manifest.id, worldPoint.x, worldPoint.y);
        if (preview) {
          this.draggingCharacter = true;
          this.stopIdleAnimation(preview);
          preview.isDragging = true;
          preview.image.setDepth(1100);
        }
      });

      icon.on('drag', (pointer: Phaser.Input.Pointer) => {
        if (!preview) return;
        const rawWorldPoint = this.screenToWorld(pointer.x, pointer.y);
        const worldPoint = this.clampDraggedPosition(rawWorldPoint.x, rawWorldPoint.y);
        const deltaX = worldPoint.x - (preview.lastX ?? worldPoint.x);
        if (Math.abs(deltaX) > 1) preview.image.setFlipX(deltaX < 0);
        preview.lastX = worldPoint.x;
        preview.image.setPosition(worldPoint.x, worldPoint.y);
        this.updateCharacterShadow(preview);
        this.addDragWiggle(preview, deltaX);
        this.updateFixedObjectHover(preview);
        this.checkFixedObjectInteractions(preview);
      });

      icon.on('dragend', (pointer: Phaser.Input.Pointer) => {
        if (!preview) return;
        const rawWorldPoint = this.screenToWorld(pointer.x, pointer.y);
        const worldPoint = this.clampDraggedPosition(rawWorldPoint.x, rawWorldPoint.y);
        this.draggingCharacter = false;
        preview.isDragging = false;
        this.clearFixedObjectHover();

        if (pointer.y >= TRAY_Y - 8) {
          this.removeCharacter(preview, true);
          preview = undefined;
          this.toggleCharacterTray();
          return;
        }

        preview.image.setPosition(worldPoint.x, worldPoint.y);
        preview.image.setDepth(worldPoint.y);
        this.updateCharacterShadow(preview);
        const settledPreview = preview;
        this.settleCharacterWithGravity(settledPreview, () => {
          this.checkFixedObjectInteractions(settledPreview);
          this.checkSocialReactions(settledPreview);
          if (!settledPreview.isReacting) this.startIdleAnimation(settledPreview);
        });
        preview = undefined;
        this.toggleCharacterTray();
      });
    });
  }

  private clearSceneObjects(): void {
    for (const character of this.characters) {
      character.idleEvent?.remove(false);
    }

    for (const object of [...this.sceneObjects, ...this.uiObjects, ...this.trayObjects]) {
      this.tweens.killTweensOf(object);
      object.destroy();
    }

    this.characters = [];
    this.fixedObjects = [];
    this.sceneObjects = [];
    this.uiObjects = [];
    this.trayObjects = [];
    this.trayOpen = false;
  }

  private clearTrayObjects(): void {
    for (const object of this.trayObjects) {
      this.tweens.killTweensOf(object);
      object.destroy();
      this.uiObjects = this.uiObjects.filter((item) => item !== object);
    }
    this.trayObjects = [];
  }

  private addUi<T extends Phaser.GameObjects.GameObject & { setScrollFactor: (x: number, y?: number) => T; setDepth: (depth: number) => T }>(object: T): T {
    object.setScrollFactor(0);
    object.setDepth(1000 + this.uiObjects.length);
    this.uiObjects.push(object);
    return object;
  }

  private spawnCharacter(manifestId: string, x: number, y: number): CharacterInstance | undefined {
    const manifest = characterManifests.find((item) => item.id === manifestId);
    if (!manifest || !manifest.animations.idle?.frames.length) return undefined;

    const shadow = this.addSceneObject(this.add.ellipse(x, y + SHADOW_Y_OFFSET, 88, 22, 0x1f2937, 0.18));
    shadow.setDepth(y - 1);

    const character = this.addSceneObject(this.add.image(x, y, toFrameKey(manifest.id, 'idle', 0)));
    character.setOrigin(manifest.origin.x, manifest.origin.y);
    character.setScale(getGameScale(manifest));
    character.setDepth(y);
    character.setInteractive({ draggable: true, useHandCursor: true });

    const instance: CharacterInstance = { image: character, shadow, manifest, lastX: x };
    this.characters.push(instance);
    this.startIdleAnimation(instance);
    this.input.setDraggable(character);

    character.on('dragstart', () => {
      this.audio.pop();
      this.draggingCharacter = true;
      instance.isDragging = true;
      instance.lastX = character.x;
      this.stopIdleAnimation(instance);
      character.setDepth(900);
    });

    character.on('drag', (_pointer: Phaser.Input.Pointer, xPos: number, yPos: number) => {
      const clamped = this.clampDraggedPosition(xPos, yPos);
      const deltaX = clamped.x - (instance.lastX ?? clamped.x);
      if (Math.abs(deltaX) > 1) character.setFlipX(deltaX < 0);
      instance.lastX = clamped.x;
      character.setPosition(clamped.x, clamped.y);
      this.updateCharacterShadow(instance);
      this.addDragWiggle(instance, deltaX);
      this.updateTrayDropFeedback(character.y > TRAY_Y - 8);
      this.updateFixedObjectHover(instance);
      this.checkFixedObjectInteractions(instance);
    });

    character.on('dragend', () => {
      this.draggingCharacter = false;
      instance.isDragging = false;
      this.updateTrayDropFeedback(false);
      this.clearFixedObjectHover();

      if (character.y > TRAY_Y - 8 && this.trayOpen) {
        this.removeCharacter(instance, true);
        this.refreshTrayIfOpen();
        return;
      }

      character.setDepth(character.y);
      this.updateCharacterShadow(instance);
      character.setRotation(0);
      this.settleCharacterWithGravity(instance, () => {
        this.checkFixedObjectInteractions(instance);
        this.checkSocialReactions(instance);
        if (!instance.isReacting) this.startIdleAnimation(instance);
      });
    });

    character.on('pointerdown', () => {
      this.audio.pop();
      this.tweens.add({
        targets: character,
        scaleX: getGameScale(manifest) * 1.07,
        scaleY: getGameScale(manifest) * 1.07,
        duration: 85,
        yoyo: true
      });
    });

    return instance;
  }

  private removeCharacter(instance: CharacterInstance, animate = false): void {
    instance.idleEvent?.remove(false);
    this.characters = this.characters.filter((item) => item !== instance);
    this.sceneObjects = this.sceneObjects.filter((item) => item !== instance.image && item !== instance.shadow);
    this.audio.pop(180);

    if (!animate) {
      instance.image.destroy();
      instance.shadow.destroy();
      return;
    }

    this.tweens.killTweensOf(instance.image);
    this.tweens.killTweensOf(instance.shadow);
    this.tweens.add({
      targets: instance.shadow,
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: 140,
      ease: 'Sine.easeIn'
    });
    this.tweens.add({
      targets: instance.image,
      alpha: 0,
      scaleX: getGameScale(instance.manifest) * 0.2,
      scaleY: getGameScale(instance.manifest) * 0.2,
      duration: 140,
      ease: 'Sine.easeIn',
      onComplete: () => {
        instance.image.destroy();
        instance.shadow.destroy();
      }
    });
  }

  private startIdleAnimation(instance: CharacterInstance): void {
    if (!this.characters.includes(instance) || instance.image.scene !== this) return;
    this.stopIdleAnimation(instance);

    const animation = instance.manifest.animations.idle;
    const frames = animation?.frames ?? [];
    const frameKeys = frames.map((_frame, index) => toFrameKey(instance.manifest.id, 'idle', index));
    let frameIndex = 0;

    instance.idleEvent = this.time.addEvent({
      delay: 1000 / Math.max(animation?.fps ?? 2, 1),
      loop: true,
      callback: () => {
        if (frameKeys.length === 0 || !this.characters.includes(instance)) return;
        frameIndex = (frameIndex + 1) % frameKeys.length;
        instance.image.setTexture(frameKeys[frameIndex]);
      }
    });

    this.tweens.add({
      targets: instance.image,
      scaleX: getGameScale(instance.manifest) * 1.015,
      scaleY: getGameScale(instance.manifest) * 0.985,
      y: instance.image.y - 3,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private stopIdleAnimation(instance: CharacterInstance): void {
    instance.idleEvent?.remove(false);
    instance.idleEvent = undefined;
    this.tweens.killTweensOf(instance.image);
    instance.image.setScale(getGameScale(instance.manifest));
    instance.image.setRotation(0);
  }

  private addDragWiggle(instance: CharacterInstance, deltaX: number): void {
    const targetRotation = Phaser.Math.Clamp(deltaX * 0.006, -0.05, 0.05);
    instance.image.setRotation(Phaser.Math.Linear(instance.image.rotation, targetRotation, 0.25));
  }

  private updateCharacterShadow(instance: CharacterInstance): void {
    instance.shadow.setPosition(instance.image.x, instance.image.y + SHADOW_Y_OFFSET);
    instance.shadow.setDepth(instance.image.y - 1);
  }

  private checkFixedObjectInteractions(instance: CharacterInstance): void {
    const now = this.time.now;
    if (instance.isReacting || now - this.lastSplashAt < 350) return;

    for (const fixedObject of this.fixedObjects) {
      if (now - fixedObject.lastTriggeredAt < 900) continue;
      if (!isInsideZone(instance.image.x, instance.image.y, fixedObject.object.x, fixedObject.object.y, fixedObject.zone, fixedObject.scale)) continue;

      fixedObject.lastTriggeredAt = now;
      this.lastSplashAt = now;
      this.playFixedObjectReaction(fixedObject, instance);
      return;
    }
  }

  private playFixedObjectReaction(fixedObject: FixedObjectInstance, instance: CharacterInstance): void {
    if (fixedObject.reaction === 'puddleSplash') {
      this.playPuddleReaction(instance);
      return;
    }

    this.audio.giggle();
    this.addSparkleBurst(fixedObject.object.x, fixedObject.object.y - 80);
    this.pulseFixedObject(fixedObject);

    if (instance.isDragging) return;

    instance.isReacting = true;
    this.stopIdleAnimation(instance);

    const jumpHeight = fixedObject.reaction === 'sofaBounce' ? 44 : 28;
    this.tweens.add({
      targets: instance.image,
      y: instance.image.y - jumpHeight,
      scaleX: getGameScale(instance.manifest) * 1.06,
      scaleY: getGameScale(instance.manifest) * 0.96,
      duration: 150,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => {
        instance.isReacting = false;
        if (!this.characters.includes(instance)) return;
        instance.image.setDepth(instance.image.y);
        this.updateCharacterShadow(instance);
        this.startIdleAnimation(instance);
      }
    });

  }

  private pulseFixedObject(fixedObject: FixedObjectInstance): void {
    this.tweens.add({
      targets: fixedObject.object,
      scaleX: fixedObject.scale * 1.08,
      scaleY: fixedObject.scale * 1.08,
      duration: 130,
      yoyo: true,
      ease: 'Back.easeOut'
    });
  }

  private playPuddleReaction(instance: CharacterInstance): void {
    if (!this.puddle || !this.puddleManifest) return;

    this.audio.splash();

    const splashKey = toFrameKey(this.puddleManifest.id, 'splash', 0);
    const idleKey = toFrameKey(this.puddleManifest.id, 'idle', 0);

    this.puddle.setTexture(splashKey);

    if (instance.isDragging) {
      this.addSparkleBurst(this.puddle.x, this.puddle.y - 70);
      this.tweens.add({
        targets: this.puddle,
        scaleX: this.puddleManifest.defaultScale * 1.38,
        scaleY: this.puddleManifest.defaultScale * 1.38,
        duration: 120,
        yoyo: true,
        onComplete: () => this.puddle?.setTexture(idleKey)
      });
      return;
    }

    instance.isReacting = true;
    this.stopIdleAnimation(instance);

    this.tweens.add({
      targets: instance.image,
      y: instance.image.y - 36,
      rotation: Phaser.Math.FloatBetween(-0.12, 0.12),
      scaleX: getGameScale(instance.manifest) * 1.08,
      scaleY: getGameScale(instance.manifest) * 0.94,
      duration: 140,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => {
        instance.isReacting = false;
        if (!this.characters.includes(instance)) return;
        instance.image.setRotation(0);
        instance.image.setDepth(instance.image.y);
        this.updateCharacterShadow(instance);
        this.startIdleAnimation(instance);
      }
    });

    this.tweens.add({
      targets: this.puddle,
      scaleX: this.puddleManifest.defaultScale * 1.38,
      scaleY: this.puddleManifest.defaultScale * 1.38,
      duration: 120,
      yoyo: true,
      onComplete: () => this.puddle?.setTexture(idleKey)
    });
  }

  private panCameraBy(deltaX: number): void {
    if (!this.currentLocation) return;
    this.audio.pop(300);
    const maxScroll = Math.max(this.currentLocation.worldWidth - VIEW_WIDTH, 0);
    const target = Phaser.Math.Clamp(this.cameras.main.scrollX + deltaX, 0, maxScroll);
    this.tweens.add({
      targets: this.cameras.main,
      scrollX: target,
      duration: 260,
      ease: 'Sine.easeOut'
    });
  }

  private teardownCameraDrag(): void {
    this.cameraDragStart = undefined;
  }

  private updateFixedObjectHover(instance: CharacterInstance): void {
    for (const fixedObject of this.fixedObjects) {
      const active = isInsideZone(instance.image.x, instance.image.y, fixedObject.object.x, fixedObject.object.y, fixedObject.zone, fixedObject.scale);
      if (active) fixedObject.object.setTint?.(0xfff3a3);
      else fixedObject.object.clearTint?.();
    }
  }

  private clearFixedObjectHover(): void {
    for (const fixedObject of this.fixedObjects) {
      fixedObject.object.clearTint?.();
    }
  }

  private checkSocialReactions(instance: CharacterInstance): void {
    if (instance.isReacting) return;
    const friend = this.characters.find(
      (character) =>
        character !== instance &&
        !character.isReacting &&
        Phaser.Math.Distance.Between(character.image.x, character.image.y, instance.image.x, instance.image.y) < 135
    );
    if (!friend) return;

    this.audio.giggle();
    this.addSparkleBurst((instance.image.x + friend.image.x) / 2, Math.min(instance.image.y, friend.image.y) - 120);
    for (const character of [instance, friend]) {
      this.tweens.add({
        targets: character.image,
        scaleX: getGameScale(character.manifest) * 1.08,
        scaleY: getGameScale(character.manifest) * 1.08,
        duration: 110,
        yoyo: true,
        ease: 'Sine.easeOut'
      });
    }
  }

  private clampDraggedPosition(x: number, y: number): Phaser.Math.Vector2 {
    const maxX = this.currentLocation?.worldWidth ?? VIEW_WIDTH;
    return new Phaser.Math.Vector2(Phaser.Math.Clamp(x, 42, maxX - 42), y);
  }

  private settleCharacterWithGravity(instance: CharacterInstance, onSettled: () => void): void {
    if (!this.characters.includes(instance) || instance.isReacting) {
      onSettled();
      return;
    }

    const floorY = this.currentLocation?.floorY ?? 590;
    const targetY = Phaser.Math.Clamp(instance.image.y, 160, floorY);
    if (Math.abs(instance.image.y - targetY) < 1) {
      instance.image.setDepth(instance.image.y);
      this.updateCharacterShadow(instance);
      onSettled();
      return;
    }

    this.tweens.add({
      targets: instance.image,
      y: targetY,
      duration: Math.max(120, Math.abs(instance.image.y - targetY) * 1.15),
      ease: 'Quad.easeIn',
      onUpdate: () => this.updateCharacterShadow(instance),
      onComplete: () => {
        instance.image.setDepth(instance.image.y);
        this.updateCharacterShadow(instance);
        onSettled();
      }
    });
  }

  private addSparkleBurst(x: number, y: number): void {
    for (let index = 0; index < 5; index += 1) {
      const sparkle = this.addSceneObject(this.add.star(x, y, 5, 5, 13, 0xffffff, 0.9));
      sparkle.setDepth(850);
      this.tweens.add({
        targets: sparkle,
        x: x + Phaser.Math.Between(-46, 46),
        y: y + Phaser.Math.Between(-38, 16),
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 430,
        ease: 'Sine.easeOut',
        onComplete: () => sparkle.destroy()
      });
    }
  }

  private updateTrayDropFeedback(active: boolean): void {
    const tray = this.trayObjects.find((object) => object instanceof Phaser.GameObjects.Rectangle && object.y === TRAY_Y + TRAY_HEIGHT / 2);
    if (tray instanceof Phaser.GameObjects.Rectangle) {
      tray.setFillStyle(active ? 0xfde68a : 0xfffaf0, active ? 0.98 : 0.96);
    }
  }

  private refreshTrayIfOpen(): void {
    if (!this.trayOpen) return;
    this.clearTrayObjects();
    this.createInventoryTray();
  }

  private screenToWorld(x: number, y: number): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(x + this.cameras.main.scrollX, y + this.cameras.main.scrollY);
  }
}

const locations: LocationDefinition[] = [
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
      scene.addSceneObject(scene.add.rectangle(1200, 360, 2400, 720, 0xbde7ff));
      scene.addSceneObject(scene.add.rectangle(1200, 610, 2400, 220, 0x8ed174));
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
      scene.addSceneObject(scene.add.rectangle(1100, 360, 2200, 720, 0xffe7be));
      scene.addSceneObject(scene.add.rectangle(1100, 610, 2200, 220, 0xd6b48f));
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
      scene.addSceneObject(scene.add.rectangle(1150, 360, 2300, 720, 0xdbeafe));
      scene.addSceneObject(scene.add.rectangle(1150, 610, 2300, 220, 0xfacc15));
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

function getLocation(locationId: string): LocationDefinition {
  return locations.find((location) => location.id === locationId) ?? locations[0];
}

function getLocationIcon(locationId: string): string {
  if (locationId === 'house') return '🏠';
  if (locationId === 'school') return '🎨';
  return '🌧️';
}

function createZone(id: string, x: number, y: number, width: number, height: number, shape: InteractionZone['shape'] = 'ellipse'): InteractionZone {
  return { id, shape, x, y, width, height };
}

function getGameScale(manifest: SpriteManifest): number {
  return manifest.defaultScale * GAME_CHARACTER_SCALE;
}

function toFrameKey(manifestId: string, animationName: string, frameIndex: number): string {
  return `${manifestId}:${animationName}:${frameIndex}`;
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

function getWebkitAudioContext(): typeof AudioContext | undefined {
  return (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

interface WebkitFullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => void;
}

interface WebkitFullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
}

function canEnterFullscreen(): boolean {
  const webkitDocument = document as WebkitFullscreenDocument;
  const fullscreenElement = document.fullscreenElement ?? webkitDocument.webkitFullscreenElement;
  const fullscreenEnabled = document.fullscreenEnabled || webkitDocument.webkitFullscreenEnabled;
  const element = document.documentElement as WebkitFullscreenElement;
  return !fullscreenElement && Boolean(fullscreenEnabled && (element.requestFullscreen || element.webkitRequestFullscreen));
}

async function enterFullscreen(): Promise<void> {
  const element = document.documentElement as WebkitFullscreenElement;
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
      return;
    }
    element.webkitRequestFullscreen?.();
  } catch {
    // Fullscreen requests may be denied by browser policy; ignore and keep playing inline.
  }
}

class TinyAudio {
  private context?: AudioContext;

  unlock(): void {
    const AudioContextConstructor = window.AudioContext ?? getWebkitAudioContext();
    if (!AudioContextConstructor) return;

    try {
      this.context ??= new AudioContextConstructor();
    } catch {
      return;
    }

    if (this.context.state === 'suspended') {
      void this.context.resume();
    }
  }

  pop(frequency = 420): void {
    this.playTone(frequency, 0.035, 'sine', 0.025);
  }

  splash(): void {
    this.playTone(170, 0.07, 'triangle', 0.04);
    window.setTimeout(() => this.playTone(260, 0.055, 'sine', 0.03), 30);
  }

  giggle(): void {
    this.playTone(520, 0.045, 'sine', 0.025);
    window.setTimeout(() => this.playTone(680, 0.04, 'sine', 0.022), 55);
  }

  private playTone(frequency: number, duration: number, type: OscillatorType, volume: number): void {
    this.unlock();
    if (!this.context) return;

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
    oscillator.stop(this.context.currentTime + duration);
  }
}
