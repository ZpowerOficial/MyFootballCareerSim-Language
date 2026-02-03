# Modding Guide - My Football Career Sim

This guide explains how to create community patches (mods) for My Football Career Sim's localization system. Patches allow you to customize translations, add real team/competition names, or create entirely new localizations.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Patch Structure](#patch-structure)
3. [Patchable Content](#patchable-content)
4. [Examples](#examples)
5. [Reference System](#reference-system)
6. [Validation](#validation)
7. [Distribution](#distribution)

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
    "competitions": {
      "championsLeague": "UEFA Champions League",
      "europaLeague": "UEFA Europa League"
    }
  }
}
```

Load this file in-game via **Settings → Patch Manager → Add Patch**.

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

This means if you set `universal.competitions.championsLeague = "UEFA CL"` and `languages.pt.competitions.championsLeague = "Liga dos Campeões da UEFA"`, Portuguese users will see the PT version while all other languages see "UEFA CL".

---

## Patchable Content

### Content Categories

Only these namespaces can be modified via patches:

| Namespace | Description | File |
|-----------|-------------|------|
| `geography` | Countries, nationalities, continents | `content/geography.json` |
| `competitions` | Leagues, cups, continental competitions | `content/competitions.json` |
| `trophies` | Trophy names and sections | `content/trophies.json` |
| `awards` | Individual awards (Golden Ball, etc.) | `content/awards.json` |
| `news` | News headlines templates | `templates/news.json` |
| `media` | Social media reactions | `templates/media.json` |

### Protected Namespaces (Cannot Patch)

These are core game mechanics and cannot be modified:

- `attributes` - Player attributes
- `training` - Training system
- `ui` - User interface text
- `mechanics` - Game mechanics (morale, form, etc.)

---

## Examples

### Example 1: Rename a Competition

To rename the "European Champions Cup" to "UEFA Champions League":

```json
{
  "metadata": {
    "version": "1.0.0",
    "name": "UEFA Names Pack"
  },
  "universal": {
    "competitions": {
      "championsLeague": "UEFA Champions League"
    },
    "trophies": {
      "championsLeague": "UEFA Champions League"
    }
  }
}
```

### Example 2: Multi-Language Competition Names

```json
{
  "metadata": {
    "version": "1.0.0",
    "name": "Localized UEFA Names"
  },
  "universal": {
    "competitions": {
      "championsLeague": "UEFA Champions League"
    }
  },
  "languages": {
    "pt": {
      "competitions": {
        "championsLeague": "Liga dos Campeões da UEFA"
      }
    },
    "es": {
      "competitions": {
        "championsLeague": "Liga de Campeones de la UEFA"
      }
    },
    "fr": {
      "competitions": {
        "championsLeague": "Ligue des Champions de l'UEFA"
      }
    }
  }
}
```

### Example 3: Real Country Names

```json
{
  "metadata": {
    "version": "1.0.0",
    "name": "Real Country Names"
  },
  "universal": {
    "geography": {
      "countries": {
        "England": "England",
        "Germany": "Germany",
        "Spain": "Spain",
        "France": "France",
        "Italy": "Italy"
      }
    }
  }
}
```

### Example 4: Award Names

```json
{
  "metadata": {
    "version": "1.0.0",
    "name": "Real Awards"
  },
  "universal": {
    "awards": {
      "ballonDor": "Ballon d'Or",
      "fifaBest": "FIFA The Best",
      "goldenBoy": "Golden Boy Award"
    }
  }
}
```

### Example 5: News Headlines

News templates support dynamic variables:

```json
{
  "metadata": {
    "version": "1.0.0",
    "name": "Custom Headlines"
  },
  "universal": {
    "news": {
      "championsLeague": {
        "1": "GLORY! {team} win the UEFA Champions League!",
        "2": "{name} leads {team} to Champions League triumph!"
      }
    }
  }
}
```

Available variables:
- `{name}` - Player name
- `{team}` - Club name
- `{country}` - Country name
- `{goals}` - Goals count
- `{assists}` - Assists count
- `{year}` - Current year

---

## Reference System

Use `{{ref:path}}` to reference other translation keys dynamically:

```json
{
  "news": {
    "championsLeague": {
      "1": "GLORY! {team} win the {{ref:competitions.championsLeague}}!"
    }
  }
}
```

This will automatically insert the competition name (respecting any patches applied).

### Reference Paths

| Path | Description |
|------|-------------|
| `competitions.championsLeague` | Champions League name |
| `competitions.europaLeague` | Europa League name |
| `competitions.worldCup` | World Cup name |
| `awards.ballonDor` | Ballon d'Or name |
| `geography.countries.England` | Country name |

---

## Validation

Before a patch is applied, it's validated for:

1. **Required metadata** - Must have `version` and `name`
2. **Valid JSON structure** - Must be valid JSON
3. **Protected namespaces** - Cannot modify core game mechanics
4. **Security** - No HTML, scripts, or malicious content

### Common Validation Errors

| Error | Solution |
|-------|----------|
| `metadata.version is required` | Add `"version": "1.0.0"` |
| `metadata.name is required` | Add `"name": "Your Patch Name"` |
| `Protected namespace detected: ui` | Remove `ui` section - it's protected |
| `Invalid characters detected` | Remove HTML tags or special characters |

---

## Key IDs Reference

### Competition IDs

```
championsLeague       - UEFA Champions League equivalent
europaLeague          - UEFA Europa League equivalent
conferenceLeague      - UEFA Conference League equivalent
libertadores          - Copa Libertadores equivalent
copaSudamericana      - Copa Sudamericana equivalent
afcChampionsLeague    - AFC Champions League equivalent
cafChampionsLeague    - CAF Champions League equivalent
concacafChampionsCup  - CONCACAF Champions Cup equivalent
clubWorldCup          - FIFA Club World Cup equivalent
worldCup              - FIFA World Cup equivalent
nationsLeague         - UEFA Nations League equivalent
```

### Award IDs

```
ballonDor             - Ballon d'Or
fifaBest              - FIFA The Best
goldenBoot            - Top Scorer Award
goldenBoy             - Young Player Award
teamOfTheYear         - Team of the Year
bestGoalkeeperAward   - Best Goalkeeper Award
```

### Trophy IDs

```
league                - Domestic League title
cup                   - Domestic Cup title
superCup              - Domestic Super Cup
championsLeague       - Top continental trophy
europaLeague          - Second-tier continental
conferenceLeague      - Third-tier continental
clubWorldCup          - Club World Championship
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
| `de` | German |
| `it` | Italian |
| `ar` | Arabic |
| `ja` | Japanese |
| `ko` | Korean |
| `ru` | Russian |
| `tr` | Turkish |
| `id` | Indonesian |

---

## Best Practices

1. **Start Small** - Begin with one competition/award before creating large packs
2. **Test Thoroughly** - Load your patch and verify all screens display correctly
3. **Version Control** - Use semantic versioning (1.0.0, 1.1.0, 2.0.0)
4. **Document Changes** - Include a changelog in your patch description
5. **Community Standards** - Use consistent IDs with other community patches

---

## Support

- **Discord**: [Community Server](#)
- **GitHub Issues**: [Report Bugs](#)
- **Wiki**: [Extended Documentation](#)

---

*Happy Modding! ⚽*
