# Collecte des prix des matières premières
# Sources : Investing.com, IndexMundi, World Bank

library(here)
library(tidyverse)
library(rvest)
library(httr)

DATA_DIR <- here::here("data", "exogenous", "commodities")
dir.create(DATA_DIR, showWarnings = FALSE, recursive = TRUE)

# === 1. Fonction utilitaire : scraping Investing.com ===
scrape_investing_commodity <- function(slug, name, from = "2010-01-01", to = Sys.Date()) {
  url <- paste0("https://www.investing.com/commodities/", slug, "-historical-data")
  
  message(sprintf("Collecte %s (%s)...", name, url))
  
  response <- tryCatch(
    {
      POST(url,
           user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"),
           body = list(
             startDate = from,
             endDate = to,
             submit = "Download"
           ),
           encode = "form",
           timeout(30))
    },
    error = function(e) {
      message(sprintf("Erreur HTTP pour %s : %s", name, e$message))
      return(NULL)
    }
  )
  
  if (is.null(response)) return(NULL)
  
  tables <- tryCatch(
    {
      read_html(response) %>%
        html_table(fill = TRUE)
    },
    error = function(e) {
      message(sprintf("Erreur parsing HTML pour %s", name))
      return(NULL)
    }
  )
  
  if (is.null(tables) || length(tables) == 0) {
    message(sprintf("Aucune table trouvée pour %s", name))
    return(NULL)
  }
  
  df <- tables[[1]]
  df$commodity <- name
  return(df)
}

# === 2. Collecte par matière première ===
commodities <- list(
  list(slug = "rubber", name = "Caoutchouc"),
  list(slug = "crude-oil", name = "Pétrole Brent"),
  list(slug = "gold", name = "Or"),
  list(slug = "cocoa", name = "Cacao"),
  list(slug = "palm-oil", name = "Huile de palme")
)

all_prices <- data.frame()

for (c in commodities) {
  df <- scrape_investing_commodity(c$slug, c$name)
  
  if (!is.null(df) && nrow(df) > 0) {
    # Sauvegarde individuelle
    filename <- file.path(DATA_DIR, paste0(gsub(" ", "_", tolower(c$name)), ".csv"))
    write_csv(df, filename)
    message(sprintf("Sauvegardé : %s (%d lignes)", filename, nrow(df)))
    
    # Agrégation
    df$source <- "Investing.com"
    all_prices <- bind_rows(all_prices, df)
  }
  
  Sys.sleep(2)  # Pause pour éviter le blocage
}

# Sauvegarde consolidée
if (nrow(all_prices) > 0) {
  write_csv(all_prices, file.path(DATA_DIR, "all_commodities.csv"))
  message(sprintf("Fichier consolidé : %d lignes", nrow(all_prices)))
}

# === 3. World Bank Commodity Prices (API alternative) ===
wb_commodities <- function() {
  url <- "https://api.worldbank.org/v2/en/indicator/CM.MKT.INDX.ZG?format=json"
  
  response <- tryCatch(
    GET(url, timeout(30)),
    error = function(e) NULL
  )
  
  if (is.null(response)) {
    message("API World Bank : indisponible")
    return(NULL)
  }
  
  content <- content(response, as = "parsed")
  return(content)
}

message("=== Collecte matières premières terminée ===")
