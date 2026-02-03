import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuração para resolver caminhos em projetos modernos (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- MAPA DE CATEGORIAS ---
// Define para qual arquivo cada chave do JSON vai
const MAPPING = {
    'ui.json': [
        'common', 'commonExtra', 'labels', 'dashboard', 'setup', 'pauseMenu',
        'negotiation', 'donation', 'playGames', 'journey', 'leaderboard',
        'profile', 'careerStart', 'update', 'simulating', 'statusModal',
        'agentModal', 'seasonModal', 'careerModal', 'shareCard', 'clubsCount',
        'ratingShort', 'matchesShort', 'goalsShort', 'assistsShort', 'cleanSheetsShort',
        'common', 'navigation', 'buttons', 'menu', 'dialogs', 'search', 'filter', 'sort'
    ],

    'events.json': [
        'events', 'eventNotifications', 'media', 'social', 'narrative',
        'mediaNarrative', 'offer', 'contractTermination', 'status', 'interactions',
        'notifications', 'emails', 'simulating'
    ],

    'news.json': [
        'news', 'newsType', 'newsFeed', 'headlines', 'articles', 'rumors'
    ],

    'database.json': [
        'countries', 'nationality', 'country', 'continents', 'leagues', 'cups',
        'competitionNames', 'competition', 'competitionType', 'trophy',
        'trophies', 'trophiesSection', 'award', 'awardsSection', 'awardGroups',
        'positions', 'tier', 'careerTiers', 'careerPhases', 'legend', 'names',
        'clubs', 'sponsors'
    ],

    'stats.json': [
        'stats', 'detailedStats', 'careerStats', 'logs', 'history',
        'historyExtra', 'analytics', 'matchStats', 'seasonStats', 'records'
    ],

    'gameplay.json': [
        'attributes', 'training', 'development', 'youth', 'seasonFocus',
        'offers', 'goals', 'agent', 'form', 'morale', 'personality',
        'trait', 'traitStyles', 'traits', 'playerStyle', 'characteristic',
        'tactics', 'matchEngine', 'simulation', 'squadStatus'
    ]
};

async function processAllLanguages() {
    try {
        // 1. Ler todas as pastas dentro do diretório atual (ex: en, pt, ar)
        const items = fs.readdirSync(__dirname, { withFileTypes: true });
        const languageFolders = items
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        console.log(`🌍 Idiomas encontrados: ${languageFolders.join(', ')}\n`);

        // 2. Loop por cada idioma
        for (const lang of languageFolders) {
            const inputFilePath = path.join(__dirname, lang, `${lang}.json`); // ex: locales/pt/pt.json
            const outputDir = path.join(__dirname, lang);

            // Verifica se o arquivo monolítico existe
            if (!fs.existsSync(inputFilePath)) {
                console.warn(`⚠️  Pulei [${lang}]: Arquivo '${lang}.json' não encontrado.`);
                continue;
            }

            console.log(`🔨 Processando [${lang}]...`);

            const rawData = fs.readFileSync(inputFilePath, 'utf8');
            let sourceData;

            try {
                sourceData = JSON.parse(rawData);
            } catch (e) {
                console.error(`❌ Erro de JSON inválido em ${lang}.json. Pulei.`);
                continue;
            }

            const leftovers = { ...sourceData };

            // 3. Processar o mapa e criar os arquivos
            for (const [filename, keys] of Object.entries(MAPPING)) {
                const fileContent = {};
                let count = 0;

                keys.forEach(key => {
                    if (sourceData[key]) {
                        fileContent[key] = sourceData[key];
                        delete leftovers[key]; // Remove do original para ver o que sobrou
                        count++;
                    }
                });

                // Só cria o arquivo se tiver conteúdo
                if (Object.keys(fileContent).length > 0) {
                    fs.writeFileSync(
                        path.join(outputDir, filename),
                        JSON.stringify(fileContent, null, 2)
                    );
                }
            }

            // 4. Salvar o que sobrou (Legacy)
            const leftoverKeys = Object.keys(leftovers);
            if (leftoverKeys.length > 0) {
                fs.writeFileSync(
                    path.join(outputDir, 'legacy.json'),
                    JSON.stringify(leftovers, null, 2)
                );
                console.log(`   🔸 Criado 'legacy.json' com ${leftoverKeys.length} chaves não mapeadas.`);
            }

            console.log(`   ✅ Sucesso! Arquivos gerados em /${lang}`);
        }

        console.log('\n🚀 Refatoração completa de todos os idiomas!');

    } catch (error) {
        console.error('❌ Erro fatal:', error.message);
    }
}

processAllLanguages();