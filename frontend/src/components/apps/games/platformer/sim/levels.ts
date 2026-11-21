/**
 * Main Character level data. Each level is a list of string rows, 14 rows
 * tall, one character per tile. `parseLevel` in ./level.ts turns them into a
 * tile grid plus entity spawns. World 1 (neon rooftops) is generated per
 * seed from the chunks in ./chunks/rooftops.ts by ./generate.ts; worlds 2
 * and 3 are the hand-made levels below; the secret fourth level is built in
 * code from a name (see ./level.ts).
 *
 * Legend
 *   .  empty
 *   #  ground (solid; drawn as grass, cave rock or cloud by world)
 *   B  brick (solid; breaks when hit from below while wearing the Aura Crown)
 *   ?  coin block (solid; pops a coin when hit from below, then turns dull)
 *   C  aura block holding the Aura Crown (one per level at most)
 *   X  stone block (solid, never breaks; stairs)
 *   ^  spikes (solid; touching them hurts)
 *   o  coin
 *   P  hero start (feet rest on the tile below)
 *   K  checkpoint (Capybarra Wi-Fi; respawn point once reached)
 *   F  flagpole top (the very top tile)
 *   |  flagpole body
 *   n  Pebble Rizzo, the NPC walker (turns at walls and ledges)
 *   f  Frogatti Bossini, the hopping frog
 *   -  horizontal moving platform (a run of dashes is one platform)
 *   !  vertical moving platform (a run of bangs is one platform)
 *
 * Rooftops (world 1)
 *   =  roof surface (solid, like #)
 *   _  one-way platform (land from above, pass from below and the side)
 *   $  golden Sigma coin (500)
 *   %  cracked wall (solid; a dash smashes it)
 *   c  Doom Crawler (walks, turns at walls and ledges)
 *   d  Ad Drone (hovers, dives at a hero below it)
 *   e  elite drone (an Ad Drone that fires slow shots)
 *   Q  shrine: touching it unlocks the level's `shrine` ability
 *   M  memory (a glowing polaroid; 3 per story level)
 *   G  goal beacon top (its mast runs down to the roof; replaces F and |)
 *   L  neon sign with its light (the blade breaks it for coins); T water
 *      tower, N antenna, U AC unit, H chimney (scenery, never solid)
 *   R  crate (solid; the blade breaks it for coins)
 *   S  the sword: gives the blade
 *   w  Bat Wings, t Taco Rush, b Priority Boarding, k Wicked Fast (optional powers)
 *
 * The trip (chapter 2)
 *   >  moving walkway carrying right, <  carrying left (solid like ground;
 *      standing on one adds WALKWAY_SPEED to her ground speed)
 *   ~  thin cloud (one-way; puffs away a moment after she lands, comes back)
 *   The scenery chars T N U H name a different prop per theme: see
 *   DECOR_BY_THEME in ./level.ts.
 *
 * Northeastern (chapter 3)
 *   s  a signal on a vehicle lane (scenery): green for SIGNAL_LEAD seconds
 *      before a vehicle on the nearest lane reaches its column
 *   k  Wicked Fast (optional power: dashes chain)
 *   The trolley and trains are not drawn in the rows: `vehicles` in the
 *   level lists their lanes and timetables.
 *
 * Boston nights (chapter 4)
 *   A  shop awning (one-way; landing on it bounces her up about 1.6 full
 *      jumps high, see PHYS.springV; she never stands on one)
 *   W  water (not solid; touching it is a fall: respawn at the checkpoint)
 *   p  pigeon (walker: hops every PIGEON.every seconds, turns at walls and ledges)
 *   g  gull (flyer: hovers, then swoops in a fast arc through her)
 *   v  Cannoli Shield (optional power: absorbs one hit)
 *   R  crates are sand sculptures on the beach (the blade breaks them)
 *   Boats (shell, sailboat) are vehicles in `vehicles`; wind gusts, crane
 *   hooks and waves are listed in the level's `gusts`, `hooks` and `waves`.
 */

import type { Ability } from './hero';
import type { VehicleDef } from './vehicles';
import type { GustDef } from './gusts';
import type { HookDef } from './hooks';
import type { WaveDef } from './waves';

export type WorldTheme = 'grass' | 'rooftops' | 'austin' | 'cave' | 'sky' | 'stars' | 'airport' | 'clouds'
  | 'campus' | 'library' | 'tracks' | 'newbury' | 'river' | 'harbor' | 'beach';

/** The sky a level is played under; the season moves it forward level by level. */
export type SkyId = 'night' | 'lateNight' | 'preDawn' | 'sunrise' | 'morning';

/**
 * A moment the view or renderer stages over a stretch of columns: `bats`
 * (the Congress Avenue bridge swarm), `prompt` (an on-screen hint, `id`
 * names it, e.g. 'doubleJump'), `descent` (the cloud floor fades into the
 * night view of the city below), `planes` (the far plane layer is busy).
 */
export interface SetPiece { kind: 'bats' | 'prompt' | 'descent' | 'planes'; x0: number; x1: number; id?: string }

export interface LevelDef {
  id: number;
  /** The ability its shrine (Q) unlocks, if it has one. */
  shrine?: Ability;
  setPieces?: readonly SetPiece[];
  /** Decoys on a roof (a pigeon, a trash can) that drones dive at while the hero is out of reach: tile x, y. */
  decoys?: readonly { x: number; y: number }[];
  /** Small line on the level card, e.g. "World 1". */
  label: string;
  /** Big line on the level card. */
  name: string;
  theme: WorldTheme;
  /** The sky preset; the renderer picks night when unset. */
  sky?: SkyId;
  /** The trolley and trains: lanes and timetables (see ./vehicles.ts). */
  vehicles?: readonly VehicleDef[];
  /** Harbor wind zones and their timetables (see ./gusts.ts). */
  gusts?: readonly GustDef[];
  /** Crane hooks swinging from booms (see ./hooks.ts). */
  hooks?: readonly HookDef[];
  /** Waves rolling up the sand (see ./waves.ts). */
  waves?: readonly WaveDef[];
  rows: readonly string[];
}

/** The hand-made worlds 2 and 3. */
export const LEVELS: readonly LevelDef[] = [
  {
    id: 2,
    label: 'World 2',
    name: 'The Ohio Caves',
    theme: 'cave',
    rows: [
      '################################################################################################################################################################..............................',
      '################################################################################################################################################################..............................',
      '..................................############....................................................................##########............................................F.....................',
      '..................................############....................................................................##########............................................|.....................',
      '..................................############....................................................................##########............................................|.....................',
      '..................................############....................................................................##########............................................|.....................',
      '..................................############.............................................oo.....................##########............................................|.....................',
      '........................................................oo.....................................oo.......................................................................|.....................',
      '..................?..BCB...oooo.....................oo..............BB?BBB.................##..................................B?B?B..................ooo..........XX...|.....................',
      '....................................oooooooo............##.............................oo......##.....................oo...............oooo.......................XXX...|.....................',
      '........ooooo.......................................##.................................##..........#.............................................................XXXX...|.....................',
      '...P............n..........^^^^.......n...f.....................f...^^^^^^......K.......................n..n...f....^^..^^....................f...f...^^^.......XXXXX...|.....................',
      '#################################################............########################................##################################....###################################################',
      '#################################################............########################................##################################....###################################################',
    ],
  },
  {
    id: 3,
    label: 'World 3',
    name: 'Sky Aura',
    theme: 'sky',
    rows: [
      '....................................................................................................................................................................................................................',
      '....................................................................................................................................................................................................................',
      '...................................................................................................................................................................................................F................',
      '...................................................................................................................................................................................................|................',
      '.........................................................oooooo....................................................................................................................................|................',
      '............................................................f......................................................................................................................................|................',
      '........................................................########oo.................................................................................................................................|................',
      '........................................................########..o......BB?BB........................oo.....................................B?B?B...............oooooo............................|................',
      '.......?..C........................................................o..................................XX...........................---..........................########......................XX...|................',
      '................ooo.........................n.....!!!................................---..................................................................!!!...########.....................XXX...|................',
      '.....ooooo..............f.......---.....########......................K....n...n.............######..........................---............n.......f.......................................XXXX...|................',
      '...P................########............########....................#############............######.............f....f...................##############..........................n....f....XXXXX...|................',
      '###############.....########............########....................#############............######........##############................##############.....................########################################',
      '###############.....########............########....................#############............######........##############................##############.....................########################################',
    ],
  },
];

