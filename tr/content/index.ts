import geography from './geography.json';
import competitions from './competitions.json';
import trophies from './trophies.json';
import awards from './awards.json';

export const content = { geography, competitions, trophies, awards };
export const contentFlat = { ...geography, ...competitions, ...trophies, ...awards };
export default content;
