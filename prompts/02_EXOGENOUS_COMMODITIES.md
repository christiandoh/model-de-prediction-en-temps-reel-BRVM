# PROMPT #2 : Collecte des Prix des Matières Premières

## Objectif
Collecter les données historiques des prix des matières premières impactant les 4 titres BRVM sélectionnés.

## Source de données
- **Investing.com** : https://www.investing.com/commodities/
- **IndexMundi** : https://www.indexmundi.com/commodities/
- **World Bank Commodity Markets** : https://www.worldbank.org/en/research/commodity-markets
- **Trading Economics** : https://tradingeconomics.com/commodities

## Variables à collecter

### 1. Caoutchouc naturel (RSS3)
| Champ | Valeur |
|-------|--------|
| **Justification** | Impact direct sur SOGB (caoutchouc = 70% de son CA) |
| **Fréquence** | Hebdomadaire (prix spot) |
| **Unité** | USD/kg ou cents/lb |
| **Source** | SICOM (Singapour), TOCOM (Tokyo) |
| **Période** | 2010-01-01 à aujourd'hui |
| **Code Investing** | `rubber` |

### 2. Huile de palme (Crude Palm Oil - CPO)
| Champ | Valeur |
|-------|--------|
| **Justification** | Impact direct sur SOGB (huile de palme = 30% de son CA) |
| **Fréquence** | Hebdomadaire |
| **Unité** | USD/tonne |
| **Source** | Bursa Malaysia Derivatives |
| **Période** | 2010-01-01 à aujourd'hui |

### 3. Pétrole brut (Brent)
| Champ | Valeur |
|-------|--------|
| **Justification** | Impact sur coûts transport (SLBC, SOGC), inflation, consommation ORAC |
| **Fréquence** | Quotidienne |
| **Unité** | USD/baril |
| **Source** | ICE |
| **Période** | 2010-01-01 à aujourd'hui |

### 4. Or
| Champ | Valeur |
|-------|--------|
| **Justification** | Indicateur de risque global, refuge, impact indirect sur SGBC |
| **Fréquence** | Quotidienne |
| **Unité** | USD/oz |
| **Source** | LBMA, COMEX |
| **Période** | 2010-01-01 à aujourd'hui |

### 5. Cacao
| Champ | Valeur |
|-------|--------|
| **Justification** | Principal produit d'exportation de la Côte d'Ivoire (effet macro sur PIB, consommation) |
| **Fréquence** | Quotidienne |
| **Unité** | USD/tonne |
| **Source** | ICE Futures Europe |
| **Période** | 2010-01-01 à aujourd'hui |

## Format de sortie (CSV)
```csv
date,commodity,price,unit,source
2020-01-02,rubber,1.85,USD/kg,SICOM
2020-01-02,palm_oil,750.00,USD/tonne,Bursa Malaysia
2020-01-02,brent_crude,66.25,USD/baril,ICE
2020-01-02,gold,1520.00,USD/oz,LBMA
2020-01-02,cocoa,2450.00,USD/tonne,ICE
```

## Script R de scraping (template)
```r
library(rvest)
library(httr)
library(tidyverse)

collect_commodity_price <- function(commodity, from, to) {
  # URL Investing.com
  url <- paste0("https://www.investing.com/commodities/", commodity, "-historical-data")
  
  # POST request with date range
  response <- POST(url, body = list(
    'startDate' = from,
    'endDate' = to
  ), encode = "form")
  
  # Parse HTML table
  page <- read_html(response)
  table <- page %>% html_table(fill = TRUE) %>% .[[1]]
  
  return(table)
}
```

## Mapping : Matière première → Titre BRVM

| Matière première | Titre impacté | Mécanisme de transmission |
|-----------------|---------------|--------------------------|
| Caoutchouc | SOGC | Prix de vente direct |
| Huile de palme | SOGC | Prix de vente direct |
| Pétrole brut | Tous | Coût transport, inflation |
| Or | SGBC | Valeur des actifs, risque |
| Cacao | Tous | PIB national, santé économique |
