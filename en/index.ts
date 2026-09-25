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
import { deepMerge } from '../utils/deepMerge';

// Merge legacy files (existing behavior)
// Deep merge so later files extend nested subtrees instead of replacing them.
// A shallow namespace merge let partial objects (e.g. legacy.json) shadow
// complete translations from earlier files, dropping keys from the bundle.
const legacyFiles = [trophies, ui, events, news, database, stats, gameplay, media, legacy] as Record<
    string,
    unknown
>[];
const legacyTranslations = legacyFiles.reduce(
    (acc, file) => deepMerge(acc, file),
    {} as Record<string, unknown>
);

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
