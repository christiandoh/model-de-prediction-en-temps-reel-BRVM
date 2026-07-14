# BRVM - Projet d'Analyse des Piliers Économiques Ivoiriens

## Structure du Projet

```
BRVM/
├── R/                          # Package R existant (BRVM)
├── man/                        # Documentation du package
├── tests/                      # Tests du package
├── vignettes/                  # Vignettes du package
│
├── prompts/                    # Fichiers de prompt pour la collecte
│   ├── 01_TOP4_IVORIAN_COMPANIES.md    # Sélection et justification des 4 piliers
│   ├── 02_EXOGENOUS_COMMODITIES.md     # Collecte prix matières premières
│   ├── 03_EXOGENOUS_MACRO_FINANCE.md   # Collecte variables macro/finance
│   ├── 04_EXOGENOUS_EVENTS.md          # Collecte événements exogènes
│   ├── 05_SCRAPING_PIPELINE.md         # Pipeline de scraping automatisé
│   └── 06_MODEL_SPECIFICATION.md       # Spécification du modèle économétrique
│
├── scraping/                   # Scripts de collecte automatisée
│   ├── 01_collect_brvm_prices.R        # Collecte prix BRVM (endogènes)
│   ├── 02_collect_commodities.R        # Collecte matières premières
│   ├── 03_collect_macro_finance.R      # Collecte variables macro
│   ├── 04_collect_events.R             # Collecte événements
│   ├── 05_integration_dataset.R        # Intégration en dataset unifié
│   ├── scraping_master.R               # Orchestrateur du pipeline
│   └── logs/                           # Logs d'exécution
│
├── data/
│   ├── brvm/                   # Données BRVM (endogènes)
│   ├── exogenous/
│   │   ├── commodities/        # Prix matières premières
│   │   ├── macro/              # Variables macroéconomiques
│   │   └── events/             # Événements exogènes
│   └── models/                 # Datasets consolidés prêts pour modélisation
│
├── models/                     # Scripts de modélisation (à venir)
│
├── DESCRIPTION                 # Package R
├── NAMESPACE
└── README.md
```

## Les 4 Piliers de l'Économie Ivoirienne

| Ticker | Entreprise | Secteur | Variable exogène clé |
|--------|-----------|---------|---------------------|
| **ORAC** | Orange Côte d'Ivoire | Télécommunications | Inflation, Taux BCEAO |
| **SGBC** | Société Générale CI | Finance | Taux BCEAO, M2, Fed |
| **SLBC** | Solibra | Industrie/Boissons | Inflation, Prix céréales |
| **SOGC** | SOGB | Agriculture (Caoutchouc) | Prix caoutchouc, Climat |

## Pipeline de Collecte

```
scraping_master.R (quotidien 17h30)
  ├── 01. BRVM Prices (via package BRVM / sikafinance.com)
  ├── 02. Commodities (via Investing.com / World Bank)
  ├── 03. Macro/Finance (via BCEAO, Trading Economics, WB)
  ├── 04. Events (codification manuelle + mise à jour)
  └── 05. Integration → data/models/dataset_*.csv
```

## Catégories de Variables Exogènes

1. **Matières premières** : Caoutchouc, Huile de palme, Pétrole, Or, Cacao
2. **Monétaires/Financières** : Taux BCEAO, EUR/XOF, Inflation, Fed Funds, M2
3. **Géopolitiques** : Guerres, Conflits, Sanctions
4. **Sanitaires** : Pandémies, Épidémies
5. **Climatiques** : Sécheresse, Inondations, El Niño
6. **Politiques** : Élections, Crise post-électorale, Réformes
7. **Économiques** : Crises bancaires, Chocs pétroliers, Récessions
