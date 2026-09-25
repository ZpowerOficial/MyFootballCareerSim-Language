import trophies from './trophies.json';
import ui from './ui.json';
import events from './events.json';
import news from './news.json';
import database from './database.json';
import stats from './stats.json';
import gameplay from './gameplay.json';
import legacy from './legacy.json';
import media from './media.json';
import { deepMerge } from '../utils/deepMerge';

const files = [trophies, ui, events, news, database, stats, gameplay, legacy, media] as Record<
    string,
    unknown
>[];

// Deep merge so later files extend nested subtrees instead of replacing them.
// A shallow namespace merge let partial objects (e.g. legacy.json) shadow
// complete translations from earlier files, dropping keys from the runtime bundle.
const translations = files.reduce(
    (acc, file) => deepMerge(acc, file),
    {} as Record<string, unknown>
);

export default translations;
