# PROMPT #3 : Collecte des Variables Macroéconomiques et Financières

## Objectif
Collecter les données macroéconomiques et financières qui influencent les titres de la BRVM.

## Sources de données
- **BCEAO** : https://www.bceao.int/fr/statistiques
- **INS Côte d'Ivoire** : https://www.ins.ci/
- **IMF (FMI)** : https://www.imf.org/en/Data
- **World Bank** : https://data.worldbank.org/
- **Banque de France** : https://www.banque-france.fr/statistiques
- **Trading Economics** : https://tradingeconomics.com/cote-d-ivoire/indicators

---

## Variables à Collecter

### 1. Taux Directeur BCEAO
| Champ | Valeur |
|-------|--------|
| **Justification** | Impact direct sur SGBC (coût refinancement, marge nette) et toutes les entreprises (coût du capital) |
| **Fréquence** | Variable (réunions BCEAO : mars, juin, septembre, décembre) |
| **Unité** | % (taux d'intérêt) |
| **Période** | 2010-01-01 à aujourd'hui |
| **URL source** | https://www.bceao.int/fr/decisions-politique-monetaire |

### 2. Taux de Change EUR/XOF
| Champ | Valeur |
|-------|--------|
| **Justification** | Parité fixe (1 EUR = 655.957 XOF), impact sur importations (SLBC, ORAC) et exportations (SOGC) |
| **Fréquence** | Quotidienne |
| **Unité** | EUR/XOF |
| **Période** | 2010-01-01 à aujourd'hui |
| **URL source** | https://www.xe.com/currency/xof-cfa-franc |

### 3. Inflation UEMOA / Côte d'Ivoire
| Champ | Valeur |
|-------|--------|
| **Justification** | Impact sur pouvoir d'achat (SLBC, ORAC), politique monétaire (SGBC), coûts (tous) |
| **Fréquence** | Mensuelle |
| **Unité** | % (IPC, glissement annuel) |
| **Période** | 2010-01-01 à aujourd'hui |

### 4. Taux Fed Funds (États-Unis)
| Champ | Valeur |
|-------|--------|
| **Justification** | Impact sur flux de capitaux vers marchés émergents, y compris BRVM |
| **Fréquence** | Variable (8 réunions/an) |
| **Unité** | % |
| **Période** | 2010-01-01 à aujourd'hui |

### 5. Taux Directeur BCE
| Champ | Valeur |
|-------|--------|
| **Justification** | Lien EUR/XOF + coût capital zone euro (investissements en CI) |
| **Fréquence** | Variable (réunions BCE) |
| **Unité** | % |
| **Période** | 2010-01-01 à aujourd'hui |

### 6. PIB Côte d'Ivoire (Croissance)
| Champ | Valeur |
|-------|--------|
| **Justification** | Traduit la santé globale de l'économie, impacte tous les titres |
| **Fréquence** | Trimestrielle / Annuelle |
| **Unité** | % (croissance réelle) |
| **Période** | 2000-01-01 à aujourd'hui |

### 7. Masse Monétaire M2 UEMOA
| Champ | Valeur |
|-------|--------|
| **Justification** | Indicateur de liquidité bancaire, impact direct SGBC |
| **Fréquence** | Mensuelle |
| **Unité** | Milliards FCFA |
| **Période** | 2010-01-01 à aujourd'hui |

### 8. Taux d'intérêt des Bons du Trésor (BT-Taux)
| Champ | Valeur |
|-------|--------|
| **Justification** | Taux sans risque de référence, concurrence pour les investissements actions |
| **Fréquence** | Hebdomadaire |
| **Unité** | % |
| **Période** | 2010-01-01 à aujourd'hui |

---

## Format de sortie (CSV)

```csv
date,variable,value,unit,source
2020-03-15,bceao_rate,2.50,%,BCEAO
2020-03-15,eur_xof,655.957,EUR/XOF,BCEAO
2020-03-15,inflation_ci,2.10,%,INS
2020-03-15,fed_funds,0.25,%,Federal Reserve
2020-03-15,ecb_rate,0.00,%,ECB
2020-03-15,gdp_ci,6.20,%,INS
2020-03-15,m2_uemoa,35000,milliards FCFA,BCEAO
```

## Calendrier BCEAO
| Réunion | Mois typique |
|---------|-------------|
| MPC 1 | Mars |
| MPC 2 | Juin |
| MPC 3 | Septembre |
| MPC 4 | Décembre |

## Mapping Variable → Titre

| Variable | ORAC | SGBC | SLBC | SOGC |
|----------|------|------|------|------|
| Taux BCEAO | **Haut** | **Très haut** | Moyen | Moyen |
| EUR/XOF | Haut | **Très haut** | **Haut** | **Haut** |
| Inflation | **Haut** | **Haut** | **Très haut** | Moyen |
| Fed Funds | Faible | **Haut** | Faible | Moyen |
| PIB CI | **Très haut** | **Très haut** | **Très haut** | **Très haut** |
| M2 UEMOA | Moyen | **Très haut** | Moyen | Faible |
| Bons Trésor | Moyen | Haut | Moyen | Faible |
