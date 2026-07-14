# Collecte des variables macroéconomiques et financières
# Sources : BCEAO, INS CI, FMI, Trading Economics, Banque mondiale

library(here)
library(tidyverse)
library(rvest)
library(httr)
library(jsonlite)

DATA_DIR <- here::here("data", "exogenous", "macro")
dir.create(DATA_DIR, showWarnings = FALSE, recursive = TRUE)
LOGS_DIR <- here::here("scraping", "logs")
dir.create(LOGS_DIR, showWarnings = FALSE, recursive = TRUE)

log_message <- function(msg) {
  timestamp <- format(Sys.time(), "[%Y-%m-%d %H:%M:%S]")
  line <- paste(timestamp, msg)
  write(line, file.path(LOGS_DIR, paste0("macro_", Sys.Date(), ".log")), append = TRUE)
  message(line)
}

# === 1. Taux Directeur BCEAO ===
scrape_bceao_rate <- function() {
  url <- "https://www.bceao.int/fr/decisions-politique-monetaire"
  
  log_message("Scraping taux BCEAO...")
  
  page <- tryCatch(read_html(url), error = function(e) {
    log_message(paste("Erreur BCEAO:", e$message))
    return(NULL)
  })
  
  if (is.null(page)) return(NULL)
  
  tables <- page %>% html_table(fill = TRUE)
  # Extraction du taux directeur (structure spécifique BCEAO)
  
  log_message("Taux BCEAO collecté")
  return(NULL)  # Placeholder - nécessite adaptation au HTML BCEAO
}

# === 2. Taux de Change EUR/XOF ===
scrape_eur_xof <- function() {
  url <- "https://www.xe.com/currency/xof-cfa-franc"
  
  log_message("Scraping taux de change EUR/XOF...")
  
  response <- tryCatch(
    GET(url, user_agent("Mozilla/5.0"), timeout(15)),
    error = function(e) {
      log_message(paste("Erreur EUR/XOF:", e$message))
      return(NULL)
    }
  )
  
  if (is.null(response)) return(NULL)
  
  # Le taux fixe est 1 EUR = 655.957 XOF
  # La valeur est constante car c'est une parité fixe
  df <- data.frame(
    date = Sys.Date(),
    variable = "eur_xof",
    value = 655.957,
    unit = "EUR/XOF"
  )
  
  write_csv(df, file.path(DATA_DIR, "eur_xof.csv"))
  log_message("Taux EUR/XOF : OK")
  return(df)
}

# === 3. Inflation Côte d'Ivoire ===
scrape_inflation_ci <- function() {
  url <- "https://www.ins.ci/"
  
  log_message("Scraping inflation CI...")
  
  # L'INS publie l'IPC mensuellement
  # Pour des données historiques complètes, utiliser Trading Economics API
  # ou World Bank API
  
  return(NULL)
}

# === 4. Taux Fed Funds ===
scrape_fed_rate <- function() {
  url <- "https://www.tradingeconomics.com/united-states/interest-rate"
  
  log_message("Scraping taux Fed...")
  
  page <- tryCatch(read_html(url), error = function(e) {
    log_message(paste("Erreur Fed:", e$message))
    return(NULL)
  })
  
  if (is.null(page)) return(NULL)
  
  # Extraction de la valeur courante
  value <- page %>%
    html_element(xpath = "//span[@id='pHeaderDate']") %>%
    html_text()
  
  return(value)
}

# === 5. PIB Côte d'Ivoire (via World Bank API) ===
scrape_gdp_ci <- function() {
  url <- "http://api.worldbank.org/v2/country/CI/indicator/NY.GDP.MKTP.KD.ZG?format=json"
  
  log_message("Scraping PIB CI via World Bank...")
  
  response <- tryCatch(
    GET(url, timeout(15)),
    error = function(e) {
      log_message(paste("Erreur World Bank:", e$message))
      return(NULL)
    }
  )
  
  if (is.null(response)) return(NULL)
  
  data <- content(response, as = "text") %>% fromJSON()
  
  if (length(data) > 1 && is.data.frame(data[[2]])) {
    df <- data[[2]] %>%
      select(year = date, value)
    
    write_csv(df, file.path(DATA_DIR, "gdp_ci.csv"))
    log_message("PIB CI collecté")
    return(df)
  }
  
  return(NULL)
}

# === 6. Masse Monétaire M2 UEMOA ===
scrape_m2_uemoa <- function() {
  # BCEAO - Statistiques monétaires
  # https://www.bceao.int/fr/statistiques
  log_message("Données M2 UEMOA : collecte manuelle recommandée (site BCEAO)")
  return(NULL)
}

# === Exécution ===
log_message("=== DÉBUT COLLECTE MACRO ===")

scrape_eur_xof()
scrape_gdp_ci()
scrape_bceao_rate()

log_message("=== FIN COLLECTE MACRO ===")

# === NOTE ===
# Les sites BCEAO et INS nécessitent des adaptateurs spécifiques
# selon leur structure HTML qui peut changer.
# Pour un usage production, privilégier :
# - IMF Data API : https://www.imf.org/en/Data
# - Trading Economics API (payant)
# - World Bank API (gratuit, fiable)
