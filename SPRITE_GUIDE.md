# Sprite Guidelines

## 1. Purpose

These guidelines define how character sprites, object sprites, and animation frames should be created, reviewed, and prepared for the Peppa Pig pretend-play game.

The goal is to make AI-generated art easier to review, keep assets consistent, and avoid integration problems when sprites are added to the web game.

## 2. Art Direction

Sprites should match the game’s cozy pretend-play feel:

- Bright, simple, friendly shapes
- Clear silhouettes at small sizes
- Soft, playful expressions
- Minimal detail
- Readable on both desktop and mobile
- Transparent backgrounds for all exported sprites
- Consistent proportions across all characters

## 3. First-Version Sprite Scope

The first version only needs enough sprite work to support character movement and fixed-object reactions.

### Character sprites

Initial characters:

- Peppa
- George
- Mummy Pig
- Daddy Pig

Required animation states:

- `idle`
- `happy_reaction`

Optional early states:

- `surprised`
- `giggle`

### Fixed object sprites

Initial fixed object:

- `muddy_puddle`

Required animation states:

- `idle`
- `splash`

## 4. Canvas and Export Rules

### Character frames

Recommended starting size:

- `512x512px` PNG per frame
- Transparent background
- Character centered horizontally
- Feet/body base near the lower third of the canvas
- Leave enough padding so animations do not clip

### Fixed object frames

Recommended starting size:

- `512x512px` PNG per frame for larger scene objects
- `256x256px` PNG per frame for small/simple objects
- Transparent background
- Object centered in the frame

### File format

Use:

- `.png` for individual review frames
- Transparent background
- No baked-in shadows unless intentionally part of the art style

Avoid:

- JPG files
- Cropped character limbs
- Background colors
- Text inside the image
- Random props attached to character art unless requested

## 5. Anchor and Origin Rules

Characters should use a bottom-center origin so they can be placed naturally in the scene.

Recommended Phaser origin:

```ts
sprite.setOrigin(0.5, 1.0);
```

Meaning:

- `x = 0.5`: horizontal center
- `y = 1.0`: bottom of sprite, usually feet/base of body

For fixed objects, origin depends on the object:

- Puddles: center origin, `0.5, 0.5`
- Large furniture/background objects: usually bottom-center, `0.5, 1.0`

## 6. Naming Conventions

Use lowercase names with underscores.

### Character frame naming

```text
assets/sprites/characters/{character_id}/{animation_id}_{frame_number}.png
```

Example:

```text
assets/sprites/characters/peppa/idle_001.png
assets/sprites/characters/peppa/happy_reaction_001.png
assets/sprites/characters/peppa/happy_reaction_002.png
assets/sprites/characters/peppa/happy_reaction_003.png
```

### Fixed object frame naming

```text
assets/sprites/fixed-objects/{object_id}/{animation_id}_{frame_number}.png
```

Example:

```text
assets/sprites/fixed-objects/muddy_puddle/idle_001.png
assets/sprites/fixed-objects/muddy_puddle/splash_001.png
assets/sprites/fixed-objects/muddy_puddle/splash_002.png
assets/sprites/fixed-objects/muddy_puddle/splash_003.png
```

## 7. Animation Guidelines

Keep animations short and readable.

Recommended frame counts:

- `idle`: 1–4 frames
- `happy_reaction`: 3–8 frames
- `splash`: 4–8 frames

Recommended animation timing:

- Idle: slow loop
- Reactions: quick, playful, less than 1 second
- Splash: quick burst, then return to idle

Animation should work even if repeated often.

## 8. AI Generation Guidelines

When generating sprites with AI:

1. Generate a small batch of candidates.
2. Choose one candidate as the style reference.
3. Use that reference consistently for future character poses.
4. Human-review every generated sprite before integration.
5. Avoid generating many final assets before the style and proportions are approved.

Common AI issues to check:

- Inconsistent character proportions between frames
- Extra limbs/fingers/details
- Unwanted props or background elements
- Face changing between animation frames
- Cropped ears, feet, or hands
- Slightly different art style between characters
- Poor transparency cleanup

## 9. Human Review Checklist

A sprite can be approved when:

- It matches the intended character
- It has a transparent background
- It reads clearly at mobile size
- It has no unwanted background, text, or extra objects
- It aligns with the expected origin/anchor point
- It looks consistent with other approved sprites
- Animation frames do not jitter unexpectedly
- The emotion/reaction is clear without reading text

## 10. Review Status Values

Use these review states in sprite metadata:

- `draft`: generated but not reviewed
- `needs_changes`: reviewed and requires fixes
- `approved`: ready to use in the game
- `rejected`: should not be used

## 11. Recommended Directory Structure

```text
assets/
  sprites/
    characters/
      peppa/
        idle_001.png
        happy_reaction_001.png
      george/
      mummy_pig/
      daddy_pig/
    fixed-objects/
      muddy_puddle/
        idle_001.png
        splash_001.png
  sprite-manifests/
    characters/
      peppa.json
    fixed-objects/
      muddy_puddle.json

templates/
  ai-character-prompt-template.md
  ai-fixed-object-prompt-template.md
  character-sprite-manifest.template.json
  fixed-object-sprite-manifest.template.json
```
