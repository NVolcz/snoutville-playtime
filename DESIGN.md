# Pretend Play Peppa Pig Game — Design Document (v0.1)

## 1. Overview

A cozy, child-friendly pretend-play game where players explore familiar family and community scenarios through open-ended movement, simple scene interactions, and imaginative role play.

The game should feel like an interactive playset: low pressure, no failure states, gentle humor, and lots of small discoveries. In the first version, players mainly move characters around scenes and trigger playful reactions from fixed objects in the environment.

## 2. Target Audience

- Primary audience: children ages 3–7
- Secondary audience: parents/caregivers playing with children
- Platform expectations: web game playable on both desktop and mobile devices
- Reading level: minimal; use voice, icons, animation, and visual prompts

## 3. Design Goals

1. **Open-ended pretend play**  
   Let children make their own stories instead of pushing them through strict objectives.

2. **Safe and positive experience**  
   No timers, punishment, game-over screens, scary content, or competitive pressure.

3. **Simple character movement**  
   Players can drag, place, and reposition characters freely within a scene.

4. **Fixed-object reactions**  
   Scenes contain fixed interactive objects, such as muddy puddles, that react when characters are placed on or near them.

5. **Recognizable daily-life scenarios**  
   Home, school, playground, muddy puddles, bedtime, and family outings.

## 4. Core Game Pillars

### 4.1 Pretend Play First
The player is not trying to “win.” They are arranging scenes, moving characters, and creating little stories.

### 4.2 Gentle Humor
Interactions should produce silly but safe reactions: giggles, snorts, splashes, funny sounds, and playful expressions.

### 4.3 Everyday Adventure
Activities are based on things children understand: breakfast, bath time, visiting grandparents, playing outside, going to school.

### 4.4 Cozy Playset Feel
The game should feel like opening a toy box: immediate, inviting, easy to experiment with, and full of small playful reactions.

## 5. Gameplay Loop

1. Player chooses a location from a map or scene carousel.
2. The scene opens with default characters already present and doing simple idle activities.
3. Player may optionally open a character inventory/tray to add, remove, or swap characters during play.
4. Player moves characters around the scene.
5. Fixed objects react when characters are placed on or near them.
6. Characters respond with animation, sound, voice lines, or expressions.
7. Player can move to another location.

## 6. Glossary

This section defines the domain language used throughout the design.

- **Location**: A place the player can visit, such as the Family House, Muddy Puddle Park, or School / Playgroup.
- **Scene**: The playable view inside a location. A location may contain one scene in the first version.
- **Character**: A movable person/animal in the scene. Characters can be dragged and placed by the player.
- **Default Cast**: The characters that are already present when a scene opens.
- **Character Inventory**: An in-scene tray that lets the player add, remove, or swap characters during play.
- **Fixed Object**: An object that is part of the scene background or layout and cannot be picked up by the player.
- **Interaction Zone**: An invisible or visible area around a fixed object that detects when a character is placed there.
- **Reaction**: The animation, sound, expression, or voice line triggered by an interaction.
- **Prop**: A movable object the player can pick up, drag, give to characters, or place into containers. Props are not part of the first version and are listed as a future addition.

## 7. Main Features

### 7.1 Interactive Locations
The first version should focus on a small number of highly readable locations rather than many complex ones.

Initial locations:

1. **Family House**
   - A cozy home scene with familiar rooms and characters already present
   - Focus: moving characters around and creating family stories

2. **Muddy Puddle Park**
   - An outdoor play scene with muddy puddles as the primary interaction
   - Focus: placing characters in puddles to trigger splash reactions

3. **School / Playgroup**
   - A classroom/playgroup scene with friendly visual storytelling opportunities
   - Focus: moving characters around the scene and arranging pretend-play moments

### 7.2 Characters
Characters are part of the scene, not a required pre-scene selection step. Each location should open with a small default cast already present, making the scene feel alive immediately. Characters are draggable and placeable within scenes.

Players can also use a character inventory/tray, similar to Toca Boca-style playsets, to bring additional characters into the current scene or remove characters they do not want to use. This inventory should be available during play rather than as a separate setup screen.

Initial character set:
- Peppa
- George
- Mummy Pig
- Daddy Pig

Character inventory behavior:
- Open inventory from a simple character icon at the side or bottom of the screen
- Drag a character from the inventory into the scene
- Drag a character back to the inventory to remove them from the scene
- Preserve the default scene cast when resetting, unless a full reset is chosen
- Keep the inventory visual and icon-based with no required reading

Character interactions:
- Drag a character around the scene
- Place a character in a valid interaction zone
- Tap a character for expression/voice reaction
- Place two characters near each other for short social reactions

### 7.3 Fixed Object Interaction
The first version should use fixed object interactions rather than movable props.

Core interaction:
- The player drags a character onto or near a fixed object.
- The object detects the character through an interaction zone.
- The scene plays a short reaction.
- The character remains draggable afterward.

Initial fixed object interaction:
- **Muddy puddle**: when a character is placed in a puddle, the puddle splashes and the character reacts with a happy animation or sound.

## 8. User Experience

### 8.1 Navigation
- Large touch targets
- Icon-led interface
- Minimal text
- Back/home button always visible
- Scene reset button with confirmation
- No nested menus beyond one level for children

## 9. Art Direction

- Bright, simple, flat-color style
- Chunky shapes and readable silhouettes
- Soft, friendly animation
- Clear foreground/background separation
- Fixed objects should be visually clear and inviting

## 10. Audio Direction

- Warm, playful sound effects
- Character giggles, snorts, surprised sounds, happy reactions
- Light background music per location
- Short voice lines; avoid repetitive annoyance
- Volume balancing for young children and caregivers

## 11. Technical Design — First Pass

### 11.1 Recommended Technology

Recommended stack:

- **TypeScript** for safer game logic and clearer data structures
- **Phaser 3** as the 2D web game framework
- **Vite** for local development and production builds
- **HTML5 Canvas/WebGL** rendering through Phaser
- **Static web hosting** for deployment

Why this stack fits:
- Works well for 2D character movement, scene switching, hit zones, animations, and audio
- Runs in the browser on desktop and mobile devices
- Easy to host as static files
- Avoids unnecessary app-store or native build complexity for the first version
- Has enough structure for game scenes without requiring a heavy engine

### 11.2 Suggested Architecture

Core systems:

- Scene/location manager
- Character controller
- Character inventory system
- Fixed object interaction system
- Interaction zone detection
- Audio manager

### 11.3 Data-Driven Fixed Object Interactions
Fixed object interactions should be defined with data where possible:

```json
{
  "id": "muddy_puddle_01",
  "displayName": "Muddy Puddle",
  "interactionZone": "puddle_zone_01",
  "trigger": "character_enter_zone",
  "reaction": {
    "animation": "puddle_splash",
    "characterAnimation": "happy_jump",
    "sound": "muddy_splash"
  }
}
```

### 11.4 Sprite Review Developer Page

Build a storybook-like developer page for reviewing generated sprites and animations before they are used in gameplay.

Purpose:
- Review AI-generated character art in a controlled environment
- Compare idle poses, expressions, and animation frames
- Test sprite scale, anchors, transparency, and readability
- Let a human reviewer approve, reject, or request changes to assets
- Catch visual issues before integrating sprites into scenes

Recommended features:
- Character selector
- Animation selector
- Play/pause animation controls
- Frame-by-frame stepping
- Background toggle: transparent checkerboard, white, sky, house, park
- Scale controls for desktop and mobile preview sizes
- Anchor/origin marker, especially for feet/bottom-center placement
- Hitbox and interaction-zone overlay toggles
- Notes/status field for review: `draft`, `needs changes`, `approved`

This page should be separate from the player-facing game and only used during development.

## 12. Game Feel Guidelines

- Keep interactions gentle, silly, and easy to understand
- Avoid failure states; if something does not work, it should still produce a fun reaction
- Encourage kindness, curiosity, family play, and creativity
- Make every location feel like a small playset with multiple stories available at once
- Favor short, repeatable interactions over long scripted sequences

## 13. Appendix: Future Additions

### 13.1 Movable Props
Movable props are not part of the first version, but could be added later to deepen pretend play.

Future prop interaction verbs could include:
- Tap: trigger animation/sound
- Drag: move or reposition
- Drop-on-character: use/wear/eat/hold
- Drop-in-container: organize, clean up, shop, cook
- Repeat interaction: discover alternate reactions

Possible future prop examples:
- Boots can be placed on a character before jumping in puddles
- Toothbrush starts brushing animation
- Paintbrush changes canvas color
- Watering can grows flowers
- Shopping basket accepts grocery items

### 13.2 Additional Locations

Future locations can expand the world once the first three scenes feel rich and replayable.

1. **Supermarket**
   - Put items in basket, scan groceries, choose snacks, help pack bags

2. **Grandparents’ Garden**
   - Plant seeds, water flowers, pick vegetables, find bugs, have a picnic

### 13.3 Additional Characters

Future characters could include friends, grandparents, teachers, and other familiar community characters.

### 13.4 Dress-Up
Dress-up is not part of the first version, but could be added later as a wardrobe system.

Possible future items:
- Hats
- Boots
- Coats
- Pajamas
- Costumes
- Glasses
- Bags/accessories

If added, outfits should work across multiple scenes and create playful reactions without becoming a required progression system.
