# Modding Guide - My Football Career Sim

This guide explains how to create community patches (mods) for My Football Career Sim's localization system. Patches allow you to customize translations, add real team/competition names, or create entirely new localizations.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Patch Structure](#patch-structure)
3. [Patchable Content](#patchable-content)
4. [Examples](#examples)
5. [Validation](#validation)
6. [Distribution](#distribution)

---

## Quick Start

### Minimal Patch Example

Create a JSON file (e.g., `real-names-patch.json`):

```json
{
  "metadata": {
    "version": "1.0.0",
    "name": "Real Names Europe",
    "author": "YourName"
  },
  "universal": {
    "competitionNames": {
      "championsLeague": "UEFA Champions League",
      "europaLeague": "UEFA Europa League"
    }
  }
}
```

Load this file in-game via **Settings → Community Patches → Choose Patch JSON**.

---

## Patch Structure

Every patch follows this structure:

```json
{
  "metadata": {
    "version": "1.0.0",
    "name": "Patch Name",
    "author": "Author Name",
    "description": "Optional description"
  },
  "universal": {
    // Applied to ALL languages
  },
  "languages": {
    "en": { /* English-specific overrides */ },
    "pt": { /* Portuguese-specific overrides */ },
    "es": { /* Spanish-specific overrides */ }
    // ... other language codes
  }
}
```

### Priority System

1. **Universal section** - Applied first to all languages
2. **Languages section** - Applied on top, per-language

This means if you set `universal.competitionNames.championsLeague = "UEFA CL"` and `languages.pt.competitionNames.championsLeague = "Liga dos Campeões da UEFA"`, Portuguese users will see the PT version while all other languages see "UEFA CL".

---

## Patchable Content

### ⚠️ IMPORTANT: Only these namespaces are allowed!

| Namespace | Description | Example Key |
|-----------|-------------|-------------|
| `countries` | Country names | `"Brazil": "Brasil do Samba"` |
| `nationality` | Nationality adjectives | `"brazilian": "Brasileiro"` |
| `continents` | Continent names | `"southAmerica": "América do Sul"` |
| `leagues` | League names by country | `"Brazil": "Brasileirão"` |
| `cups` | Domestic cup names | `"Brazil": "Copa do Brasil"` |
| `competitionNames` | Competition display names | `"championsLeague": "UEFA Champions League"` |
| `competition` | Competition-related text | Competition descriptions |
| `trophy` | Individual trophy names | `"championsLeague": "Champions League Trophy"` |
| `trophies` | Trophy collections | Trophy group names |
| `trophiesSection` | Trophy UI sections | Section headers |
| `award` | Individual award names | `"ballonDor": "Ballon d'Or"` |
| `awardsSection` | Award UI sections | Section headers |
| `awardGroups` | Award categories | Category names |
| `tier` | League tier labels | `"tier1": "First Division"` |
| `careerTiers` | Career tier descriptions | Career level text |

### ❌ Protected Namespaces (CANNOT Patch)

These will cause validation errors:

- `ui` - User interface text
- `attributes` - Player attributes  
- `training` - Training system
- `mechanics` - Game mechanics
- `events` - Game events
- `news` - News system (use content files instead)
- `media` - Media system
- `gameplay` - Core gameplay

---

## Examples

### Example 1: Rename Countries

```json
{
  "metadata": {
    "version": "1.0.0",
    "name": "Custom Country Names",
    "author": "YourName"
  },
  "universal": {
    "countries": {
      "Brazil": "Brasil do Samba",
      "brazil": "Brasil do Samba",
      "England": "Inglaterra",
      "Germany": "Alemanha"
    }
  }
}
```

### Example 2: Real Competition Names

```json
{
  "metadata": {
    "version": "1.0.0",
    "name": "UEFA Names Pack",
    "author": "YourName"
  },
  "universal": {
    "competitionNames": {
      "championsLeague": "UEFA Champions League",
      "europaLeague": "UEFA Europa League",
      "conferenceLeague": "UEFA Conference League"
    },
    "trophy": {
      "championsLeague": "UEFA Champions League",
      "europaLeague": "UEFA Europa League"
    }
  }
}
```

### Example 3: Multi-Language Support

```json
{
  "metadata": {
    "version": "1.0.0",
    "name": "Localized UEFA Names",
    "author": "YourName"
  },
  "universal": {
    "competitionNames": {
      "championsLeague": "UEFA Champions League"
    }
  },
  "languages": {
    "pt": {
      "competitionNames": {
        "championsLeague": "Liga dos Campeões da UEFA"
      }
    },
    "es": {
      "competitionNames": {
        "championsLeague": "Liga de Campeones de la UEFA"
      }
    },
    "fr": {
      "competitionNames": {
        "championsLeague": "Ligue des Champions de l'UEFA"
      }
    }
  }
}
```

### Example 4: Real League Names

```json
{
  "metadata": {
    "version": "1.0.0",
    "name": "Real League Names",
    "author": "YourName"
  },
  "universal": {
    "leagues": {
      "England": "Premier League",
      "Spain": "La Liga",
      "Germany": "Bundesliga",
      "Italy": "Serie A",
      "France": "Ligue 1",
      "Brazil": "Brasileirão Série A"
    },
    "cups": {
      "England": "FA Cup",
      "Spain": "Copa del Rey",
      "Germany": "DFB-Pokal",
      "Brazil": "Copa do Brasil"
    }
  }
}
```

### Example 5: Award Names

```json
{
  "metadata": {
    "version": "1.0.0",
    "name": "Real Awards",
    "author": "YourName"
  },
  "universal": {
    "award": {
      "ballonDor": "Ballon d'Or",
      "fifaBest": "FIFA The Best",
      "goldenBoy": "Golden Boy Award",
      "goldenBoot": "European Golden Shoe"
    }
  }
}
```

---

## Validation

Before a patch is applied, it's validated for:

1. **Required metadata** - Must have `version` (semver format: X.X.X) and `name`
2. **Valid JSON structure** - Must be valid JSON
3. **Allowed namespaces only** - See list above
4. **No protected namespaces** - Cannot modify core game mechanics
5. **String values only** - Values must be strings or nested objects

### Common Validation Errors

| Error | Solution |
|-------|----------|
| `metadata.version is required` | Add `"version": "1.0.0"` |
| `metadata.name is required` | Add `"name": "Your Patch Name"` |
| `Version must follow semver format` | Use format like `1.0.0`, `2.1.3` |
| `Namespace 'xxx' is not patchable` | Use only allowed namespaces (see list above) |
| `Protected namespace detected` | Remove ui, attributes, training, etc. |

---

## Key IDs Reference

### Competition IDs (use in `competitionNames` and `trophy`)

```
championsLeague       - Top European club competition
europaLeague          - Second-tier European competition
conferenceLeague      - Third-tier European competition
libertadores          - Top South American competition
copaSudamericana      - Second-tier South American competition
afcChampionsLeague    - Top Asian competition
cafChampionsLeague    - Top African competition
concacafChampionsCup  - Top North American competition
clubWorldCup          - Club World Championship
worldCup              - National team World Cup
nationsLeague         - National team Nations League
```

### Award IDs (use in `award`)

```
ballonDor             - Best Player Award
fifaBest              - FIFA The Best
goldenBoot            - Top Scorer Award
goldenBoy             - Young Player Award
teamOfTheYear         - Team of the Year
bestGoalkeeperAward   - Best Goalkeeper Award
```

---

## Distribution

### Sharing Your Patch

1. **Discord** - Share the `.json` file in community channels
2. **GitHub** - Create a repository with your patches
3. **Direct Link** - Host on any file hosting service

### File Naming Convention

Use descriptive names:
- `real-names-europe-v1.0.0.json`
- `localized-competitions-pt-v2.1.0.json`
- `full-licensing-pack-v1.0.0.json`

---

## Language Codes

| Code | Language |
|------|----------|
| `en` | English |
| `pt` | Portuguese (BR) |
| `es` | Spanish |
| `fr` | French |
| `ar` | Arabic |
| `ja` | Japanese |
| `ko` | Korean |
| `ru` | Russian |
| `tr` | Turkish |
| `id` | Indonesian |

---

## Best Practices

1. **Start Small** - Begin with one namespace before creating large packs
2. **Test Thoroughly** - Load your patch and verify all screens display correctly
3. **Version Control** - Use semantic versioning (1.0.0, 1.1.0, 2.0.0)
4. **Check Allowed Namespaces** - Only use namespaces from the allowed list
5. **Community Standards** - Use consistent IDs with other community patches

---

## Troubleshooting

### "Namespace 'geography' is not patchable"

Use the correct namespace:
- ❌ `geography.countries.Brazil`
- ✅ `countries.Brazil`

### "Namespace 'competitions' is not patchable"

Use the correct namespace:
- ❌ `competitions.championsLeague`
- ✅ `competitionNames.championsLeague`

### Patch installed but changes not visible

1. Close and reopen the app
2. Check if the patch is enabled in Community Patches
3. Verify the key names match exactly (case-sensitive)

---

*Happy Modding! ⚽*
