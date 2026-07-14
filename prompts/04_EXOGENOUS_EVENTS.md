# PROMPT #4 : Collecte des Données d'Événements Exogènes

## Objectif
Collecter et coder les événements exogènes majeurs (géopolitiques, sanitaires, climatiques, politiques) pouvant impacter les titres BRVM.

## Structure de Données Recommandée

Chaque événement est encodé comme **variable binaire (0/1) ou ordinale** dans un format compatible avec les modèles de séries temporelles.

---

## 1. Événements Géopolitiques

| Variable | Description | Période | Titre impacté | Justification |
|----------|-------------|---------|---------------|---------------|
| `war_ukraine` | Guerre Ukraine-Russie | 2022-02-24 → présent | Tous | Choc pétrole, blé, inflation |
| `war_gaza` | Conflit Gaza-Israël | 2023-10-07 → présent | Tous | Incertitude géopolitique, pétrole |
| `sanctions_russia` | Sanctions Russie | 2022-03 → présent | SOGC, Tous | Prix caoutchouc, pétrole, céréales |
| `tensions_china_taiwan` | Tensions Chine-Taïwan | 2022-08 → variable | SOGC | Demande chinoise de caoutchouc |
| `covid19` | Pandémie COVID-19 | 2020-03 → 2023-05 | Tous | Choc majeur sur tous les secteurs |
| `ebola_west_africa` | Épidémie Ebola | 2014-2016 | Tous | Restrictions économiques régionales |

### Codage
```csv
date,event,code,severity,description
2020-03-11,covid19,1,3,Pandémie déclarée par OMS
2020-03-20,covid19,1,4,Confinement Côte d'Ivoire
2021-01-15,covid19,1,2,Vague Delta
2021-07-01,covid19,1,2,Vague Omicron
2022-02-24,war_ukraine,1,4,Début invasion russe
2022-03-08,sanctions_russia,1,3,Embargo pétrole UE
```

`severity`: 1=faible, 2=modéré, 3=élevé, 4=critique

---

## 2. Événements Climatiques

| Variable | Description | Fréquence | Titre impacté | Justification |
|----------|-------------|-----------|---------------|---------------|
| `drought_ci` | Sécheresse en Côte d'Ivoire | Annuel | SOGC, SLBC | Production caoutchouc, palmier, eau |
| `flood_ci` | Inondations majeures | Annuel | SOGC | Destruction plantations |
| `el_nino` | Phénomène El Niño | 2-7 ans | SOGC | Pluviométrie anormale |
| `precipitation_anomaly` | Anomalie précipitations | Mensuel | SOGC, SLBC | Rendements agricoles |

### Sources de données climatiques
- **NOAA** : https://www.noaa.gov/climate
- **World Bank Climate Portal** : https://climateknowledgeportal.worldbank.org/
- **Météo Côte d'Ivoire** : SODEXAM

---

## 3. Événements Politiques et Institutionnels (Côte d'Ivoire)

| Variable | Description | Date | Titre impacté | Justification |
|----------|-------------|------|---------------|---------------|
| `election_presidentielle` | Élection présidentielle | 2010, 2015, 2020, 2025 | Tous | Incertitude politique |
| `crise_post_electorale` | Crise post-électorale | 2010-2011 | Tous | Instabilité majeure |
| `tentative_coup_etat` | Tentative de coup d'État | 2012, 2017 | Tous | Risque sécuritaire |
| `reforme_bceao` | Réforme monétaire BCEAO | 2019-2020 | SGBC | Changement réglementaire |
| `loi_finances` | Loi de finances annuelle | Annuel | Tous | Fiscalité entreprise |
| `reglementation_artci` | Décision ARTCI | Variable | ORAC | Régulation télécoms |

---

## 4. Événements Économiques Majeurs

| Variable | Description | Date | Titre impacté | Justification |
|----------|-------------|------|---------------|---------------|
| `crise_bancaire_europe` | Crise dette zone euro | 2011-2012 | SGBC | Contagion financière |
| `crise_bancaire_usa` | Crise SVB etc. | 2023-03 | SGBC | Contagion systémique |
| `baisse_export_ci` | Choc exportations CI | Variable | SOGC | Demande extérieure |
| `default_souverain` | Défaut souverain Afrique | Variable | Tous | Contagion régionale |
| `baisse_ide` | Baisse Investissements directs | Variable | Tous | Financement économie |

---

## 5. Crises Sanitaires

| Variable | Description | Date | Titre impacté |
|----------|-------------|------|---------------|
| `covid_confinement` | Mesures confinement CI | 2020-03/2020-05, 2021-01/2021-03 | Tous |
| `covid_couverture_feu` | Couvre-feu CI | 2020-05/2020-07 | SLBC, ORAC |
| `covid_restriction_voyage` | Restrictions voyages | 2020-03/2021-06 | ORAC |
| `paludisme_pic` | Pic épidémie paludisme | Annuel | Tous (absentéisme) |

---

## Format Final Unifié (Fichier Unique : `events_master.csv`)

```csv
date,event_category,event_name,code,duration_days,severity,tickers_impacted
2020-03-11,health,covid19_pandemic,COVID,1095,4,ALL
2022-02-24,geopolitical,ukraine_war,WUKR,730,4,ALL
2010-12-16,political,post_electoral_crisis,CRISIS10,150,4,ALL
2023-03-08,economic,banking_crisis_svb,SVBCR,30,2,SGBC
2020-03-15,health,covid_lockdown_ci,LOCKCI,45,3,ALL
```

## Règles de Construction de la Matrice d'Événements

1. **Variables binaires** : 1 si l'événement est actif ce jour, 0 sinon
2. **Variables de sévérité** : pondération continue (0-1) basée sur l'intensité
3. **Fenêtre d'impact** : l'événement peut avoir un effet retardé (lag)
4. **Périodicité** : alignement sur la fréquence des données BRVM (quotidienne)

## R Shiny App pour le Suivi des Événements (Concept)
```r
# Tableau de bord interactif pour suivre l'impact
# des événements exogènes sur les indices BRVM
# UI : ggplot + plotly pour visualiser les corrélations
```
