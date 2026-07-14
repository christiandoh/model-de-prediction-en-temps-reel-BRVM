# Intégration : Fusion des données endogènes (BRVM) et exogènes
# en un dataset unifié prêt pour la modélisation

library(here)
library(tidyverse)

BRVM_DIR <- here::here("data", "brvm")
EXO_DIR <- here::here("data", "exogenous")
OUTPUT_DIR <- here::here("data", "models")
dir.create(OUTPUT_DIR, showWarnings = FALSE, recursive = TRUE)

# === 1. Chargement des prix BRVM ===
load_brvm_data <- function(ticker) {
  filepath <- file.path(BRVM_DIR, paste0(ticker, ".csv"))
  if (!file.exists(filepath)) {
    warning(sprintf("Fichier %s introuvable", filepath))
    return(NULL)
  }
  
  df <- read_csv(filepath, show_col_types = FALSE) %>%
    select(date = Date, open = Open, high = High, low = Low, 
           close = Close, volume = Volume) %>%
    mutate(ticker = ticker) %>%
    arrange(date)
  
  return(df)
}

tickers <- c("ORAC", "SGBC", "SLBC", "SOGC")
brvm_data <- bind_rows(lapply(tickers, load_brvm_data))

if (nrow(brvm_data) > 0) {
  write_csv(brvm_data, file.path(OUTPUT_DIR, "brvm_consolidated.csv"))
  message(sprintf("Données BRVM consolidées : %d lignes", nrow(brvm_data)))
}

# === 2. Chargement des matières premières ===
COMMODITIES_DIR <- file.path(EXO_DIR, "commodities")

commodities_files <- list.files(COMMODITIES_DIR, pattern = "*.csv", full.names = TRUE)
commodities_data <- bind_rows(lapply(commodities_files, function(f) {
  df <- read_csv(f, show_col_types = FALSE)
  df$commodity_file <- basename(f)
  return(df)
}))

if (length(commodities_data) > 0) {
  write_csv(commodities_data, file.path(OUTPUT_DIR, "commodities_consolidated.csv"))
}

# === 3. Chargement des variables macro ===
MACRO_DIR <- file.path(EXO_DIR, "macro")
macro_files <- list.files(MACRO_DIR, pattern = "*.csv", full.names = TRUE)
macro_data <- bind_rows(lapply(macro_files, function(f) {
  if (file.exists(f) && file.info(f)$size > 0) {
    read_csv(f, show_col_types = FALSE)
  }
}))

if (exists("macro_data") && nrow(macro_data) > 0) {
  write_csv(macro_data, file.path(OUTPUT_DIR, "macro_consolidated.csv"))
}

# === 4. Chargement des événements ===
EVENTS_DIR <- file.path(EXO_DIR, "events")
events_matrix <- NULL
events_matrix_file <- file.path(EVENTS_DIR, "events_daily_matrix.csv")
if (file.exists(events_matrix_file)) {
  events_matrix <- read_csv(events_matrix_file, show_col_types = FALSE)
  write_csv(events_matrix, file.path(OUTPUT_DIR, "events_daily_matrix.csv"))
}

# === 5. Fusion finale ===
# On crée un dataset par ticker avec ses variables exogènes associées
create_model_dataset <- function(ticker, brvm, events) {
  ticker_data <- brvm %>% filter(ticker == !!ticker)
  
  if (is.null(events)) return(ticker_data)
  
  # Fusion avec la matrice d'événements
  merged <- ticker_data %>%
    left_join(events, by = c("date" = "date"))
  
  return(merged)
}

for (ticker in tickers) {
  dataset <- create_model_dataset(ticker, brvm_data, events_matrix)
  
  if (!is.null(dataset) && nrow(dataset) > 0) {
    write_csv(dataset, file.path(OUTPUT_DIR, paste0("dataset_", tolower(ticker), ".csv")))
    message(sprintf("Dataset %s : %d lignes x %d colonnes", 
                    ticker, nrow(dataset), ncol(dataset)))
  }
}

message(sprintf("=== INTÉGRATION TERMINÉE === Fichiers dans %s", OUTPUT_DIR))
