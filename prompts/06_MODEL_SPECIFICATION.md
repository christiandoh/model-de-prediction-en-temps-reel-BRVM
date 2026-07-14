# PROMPT #6 : Spécification du Modèle Économétrique

## Objectif
Spécifier le modèle économétrique pour analyser l'impact des variables exogènes sur les 4 titres BRVM.

## Structure du Modèle

### Approche : VAR (Vector AutoRegressive) + ARIMAX

```r
# Modèle pour chaque titre individuellement
# Y_t = α + Σβ_i·Y_{t-i} + Σγ_j·X_{j,t} + Σδ_k·E_{k,t} + ε_t

# Où :
# Y_t  = Rendement du titre (close) ou log(close) - log(close_lag1)
# X_j  = Variables exogènes continues (prix commodités, taux, inflation)
# E_k  = Variables exogènes binaires/ordinales (événements)
# β_i  = Coefficients autorégressifs (lag = 1..p)
# γ_j  = Coefficients des variables exogènes continues
# δ_k  = Coefficients des événements
```

### Spécification par Titre

#### ORAC (Orange CI)
```
ORAC_t = α + β1·ORAC_{t-1} + β2·BRVM30_{t-1}
         + γ1·Inflation_t + γ2·TauxBCEAO_t + γ3·PIB_CI_t
         + δ1·COVID_t + δ2·Election_t + δ3·Regulation_ARTCI_t
         + ε_t

Expected signs:
- Inflation: NEGATIF (baisse pouvoir d'achat → baisse consommation télécom)
- Taux BCEAO: NEGATIF (coût capital plus élevé)
- PIB CI: POSITIF (croissance → plus d'abonnés)
- COVID: NEGATIF (restrictions, baisse recharge)
- Election: NEGATIF (incertitude)
```

#### SGBC (Société Générale CI)
```
SGBC_t = α + β1·SGBC_{t-1} + β2·BRVMFI_{t-1}
         + γ1·TauxBCEAO_t + γ2·M2_UEMOA_t + γ3·FedRate_t
         + γ4·Inflation_t + γ5·PIB_CI_t
         + δ1·COVID_t + δ2·CriseBancaire_t + δ3·Election_t
         + ε_t

Expected signs:
- Taux BCEAO: POSITIF (marge nette d'intérêt s'élargit)
- M2 UEMOA: POSITIF (plus de liquidité bancaire)
- Fed Rate: NEGATIF (capitaux quittent marchés émergents)
- Inflation: NEGATIF (perturbation économique)
- PIB CI: POSITIF (plus d'activité bancaire)
- COVID: NEGATIF
- Crise bancaire globale: NEGATIF
```

#### SLBC (Solibra)
```
SLBC_t = α + β1·SLBC_{t-1} + β2·BRVMIN_{t-1}
         + γ1·Inflation_t + γ2·PIB_CI_t + γ3·EUR_XOF_t
         + γ4·PrixBlé_t + γ5·Pétrole_t
         + δ1·COVID_t + δ2·RéglementationAlcool_t
         + ε_t

Expected signs:
- Inflation: NEGATIF (baisse pouvoir d'achat)
- PIB CI: POSITIF (consommation augmente)
- EUR/XOF: NEGATIF (appréciation EUR → importations plus chères)
- Prix blé/orge: NEGATIF (matières premières plus chères)
- COVID: NEGATIF (restrictions bars/restaurants)
```

#### SOGC (SOGB)
```
SOGC_t = α + β1·SOGC_{t-1} + β2·BRVMAG_{t-1}
         + γ1·PrixCaoutchouc_t + γ2·PrixHuilePalme_t
         + γ3·Climat_t + γ4·EUR_XOF_t + γ5·PIB_Chine_t
         + γ6·Pétrole_t
         + δ1·COVID_t + δ2·GuerreUkraine_t
         + ε_t

Expected signs:
- Prix caoutchouc: POSITIF (↑ prix → ↑ chiffre d'affaires)
- Prix huile palme: POSITIF
- Climat (pluies): POSITIF (bonnes récoltes)
- EUR/XOF: POSITIF (exportations plus compétitives)
- PIB Chine: POSITIF (principal importateur caoutchouc)
- Pétrole: NEGATIF (coût transport)
```

### Variables Indépendantes (Synthèse)

| Variable | ORAC | SGBC | SLBC | SOGC |
|----------|------|------|------|------|
| **Prix caoutchouc** | - | - | - | **P** |
| **Prix huile palme** | - | - | - | **P** |
| **Pétrole (Brent)** | - | - | N | N |
| **Or** | - | N | - | - |
| **Taux BCEAO** | N | **P** | N | N |
| **EUR/XOF** | N | N | N | **P** |
| **Inflation** | **N** | N | **N** | N |
| **Fed Funds** | - | **N** | - | - |
| **PIB CI** | **P** | **P** | **P** | - |
| **PIB Chine** | - | - | - | **P** |
| **COVID-19** | N | N | N | N |
| **Élections CI** | N | N | N | - |
| **Guerre Ukraine** | - | - | - | N |
| **Climat** | - | - | N | **P** |

**P** = effet POSITIF attendu, **N** = effet NÉGATIF attendu

### Tests de Robustesse

1. **Stationnarité** : test ADF, KPSS
2. **Cointégration** : test de Johansen
3. **Causalité** : test de Granger
4. **Hétéroscédasticité** : test ARCH
5. **Normalité résidus** : test Jarque-Bera
6. **Stabilité** : test CUSUM
7. **Sélection de lag** : AIC, BIC

### Période d'Étude
- **Début** : 2010-01-01 (pour capturer crise post-électorale 2010-2011)
- **Fin** : Date courante
- **Fréquence** : Hebdomadaire (standardisation des données)
