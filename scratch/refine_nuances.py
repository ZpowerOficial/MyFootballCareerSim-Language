import os
import json

langs = ['ar', 'es', 'fr', 'id', 'ja', 'ko', 'ru', 'tr']

refinements = {
    'es': {
        "se omitió con demasiada facilidad": "fue superado con demasiada facilidad",
        "se omitió con demasiada facilidad.": "fue superado con demasiada facilidad."
    },
    'fr': {
        "a été contourné trop facilement": "a été éliminé trop facilement",
        "a été contourné trop facilement.": "a été éliminé trop facilement."
    },
    'tr': {
        "çok kolay bir şekilde atlandı": "çok kolay geçildi",
        "çok kolay bir şekilde atlandı.": "çok kolay geçildi."
    },
    'id': {
        "dilewati dengan terlalu mudah": "terlalu mudah dilewati",
        "dilewati dengan terlalu mudah.": "terlalu mudah dilewati."
    },
    'ja': {
        "ありました！": "いました！",
        "まともなゲームですが、特別なことは何もありません。": "まずまずの出来でしたが、特筆すべき点はありませんでした。",
        "バイパスされました": "簡単に突破されました"
    },
    'ko': {
        "공연이었습니다": "활약이었습니다",
        "괜찮은 게임이지만 특별한 것은 없습니다.": "무난한 활약을 보여주었지만, 특별히 눈에 띄는 모습은 없었습니다.",
        "강도가 부족합니다. {name}가 너무 쉽게 우회되었습니다.": "경기 템포를 따라가지 못했고, {name}은 너무 쉽게 뚫렸습니다."
    },
    'ru': {
        "слишком легко обошли.": "слишком легко обыгрывали.",
        "слишком легко обошли": "слишком легко обыгрывали"
    }
}

for lang in langs:
    if lang not in refinements:
        continue
    
    print(f"Refining {lang}...")
    lang_rules = refinements[lang]
    
    for root_dir, dirs, files in os.walk(lang):
        for file in files:
            if file.endswith('.json'):
                path = os.path.join(root_dir, file)
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                def traverse_and_replace(obj):
                    if isinstance(obj, dict):
                        for k, v in list(obj.items()):
                            if isinstance(v, str):
                                for target, repl in lang_rules.items():
                                    if target in v:
                                        v = v.replace(target, repl)
                                obj[k] = v
                            else:
                                traverse_and_replace(v)
                    elif isinstance(obj, list):
                        for i, item in enumerate(obj):
                            if isinstance(item, str):
                                for target, repl in lang_rules.items():
                                    if target in item:
                                        item = item.replace(target, repl)
                                obj[i] = item
                            else:
                                traverse_and_replace(item)
                
                traverse_and_replace(data)
                
                with open(path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)

print("Refinement Done!")
