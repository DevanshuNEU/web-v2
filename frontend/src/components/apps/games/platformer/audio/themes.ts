/**
 * Which track a level's theme plays. One chapter, one mood: the Austin
 * rooftops, the trip (airport and the red-eye over the clouds), the campus
 * after midnight, and Boston from night into sunrise. The boss fight picks
 * 'boss' itself; it is not a theme. Unknown themes get the rooftops.
 */

import type { TrackId } from './tracks';

const BY_THEME: Readonly<Record<string, TrackId>> = {
  // chapter 1, Austin
  austin: 'rooftops',
  rooftops: 'rooftops',
  // chapter 2, the trip
  airport: 'trip',
  clouds: 'trip',
  flight: 'trip',
  // chapter 3, Northeastern
  campus: 'campus',
  library: 'campus',
  tracks: 'campus',
  isec: 'campus',
  // chapter 4, Boston nights into sunrise
  boston: 'boston',
  newbury: 'boston',
  charles: 'boston',
  river: 'boston',
  seaport: 'boston',
  harbor: 'boston',
  revere: 'boston',
  beach: 'boston',
  zakim: 'boston',
  // the old cartoon worlds
  grass: 'rooftops',
  cave: 'caves',
  sky: 'ruins',
  stars: 'secret',
};

export function trackForTheme(theme: string): TrackId {
  return Object.prototype.hasOwnProperty.call(BY_THEME, theme) ? BY_THEME[theme] : 'rooftops';
}
