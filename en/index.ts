import trophies from './trophies.json';
import ui from './ui.json';
import events from './events.json';
import news from './news.json';
import database from './database.json';
import stats from './stats.json';
import gameplay from './gameplay.json';
import media from './media.json';
import legacy from './legacy.json'; // O backup de segurança

// Aqui a mágica acontece: Espalhamos (...) tudo num objeto só
const files: any[] = [trophies, ui, events, news, database, stats, gameplay, media, legacy];
const translations = files.reduce((acc, file) => {
    Object.keys(file).forEach(key => {
        if (typeof file[key] === 'object' && file[key] !== null && !Array.isArray(file[key])) {
            acc[key] = { ...acc[key], ...file[key] };
        } else {
            acc[key] = file[key];
        }
    });
    return acc;
}, {} as any);

export default translations;