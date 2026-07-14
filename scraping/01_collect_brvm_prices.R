# Collecte des prix BRVM pour les 4 piliers de l'économie ivoirienne
# Utilise le package BRVM existant (sikafinance.com API)

library(here)
library(tidyverse)
library(lubridate)
library(BRVM)

# Configuration
TICKERS <- c("ORAC", "SGBC", "SLBC", "SOGC")
DATA_DIR <- here::here("data", "brvm")
FROM_DATE <- "2010-01-01"
TO_DATE <- Sys.Date()

# Créer le répertoire si nécessaire
dir.create(DATA_DIR, showWarnings = FALSE, recursive = TRUE)

# Fonction de collecte avec gestion d'erreurs
collect_ticker_data <- function(ticker, from, to) {
  message(sprintf("Collecte de %s de %s à %s...", ticker, from, to))
  
  data <- tryCatch(
    {
      BRVM_get(ticker, Period = "daily", from = from, to = to)
    },
    error = function(e) {
      message(sprintf("Erreur pour %s : %s", ticker, e$message))
      return(NULL)
    }
  )
  
  return(data)
}

# Collecte pour chaque titre
for (ticker in TICKERS) {
  df <- collect_ticker_data(ticker, FROM_DATE, TO_DATE)
  
  if (!is.null(df) && nrow(df) > 0) {
    df <- df %>% arrange(Date)
    write_csv(df, file.path(DATA_DIR, paste0(ticker, ".csv")))
    message(sprintf("%s : %d lignes sauvegardées", ticker, nrow(df)))
  } else {
    message(sprintf("Aucune donnée collectée pour %s", ticker))
  }
}

# Collecte des indices BRVM
message("Collecte des indices BRVM...")
all_indices <- BRVM_get("ALL INDEXES", Period = "daily", from = FROM_DATE, to = TO_DATE)
if (!is.null(all_indices) && nrow(all_indices) > 0) {
  write_csv(all_indices, file.path(DATA_DIR, "BRVM_indices.csv"))
  message(sprintf("Indices : %d lignes sauvegardées", nrow(all_indices)))
}

# Collecte de la capitalisation
message("Collecte de la capitalisation...")
cap_data <- tryCatch(BRVM_cap(), error = function(e) NULL)
if (!is.null(cap_data)) {
  cap_data$date_scraped <- Sys.Date()
  write_csv(cap_data, file.path(DATA_DIR, "BRVM_cap.csv"))
  message("Capitalisation sauvegardée")
}

message("=== Collecte BRVM terminée ===")
