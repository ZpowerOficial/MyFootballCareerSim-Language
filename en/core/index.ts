/**
 * Core translations - Non-patchable UI and gameplay mechanics
 * These are protected from community patches to ensure game stability
 */

import attributes from './attributes.json';
import training from './training.json';
import mechanics from './mechanics.json';
import traits from './traits.json';
import goals from './goals.json';

export const core = {
  ...attributes,
  ...training,
  ...mechanics,
  ...traits,
  ...goals,
};

export default core;
