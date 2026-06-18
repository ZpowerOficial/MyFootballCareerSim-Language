
import os, json, re

langs = ['ar', 'es', 'fr', 'id', 'ja', 'ko', 'ru', 'tr']

continents_trans = {
    'ar': {'African': 'أفريقيا', 'Asian': 'آسيا', 'European': 'أوروبا', 'North American': 'أمريكا الشمالية', 'South American': 'أمريكا الجنوبية', 'Oceania': 'أوقيانوسيا'},
    'es': {'African': 'Africana', 'Asian': 'Asiática', 'European': 'Europea', 'North American': 'Norteamericana', 'South American': 'Sudamericana', 'Oceania': 'de Oceanía'},
    'fr': {'African': "d'Afrique", 'Asian': "d'Asie", 'European': "d'Europe", 'North American': "d'Amérique du Nord", 'South American': "d'Amérique du Sud", 'Oceania': "d'Océanie"},
    'id': {'African': 'Afrika', 'Asian': 'Asia', 'European': 'Eropa', 'North American': 'Amerika Utara', 'South American': 'Amerika Selatan', 'Oceania': 'Oseania'},
    'ja': {'African': 'アフリカ', 'Asian': 'アジア', 'European': 'ヨーロッパ', 'North American': '北米', 'South American': '南米', 'Oceania': 'オセアニア'},
    'ko': {'African': '아프리카', 'Asian': '아시아', 'European': '유럽', 'North American': '북미', 'South American': '남미', 'Oceania': '오세아니아'},
    'ru': {'African': 'Африки', 'Asian': 'Азии', 'European': 'Европы', 'North American': 'Северной Америки', 'South American': 'Южной Америки', 'Oceania': 'Океании'},
    'tr': {'African': 'Afrika', 'Asian': 'Asya', 'European': 'Avrupa', 'North American': 'Kuzey Amerika', 'South American': 'Güney Amerika', 'Oceania': 'Okyanusya'}
}

# Tradução de Cup e Champions e Access nos idiomas
cup_patterns = {
    # T1, T2, T3
    'ar': ('كأس أبطال {continent}', 'كأس أندية {continent}', 'كأس الوصول {continent}'),
    'es': ('Copa {continent} de Campeones', 'Copa {continent} de Clubes', 'Copa {continent} de Acceso'),
    'fr': ('Coupe des Champions {continent}', 'Coupe des Clubs {continent}', 'Coupe d'Accès {continent}'),
    'id': ('Piala Champions {continent}', 'Piala Klub {continent}', 'Piala Akses {continent}'),
    'ja': ('{continent}チャンピオンズカップ', '{continent}クラブカップ', '{continent}アクセスカップ'),
    'ko': ('{continent} 챔피언스컵', '{continent} 클럽컵', '{continent} 액세스컵'),
    'ru': ('Кубок чемпионов {continent}', 'Клубный кубок {continent}', 'Кубок доступа {continent}'),
    'tr': ('{continent} Şampiyonlar Kupası', '{continent} Kulüpler Kupası', '{continent} Erişim Kupası')
}

youth_suffix = {
    'ar': '{subject} للشباب',
    'es': '{subject} Juvenil',
    'fr': '{subject} Jeunes',
    'id': '{subject} Pemuda',
    'ja': '{subject}ユース',
    'ko': '{subject} 청소년',
    'ru': '{subject} Молодежный',
    'tr': '{subject} Gençler'
}

country_names_en = ['Argentina', 'Australia', 'Austria', 'Belgium', 'Brazil', 'China', 'Colombia', 'Egypt', 'England', 'France', 'Germany', 'Greece', 'India', 'Italy', 'Japan', 'Mexico', 'Morocco', 'Netherlands', 'Poland', 'Portugal', 'Russia', 'Saudi Arabia', 'Scotland', 'South Korea', 'Spain', 'Switzerland', 'Turkey', 'USA', 'Ukraine', 'Uruguay', 'Sweden', 'Denmark', 'Norway', 'Finland', 'Croatia', 'Serbia', 'Romania', 'Bolivia', 'Bulgaria', 'Chile', 'Czech Republic', 'Ecuador', 'Hungary', 'Iceland', 'Iran', 'Ireland', 'Israel', 'Nigeria', 'Paraguay', 'Peru', 'Qatar', 'Slovakia', 'Slovenia', 'UAE', 'Uzbekistan', 'Venezuela', 'Vietnam', 'Malaysia', 'São Paulo', 'Europe', 'UEFA']

for lang in langs:
    print(f"Processing {lang}...")
    # 1. Carregar geography.json se existir para tradução de países
    geo_path = f"{lang}/content/geography.json"
    country_map = {}
    if os.path.exists(geo_path):
        with open(geo_path, 'r', encoding='utf-8') as f:
            geo_data = json.load(f)
            country_map = geo_data.get('countries', {})
    
    # Adicionar traduções manuais ou fallback
    country_map['Europe'] = continents_trans[lang]['European']
    country_map['UEFA'] = 'UEFA'
    
    # Fallback de continentes no mapa de países
    for k, v in continents_trans[lang].items():
        # African -> África
        clean_k = k.replace('n', '').replace('ean', '').replace(' American', ' do Norte/Sul') # Simplificado
        country_map[k] = v
        # Também mapear para 'África', etc.
        if k == 'African': country_map['Africa'] = v
        if k == 'Asian': country_map['Asia'] = v
        if k == 'European': country_map['Europe'] = v
        if k == 'North American': country_map['North America'] = v
        if k == 'South American': country_map['South America'] = v
        if k == 'Oceania': country_map['Oceania'] = v

    # Para 'São Paulo', tradução local é geralmente a mesma ou similar
    country_map['São Paulo'] = 'São Paulo'
    
    def translate_youth(subject_en):
        # Extrair o país/continente
        subject_trans = country_map.get(subject_en, subject_en)
        return youth_suffix[lang].format(subject=subject_trans)

    def unify_competition_name(name_en):
        # Checar se é copas de clubes continentais
        for cont in ['African', 'Asian', 'European', 'North American', 'South American', 'Oceania']:
            if cont in name_en:
                cont_trans = continents_trans[lang][cont]
                t1, t2, t3 = cup_patterns[lang]
                if 'Champions Cup' in name_en or 'Champions League' in name_en:
                    return t1.format(continent=cont_trans)
                elif 'Club Cup' in name_en or 'Confederation Cup' in name_en or 'Cup' in name_en or 'League' in name_en:
                    return t2.format(continent=cont_trans)
                elif 'Access Cup' in name_en or 'Shield' in name_en or 'Qualifier Cup' in name_en:
                    return t3.format(continent=cont_trans)
        
        # Checar se é juvenil
        if name_en.startswith('Youth ') or ' U20 ' in name_en or ' Youth ' in name_en or ' Reserve ' in name_en or name_en.endswith(' Youth Cup') or name_en.endswith(' Youth League') or name_en.endswith(' Reserve League') or name_en.endswith(' U20 Cup') or name_en.endswith(' U20 League'):
            # Encontrar qual país/continente
            for c in country_names_en:
                if c in name_en:
                    return translate_youth(c)
            # Geral Youth Cup / Youth League
            if 'Cup' in name_en:
                return youth_suffix[lang].format(subject='Cup') # Fallback local
            if 'League' in name_en:
                return youth_suffix[lang].format(subject='League')
            
        return None

    # Processar cada arquivo de tradução do idioma
    for root_dir, dirs, files in os.walk(lang):
        for file in files:
            if file.endswith('.json'):
                path = os.path.join(root_dir, file)
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Modificar strings que batem com as chaves a unificar
                def traverse_and_update(obj, key_context=None):
                    if isinstance(obj, dict):
                        for k, v in list(obj.items()):
                            if isinstance(v, str):
                                # Se a própria chave k ou o valor v pode guiar a unificação
                                # Usamos v se v for em inglês ou se k for a chave inglesa
                                new_val = unify_competition_name(k)
                                if new_val:
                                    obj[k] = new_val
                                else:
                                    # Caso o valor v tenha sido traduzido incorretamente mas a chave k é o nome original em inglês
                                    new_val_from_key = unify_competition_name(k)
                                    if new_val_from_key:
                                        obj[k] = new_val_from_key
                            else:
                                traverse_and_update(v, k)
                    elif isinstance(obj, list):
                        for item in obj:
                            traverse_and_update(item)
                
                traverse_and_update(data)
                
                with open(path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)

print("Unification Done!")
