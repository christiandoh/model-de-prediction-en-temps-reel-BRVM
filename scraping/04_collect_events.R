# Collecte et codification des événements exogènes
# Les événements sont codés en variables binaires/composites

library(here)
library(tidyverse)

DATA_DIR <- here::here("data", "exogenous", "events")
dir.create(DATA_DIR, showWarnings = FALSE, recursive = TRUE)

# === 1. Construction de la matrice d'événements ===
# Chaque événement est défini par sa date de début, date de fin,
# et un niveau de sévérité (1-4)

events <- tribble(
  ~date, ~end_date, ~category, ~event_name, ~code, ~severity, ~tickers_impacted,
  
  ## === GÉOPOLITIQUES ===
  "2022-02-24", "2026-07-14", "geopolitical", "Guerre Ukraine-Russie", "WUKR", 4, "ALL",
  "2023-10-07", "2026-07-14", "geopolitical", "Conflit Gaza-Israël", "GAZA", 3, "ALL",
  "2022-03-08", "2026-07-14", "geopolitical", "Sanctions Russie", "SANCRU", 3, "SOGC",
  "2024-01-01", "2026-07-14", "geopolitical", "Tensions Mer Rouge", "REDSEA", 3, "ALL",
  "2011-01-01", "2011-12-31", "geopolitical", "Printemps arabe", "ARABSP", 2, "ALL",
  
  ## === SANITAIRES ===
  "2020-03-11", "2023-05-05", "health", "Pandémie COVID-19", "COVID", 4, "ALL",
  "2020-03-16", "2020-05-15", "health", "Confinement CI", "LOCKCI", 3, "ALL",
  "2020-03-16", "2021-06-30", "health", "Restrictions voyages", "TRAV", 2, "ORAC",
  "2014-03-01", "2016-06-01", "health", "Épidémie Ebola Afrique Ouest", "EBOLA", 3, "ALL",
  
  ## === CLIMATIQUES ===
  "2011-01-01", "2011-06-30", "climate", "Sécheresse CI", "DROU11", 2, "SOGC",
  "2020-06-01", "2020-09-30", "climate", "Fortes inondations CI", "FLOOD20", 2, "SOGC",
  "2015-01-01", "2016-12-31", "climate", "El Niño fort", "ELNINO", 3, "SOGC",
  "2012-01-01", "2012-12-31", "climate", "Sécheresse sahélo-saharienne", "DROU12", 2, "SOGC",
  
  ## === POLITIQUES / INSTITUTIONNELS (CI) ===
  "2010-10-31", "2010-11-28", "political", "Élection présidentielle CI (1er tour)", "ELE10_1", 2, "ALL",
  "2010-11-28", "2011-04-11", "political", "Crise post-électorale CI", "CRISIS10", 4, "ALL",
  "2015-10-25", "2015-10-25", "political", "Élection présidentielle CI", "ELE15", 1, "ALL",
  "2020-10-31", "2020-11-30", "political", "Élection présidentielle CI (tensions)", "ELE20", 3, "ALL",
  "2020-12-01", "2020-12-31", "political", "Crédibilité élections CI", "POSTEL20", 2, "ALL",
  "2019-12-21", "2020-01-15", "political", "Réforme monétaire BCEAO (éco)", "BCEAOREF", 2, "SGBC",
  
  ## === ÉCONOMIQUES ===
  "2011-01-01", "2012-12-31", "economic", "Crise dette zone euro", "EURODEBT", 3, "SGBC",
  "2023-03-08", "2023-03-15", "economic", "Crise bancaire SVB / Credit Suisse", "SILICON", 3, "SGBC",
  "2020-01-01", "2020-12-31", "economic", "Choc pétrole COVID", "OILSHOCK", 3, "ALL",
  "2014-06-01", "2014-12-31", "economic", "Chute prix pétrole", "OILFALL14", 2, "ALL",
  "2020-04-20", "2020-04-20", "economic", "Pétrole négatif WTI", "NEGOIL", 3, "ALL",
  "2008-09-15", "2009-06-30", "economic", "Crise financière globale", "GFC08", 4, "ALL",
)

# Nettoyage et conversion des dates
events <- events %>%
  mutate(
    date = as.Date(date),
    end_date = as.Date(end_date),
    duration_days = as.numeric(end_date - date) + 1
  )

# Sauvegarde
write_csv(events, file.path(DATA_DIR, "events_master.csv"))
message(sprintf("Matrice d'événements : %d événements sauvegardés", nrow(events)))

# === 2. Génération de la série temporelle binaire ===
# Pour chaque jour, on crée une colonne pour chaque événement
generate_daily_event_matrix <- function(events, from = "2008-01-01", to = Sys.Date()) {
  daily_dates <- seq.Date(as.Date(from), as.Date(to), by = "day")
  
  event_matrix <- data.frame(date = daily_dates)
  
  for (i in 1:nrow(events)) {
    e <- events[i, ]
    event_col <- rep(0, length(daily_dates))
    mask <- daily_dates >= e$date & daily_dates <= e$end_date
    event_col[mask] <- e$severity / 4  # Normalisation (0-1)
    event_matrix[[e$code]] <- event_col
  }
  
  return(event_matrix)
}

# Génération et sauvegarde
daily_events <- generate_daily_event_matrix(events)
write_csv(daily_events, file.path(DATA_DIR, "events_daily_matrix.csv"))
message(sprintf("Matrice quotidienne : %d jours x %d événements", nrow(daily_events), ncol(daily_events) - 1))

# === 3. Résumé des événements par ticker ===
for (ticker in c("ORAC", "SGBC", "SLBC", "SOGC")) {
  ticker_events <- events %>%
    filter(str_detect(tickers_impacted, "ALL") | str_detect(tickers_impacted, ticker))
  
  write_csv(ticker_events, file.path(DATA_DIR, paste0("events_", tolower(ticker), ".csv")))
}

message("=== Collecte événements terminée ===")
