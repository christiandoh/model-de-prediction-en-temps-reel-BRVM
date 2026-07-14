# Modèle VAR/VEC pour l'analyse d'impact des variables exogènes
# sur les 4 piliers de l'économie ivoirienne à la BRVM

library(here)
library(tidyverse)
library(vars)
library(urca)
library(tseries)
library(lmtest)
library(forecast)

DATA_DIR <- here::here("data", "models")
OUTPUT_DIR <- here::here("models", "output")
dir.create(OUTPUT_DIR, showWarnings = FALSE, recursive = TRUE)

# === 1. Chargement des données consolidées ===
load_model_data <- function(ticker) {
  filepath <- file.path(DATA_DIR, paste0("dataset_", tolower(ticker), ".csv"))
  
  if (!file.exists(filepath)) {
    warning(sprintf("Dataset %s introuvable", filepath))
    return(NULL)
  }
  
  df <- read_csv(filepath, show_col_types = FALSE) %>%
    arrange(date)
  
  return(df)
}

tickers <- c("ORAC", "SGBC", "SLBC", "SOGC")

for (ticker in tickers) {
  cat(sprintf("\n========== ANALYSE : %s ==========\n", ticker))
  
  df <- load_model_data(ticker)
  if (is.null(df) || nrow(df) == 0) {
    cat("Aucune donnée disponible\n")
    next
  }
  
  # === 2. Création de la série temporelle ===
  # Rendement logarithmique
  df <- df %>% 
    filter(!is.na(close), close > 0) %>%
    mutate(return = c(NA, diff(log(close)))) %>%
    filter(!is.na(return))
  
  cat(sprintf("Observations : %d\n", nrow(df)))
  cat(sprintf("Période : %s à %s\n", min(df$date), max(df$date)))
  
  # === 3. Tests de stationnarité ===
  cat("\n--- Tests ADF (rendement) ---\n")
  adf_test <- adf.test(df$return, alternative = "stationary")
  cat(sprintf("ADF statistic: %.4f, p-value: %.4f\n", 
              adf_test$statistic, adf_test$p.value))
  
  # === 4. Statistiques descriptives ===
  cat("\n--- Statistiques descriptives ---\n")
  cat(sprintf("Rendement moyen: %.4f%%\n", mean(df$return, na.rm = TRUE) * 100))
  cat(sprintf("Volatilité: %.4f%%\n", sd(df$return, na.rm = TRUE) * 100))
  cat(sprintf("Sharpe ratio (annualisé): %.4f\n", 
              (mean(df$return, na.rm = TRUE) / sd(df$return, na.rm = TRUE)) * sqrt(252)))
  
  # === 5. Sélection de lag optimal ===
  # Sélectionner les colonnes numériques pour le VAR
  var_cols <- df %>% select(where(is.numeric)) %>% select(-dplyr::matches("date_[0-9]"))
  
  if (ncol(var_cols) > 1) {
    lag_selection <- VARselect(var_cols, lag.max = 10, type = "both")
    cat("\n--- Sélection de lag (AIC) ---\n")
    cat(sprintf("Lag optimal (AIC) : %d\n", lag_selection$selection["AIC(n)"]))
    cat(sprintf("Lag optimal (BIC) : %d\n", lag_selection$selection["SC(n)"]))
  }
  
  cat(sprintf("\n=== FIN ANALYSE %s ===\n", ticker))
}
