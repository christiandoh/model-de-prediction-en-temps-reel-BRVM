#!/usr/bin/env Rscript
# Master orchestrator pour la collecte des données BRVM
# Execute tous les scripts de scraping séquentiellement

library(here)
library(tidyverse)

LOGS_DIR <- here::here("scraping", "logs")
dir.create(LOGS_DIR, showWarnings = FALSE, recursive = TRUE)

master_log <- function(msg) {
  timestamp <- format(Sys.time(), "[%Y-%m-%d %H:%M:%S]")
  line <- paste(timestamp, msg)
  write(line, file.path(LOGS_DIR, paste0("master_", Sys.Date(), ".log")), append = TRUE)
  cat(line, "\n")
}

run_script <- function(script_name, script_path) {
  master_log(sprintf("=== DÉBUT %s ===", script_name))
  
  start_time <- Sys.time()
  
  result <- tryCatch(
    {
      source(script_path, local = TRUE, echo = FALSE)
      TRUE
    },
    error = function(e) {
      master_log(sprintf("ERREUR %s : %s", script_name, e$message))
      return(FALSE)
    },
    warning = function(w) {
      master_log(sprintf("AVERTISSEMENT %s : %s", script_name, w$message))
      return(TRUE)
    }
  )
  
  elapsed <- difftime(Sys.time(), start_time, units = "secs")
  
  if (result) {
    master_log(sprintf("SUCCÈS %s (%.1f sec)", script_name, elapsed))
  } else {
    master_log(sprintf("ÉCHEC %s (%.1f sec)", script_name, elapsed))
  }
  
  return(result)
}

# === Vérification connexion internet ===
master_log("Vérification connexion internet...")
internet_ok <- tryCatch(
  {
    curl::has_internet()
  },
  error = function(e) FALSE
)

if (!internet_ok) {
  master_log("PAS DE CONNEXION INTERNET - Arrêt du pipeline")
  quit(status = 1)
}
master_log("Connexion internet : OK")

# === Exécution des scripts ===
SCRAPING_DIR <- here::here("scraping")

scripts <- list(
  list(name = "BRVM Prices", file = "01_collect_brvm_prices.R"),
  list(name = "Commodities", file = "02_collect_commodities.R"),
  list(name = "Macro/Finance", file = "03_collect_macro_finance.R"),
  list(name = "Events", file = "04_collect_events.R")
)

master_log(sprintf("=== DÉBUT PIPELINE DE SCRAPING (%s) ===", Sys.Date()))

results <- list()

for (s in scripts) {
  script_path <- file.path(SCRAPING_DIR, s$file)
  
  if (!file.exists(script_path)) {
    master_log(sprintf("FICHIER INTROUVABLE : %s", script_path))
    results[[s$name]] <- FALSE
    next
  }
  
  results[[s$name]] <- run_script(s$name, script_path)
}

# === Rapport final ===
master_log("=== RAPPORT FINAL ===")
success_count <- sum(unlist(results))
total_count <- length(results)
master_log(sprintf("Scripts réussis : %d/%d", success_count, total_count))

if (success_count == total_count) {
  master_log("PIPELINE TERMINÉ AVEC SUCCÈS")
} else {
  failed <- names(results)[!unlist(results)]
  master_log(sprintf("SCRIPTS EN ÉCHEC : %s", paste(failed, collapse = ", ")))
}

master_log(sprintf("=== PIPELINE TERMINÉ ===\n"))
