/**
 * Content translations - Patchable by community
 * Includes: geography, competitions, trophies, awards
 * These can be modified via DataPatch to add real names, localized content, etc.
 */

import geography from './geography.json';
import competitions from './competitions.json';
import trophies from './trophies.json';
import awards from './awards.json';

export const content = {
  geography,
  competitions,
  trophies,
  awards,
};

// Flattened export for backward compatibility
export const contentFlat = {
  ...geography,
  ...competitions,
  ...trophies,
  ...awards,
};

export default content;
