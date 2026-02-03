/**
 * English Translations - Layered Architecture
 * 
 * Structure:
 * - core/: Non-patchable (UI, mechanics, attributes)
 * - content/: Patchable (geography, competitions, trophies, awards)
 * - templates/: Patchable (news, media with {{ref:}} support)
 * 
 * Legacy files are still imported for backward compatibility
 * but will be gradually deprecated in favor of the layered structure
 */

// Legacy imports (for backward compatibility during migration)
import trophies from './trophies.json';
import ui from './ui.json';
import events from './events.json';
import news from './news.json';
import database from './database.json';
import stats from './stats.json';
import gameplay from './gameplay.json';
import media from './media.json';
import legacy from './legacy.json';

// New layered structure imports
import core from './core';
import { contentFlat } from './content';
import templates from './templates';

// Merge legacy files (existing behavior)
const legacyFiles: any[] = [trophies, ui, events, news, database, stats, gameplay, media, legacy];
const legacyTranslations = legacyFiles.reduce((acc, file) => {
    Object.keys(file).forEach(key => {
        if (typeof file[key] === 'object' && file[key] !== null && !Array.isArray(file[key])) {
            acc[key] = { ...acc[key], ...file[key] };
        } else {
            acc[key] = file[key];
        }
    });
    return acc;
}, {} as any);

// Final translations: Legacy base + New layered overrides
// New structure takes precedence to allow gradual migration
const translations = {
    ...legacyTranslations,
    // New layered content (will override legacy as we migrate)
    // Uncomment these as migration progresses:
    // ...core,
    // ...contentFlat,
    // ...templates,
};

export default translations;

// Export new structure for direct access
export { core, contentFlat as content, templates };
