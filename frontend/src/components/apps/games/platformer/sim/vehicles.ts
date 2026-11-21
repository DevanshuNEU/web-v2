/**
 * Vehicles: the Green Line trolley and the trains under the footbridge. One
 * mechanic for all of them. A vehicle runs along a lane (the tile row of its
 * roof, between two columns) at a steady speed: in from beyond one end of
 * the lane, out past the other, then it waits `gap` seconds off the lane and
 * runs again. Its roof is a one-way floor that carries whatever stands on it;
 * its body is scenery (she passes in front of it) and never hurts her.
 *
 * Where a vehicle is depends only on the time, never on what she does, so a
 * replay sees the same timetable. Signals (`s` in the level) on a lane turn
 * green for SIGNAL_LEAD seconds before a vehicle reaches them.
 */

export type VehicleKind = 'trolley' | 'orangeTrain' | 'commuterTrain';

/** A lane and its timetable, as the level writes it (tile units, seconds). */
export interface VehicleDef {
  kind: VehicleKind;
  /** The tile row of the roof top. */
  row: number;
  /** The lane's first and last column: the vehicle enters beyond one and leaves past the other. */
  x0: number;
  x1: number;
  /** Tiles per second. */
  speed: number;
  /** 1 runs right (in at x0), -1 runs left (in at x1). */
  dir: 1 | -1;
  /** Seconds off the lane between runs. */
  gap: number;
  /** Seconds before the first run starts (0 when unset). */
  offset?: number;
}

/** A vehicle now. x is the left edge, y the roof top (tile units); px, py where it was a step ago. */
export interface Vehicle {
  kind: VehicleKind;
  x: number; y: number; w: number; h: number;
  /** Tiles per second, signed. */
  vx: number;
  /** On its lane now (false while it waits between runs). */
  active: boolean;
  px: number; py: number;
}

/** Sizes in tiles. */
export const VEHICLE_SIZE: Readonly<Record<VehicleKind, { w: number; h: number }>> = {
  trolley: { w: 6, h: 2 },
  orangeTrain: { w: 8, h: 2 },
  commuterTrain: { w: 8, h: 2.5 },
};

/** Seconds a signal shows green before a vehicle reaches it. */
export const SIGNAL_LEAD = 1;

/** Seconds one run takes: the whole lane plus the vehicle's own length. */
export function runTime(d: VehicleDef): number {
  return (d.x1 + 1 - d.x0 + VEHICLE_SIZE[d.kind].w) / d.speed;
}

function period(d: VehicleDef): number {
  return runTime(d) + d.gap;
}

/** Where the left edge is `p` seconds into a run. */
function edgeAt(d: VehicleDef, p: number): number {
  const w = VEHICLE_SIZE[d.kind].w;
  return d.dir > 0 ? d.x0 - w + d.speed * p : d.x1 + 1 - d.speed * p;
}

export function createVehicle(d: VehicleDef): Vehicle {
  const { w, h } = VEHICLE_SIZE[d.kind];
  const x = edgeAt(d, 0);
  return { kind: d.kind, x, y: d.row, w, h, vx: 0, active: false, px: x, py: d.row };
}

/** Put a vehicle where its timetable says at time t. Off its lane it waits at the run's start. */
export function placeVehicle(v: Vehicle, d: VehicleDef, t: number) {
  v.px = v.x; v.py = v.y;
  const u = t - (d.offset ?? 0);
  const p = u < 0 ? -1 : u % period(d);
  v.active = p >= 0 && p < runTime(d);
  v.x = edgeAt(d, v.active ? p : 0);
  v.vx = v.active ? d.dir * d.speed : 0;
}

/** Seconds from time t until a vehicle's front next reaches column `col` (the side it comes from). */
export function arrivalIn(d: VehicleDef, t: number, col: number): number {
  const at = d.dir > 0 ? (col - d.x0) / d.speed : (d.x1 - col) / d.speed;
  const off = d.offset ?? 0;
  if (t < off + at) return off + at - t;
  const P = period(d);
  const since = (t - off - at) % P;
  return since === 0 ? 0 : P - since;
}
