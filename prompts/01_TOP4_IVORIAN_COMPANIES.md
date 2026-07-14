# PROMPT #1 : Identification des 4 Piliers de l'Économie Ivoirienne à la BRVM

## Objectif
Sélectionner et justifier les 4 entreprises ivoiriennes cotées à la BRVM qui constituent les piliers de l'économie nationale.

## Les 4 Entreprises Retenues

| Ticker | Entreprise | Secteur | Pondération |
|--------|-----------|---------|-------------|
| **ORAC** | Orange Côte d'Ivoire | Télécommunications / Services Publics | 25% |
| **SGBC** | Société Générale Côte d'Ivoire | Finance / Banque | 25% |
| **SLBC** | Solibra Côte d'Ivoire | Industrie / Boissons | 25% |
| **SOGC** | SOGB (Société des Caoutchoucs de Grand-Béréby) | Agriculture / Caoutchouc | 25% |

## Justifications Détaillées

### 1. ORAC (Orange Côte d'Ivoire)
- **Leader incontesté des télécoms** en Côte d'Ivoire avec >40% de parts de marché mobile
- **Chiffre d'affaires** > 500 milliards FCFA/an
- Secteur télécom = **moteur de la digitalisation** de l'économie
- Forte corrélation avec : PIB, consommation des ménages, investissements
- **Lien variables exogènes** : inflation (pouvoir d'achat), taux BCEAO (coût du capital), stabilité politique, régulation ARTCI

### 2. SGBC (Société Générale Côte d'Ivoire)
- **Banque systémique** du système financier ivoirien
- Filiale du groupe Société Générale, acteur bancaire historique
- Financement des **grands projets d'infrastructure** et des PME
- Baromètre de la santé du **secteur financier** en UEMOA
- **Lien variables exogènes** : taux directeur BCEAO, inflation, taux de change EUR/XOF, PIB, taux Fed/BCE

### 3. SLBC (Solibra)
- **Leader des boissons** en Côte d'Ivoire (bières, boissons gazeuses)
- Consommation de masse → indicateur du **pouvoir d'achat** des ménages
- Forte intégration locale (agriculture, distribution)
- Secteur résilient même en période de crise
- **Lien variables exogènes** : inflation, prix céréales/orge (importations), taux de change, climat (ressources en eau), réglementation

### 4. SOGC (SOGB)
- **Leader de l'hévéaculture** et de l'huile de palme en Côte d'Ivoire
- 1er producteur africain de caoutchouc naturel
- Secteur agricole = **pilier historique** de l'économie ivoirienne
- Forte exposition aux marchés internationaux
- **Lien variables exogènes** : prix caoutchouc (marché mondial), prix huile de palme, climat (précipitations), taux de change, demande Chine/Inde

## Variables Exogènes par Titre

| Variable | ORAC | SGBC | SLBC | SOGC |
|----------|------|------|------|------|
| Prix cacao | | | | |
| Prix caoutchouc | | | | **X** |
| Prix pétrole brut | | | X (transport) | X (transport) |
| Prix or | | | | |
| Taux BCEAO | X | **X** | X | X |
| Taux EUR/XOF | X | **X** | X | **X** |
| Inflation UEMOA | **X** | **X** | **X** | X |
| Taux Fed Funds | | X | | |
| PIB Côte d'Ivoire | **X** | **X** | **X** | **X** |
| Stabilité politique | **X** | **X** | X | X |
| Climat / pluviométrie | | | X | **X** |
| COVID-19 (crise sanitaire) | X | X | X | X |
| Régulation secteur | X (ARTCI) | X (BCEAO) | X | |

Légende : **X** = impact fort, X = impact modéré
