# PROMPT #5 : Pipeline de Scraping Automatisé

## Objectif
Mettre en place un pipeline automatisé de collecte de données pour les variables endogènes (BRVM) et exogènes.

## Architecture du Pipeline

```
                    ┌─────────────────────────┐
                    │   scraping_master.R     │
                    │   (Orchestrateur)        │
                    └─────┬───────┬───────┬───┘
                          │       │       │
              ┌───────────┘       │       └───────────┐
              ▼                   ▼                   ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │ BRVM Data       │ │ Exogenous Data  │ │ Events Data     │
    │ (endogène)      │ │ (exogène)       │ │ (exogène qual.) │
    ├─────────────────┤ ├─────────────────┤ ├─────────────────┤
    │ - Prices        │ │ - Commodities   │ │ - Geopolitical  │
    │ - Volumes       │ │ - Macro/finance │ │ - Sanitary      │
    │ - Indices       │ │ - Taux de change│ │ - Climate       │
    │ - Capitalisation│ │ - Inflation     │ │ - Political     │
    └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
             │                   │                    │
             └───────────────────┼────────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │   data/brvm/            │
                    │   data/exogenous/       │
                    │   Fichiers CSV          │
                    └─────────────────────────┘
```

## Fréquence d'Exécution

| Script | Fréquence | Déclencheur |
|--------|-----------|-------------|
| `01_collect_brvm_prices.R` | Quotidienne | Après clôture BRVM (17h GMT) |
| `02_collect_commodities.R` | Hebdomadaire | Lundi matin |
| `03_collect_macro_finance.R` | Mensuelle | Après publication BCEAO |
| `04_collect_events.R` | À la demande / Mensuelle | Quand un événement majeur survient |
| `scraping_master.R` | Quotidienne (intégration) | À la fin de la journée |

## Format de Données Unifié

### Règles communes à tous les fichiers
- **Séparateur** : `,` (CSV)
- **Encodage** : UTF-8
- **Format date** : `YYYY-MM-DD`
- **Valeurs manquantes** : `NA`
- **Versionnage** : Git LFS recommandé pour fichiers volumineux

### Structure des fichiers dans `data/`

```
data/
├── brvm/
│   ├── ORAC.csv          # Prix historiques Orange CI
│   ├── SGBC.csv          # Prix historiques SGBCI
│   ├── SLBC.csv          # Prix historiques Solibra
│   ├── SOGC.csv          # Prix historiques SOGB
│   ├── BRVM_indices.csv  # Indices BRVM
│   ├── BRVM_cap.csv      # Capitalisations
│   └── BRVM_sectors.csv  # Données sectorielles
├── exogenous/
│   ├── commodities/
│   │   ├── rubber.csv
│   │   ├── palm_oil.csv
│   │   ├── brent.csv
│   │   ├── gold.csv
│   │   └── cocoa.csv
│   ├── macro/
│   │   ├── bceao_rate.csv
│   │   ├── inflation_ci.csv
│   │   ├── gdp_ci.csv
│   │   ├── eur_xof.csv
│   │   ├── m2_uemoa.csv
│   │   └── fed_rate.csv
│   └── events/
│       ├── geopolitical_events.csv
│       ├── climate_events.csv
│       ├── political_events.csv
│       └── health_events.csv
```

## Intégration avec le Package R BRVM Existant

Les fonctions existantes du package (dans `R/`) sont réutilisées :
```r
# Fonctions existantes à utiliser
BRVM_get(".symbol")         # Récupérer prix historiques
BRVM_cap()                  # Capitalisation
BRVM_stock_market(".date") # Revue de cotation
BRVM_tickers()              # Liste des tickers
BRVM_company_info(".tick")  # Infos fondamentales
BRVM_index()                # Indices
```

## Automatisation (Planification)

### Windows Task Scheduler
```powershell
# Tâche planifiée pour exécution quotidienne à 17h30
schtasks /create /tn "BRVM_Scraping_Daily" /tr "Rscript C:\BRVM\scraping\scraping_master.R" /sc daily /st 17:30
```

### Git Hooks (Optionnel)
```bash
# post-commit hook pour rafraîchir les données
# .git/hooks/post-commit
#!/bin/bash
Rscript scraping/scraping_master.R --refresh
```

## Validation des Données

Chaque script de scraping doit inclure :
1. **Vérification de connexion internet** avant chaque requête
2. **Test d'intégrité** : pas de dates dupliquées, pas de trous > 5 jours ouvrés
3. **Rapport** : nombre de nouvelles lignes collectées
4. **Logs** : fichier `scraping/logs/scraping_YYYY-MM-DD.log`

## Exemple de Log
```
[2026-07-14 17:30:01] === DÉBUT SCRAPING MASTER ===
[2026-07-14 17:30:02] Connexion internet : OK
[2026-07-14 17:30:03] Collecte ORAC : 1 nouvelle ligne
[2026-07-14 17:30:04] Collecte SGBC : 1 nouvelle ligne
[2026-07-14 17:30:05] Collecte SLBC : 0 nouvelle ligne (données non publiées)
[2026-07-14 17:30:06] Collecte SOGC : 1 nouvelle ligne
[2026-07-14 17:30:07] Mise à jour indices BRVM : OK
[2026-07-14 17:30:08] === INTÉGRATION TERMINÉE : 3/4 tickers mis à jour ===
```
