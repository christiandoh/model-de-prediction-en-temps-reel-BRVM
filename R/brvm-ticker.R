
#' @title Get BRVM Tickers
#'
#' @description A method that retrieves and processes ticker data for indexes and shares from the BRVM website.
#' Retrieves information about companies listed on the Bourse Régionale des Valeurs Mobilières (BRVM).
#' This function returns an S4 object containing the list of tickers, detailed shares information,
#' and (optionally) BRVM indexes.
#'
#' @param object An object of class `missing`, indicating this method is a constructor that does not require an input object.
#' @return A new S4 object of class `market_description` populated with ticker data from the BRVM.
#'
#' @details
#' The BRVM (Bourse Régionale des Valeurs Mobilières) is a regional stock exchange serving the
#' West African Economic and Monetary Union (WAEMU / UEMOA).
#'
#' @importFrom methods setGeneric setMethod
#' @import rvest
#' @import httr2
#' @import tidyr
#'
#' @author Koffi Frederic SESSIE
#' @author Olabiyi Aurel Geoffroy ODJO
#' @author Oudouss Diakite Abdoul
#' @author Steven P. Sanderson II, MPH
#'
#' @examples
#'\dontrun{
#' BRVM_tickers()
#' ticks <- BRVM_tickers()
#' dput(ticks$Ticker) ## Returns the name of all tickers
#'}
#'
#' \donttest{
#' # Retrieve BRVM tickers
#' library(rvest)
#' library(httr2)
#' library(tidyr)
#' brvm_tickers <- BRVM_tickers()
#'
#' # Display shares
#' brvm_tickers$Shares
#'
#' # List of tickers
#' brvm_tickers$List
#'
#' # Print object
#' brvm_tickers
#' }
#'
#' @rdname BRVM_tickers
#' @export
setGeneric("BRVM_tickers", function(object) standardGeneric("BRVM_tickers" ))


#' @rdname BRVM_tickers
#' @export
setMethod("BRVM_tickers", signature(object = "missing"), function(object) {
    tryCatch(
         {
             # url_indexes = "https://www.brvm.org/en/indices"
             # url_shares = "https://www.brvm.org/en/cours-actions/0/"
             #
             # # indexes
             # object@Indexes = data.frame(Ticker = paste0(
             #     "BRVM",c(
             #         "30","C","PR","PA","-CB","-CD","-EN","-IN","SF","SP","-TEL","AG","AS",
             #         "DI","FI","IN","-SP","TR"
             #     )
             # ),
             # Name = c('BRVM - 30','BRVM - COMPOSITE','BRVM - PRESTIGE','BRVM - PRINCIPAL','BRVM - CONSOMMATION DE BASE','BRVM - CONSOMMATION DISCRETIONNAIRE','BRVM - ENERGIE','BRVM - INDUSTRIELS','BRVM - SERVICES FINANCIERS','BRVM - SERVICES PUBLICS','BRVM - TELECOMMUNICATIONS','BRVM - AGRICULTURE','BRVM - AUTRES SECTEURS','BRVM - DISTRIBUTION','BRVM - FINANCE','BRVM - INDUSTRIE','BRVM - SERVICES PUBLICS','BRVM - TRANSPORT')
             # )
             #
             # #indexes_page <- GET(url_indexes, config(ssl_verifypeer = FALSE))
             # #indexes_tables <- read_html(indexes_page, encoding = "UTF-8") %>%
             # #html_elements("table") %>% html_table()
             # #object@Indexes = as.data.frame(do.call("rbind",indexes_tables[4:100]))[1]
             #
             # # shares
             # asset_page <- GET(url_shares, config(ssl_verifypeer = FALSE))
             # asset_tables <- read_html(asset_page, encoding = "UTF-8") %>%
             #     html_elements("table") %>% html_table()
             # object@Shares = as.data.frame(asset_tables[[4]])[1:2]
             # colnames(object@Shares)<-c("Ticker","Company name")
             #
             # # List
             # object@List = c(object@Indexes[,1],object@Shares[,1])

            brvm_market = CREATE_ALL_MARKETS()$BRVM_MARKET

             # Extraire les éléments <option> dans le <select id="dpShares">
             options <- rvest::read_html(brvm_market@Market_url[1]) %>%
                 rvest::html_element(xpath = '//*[@id="dpShares"]') %>%
                 rvest::html_elements("option")

             # General extraction

             ticker_data <- data.frame(
                 Type = ifelse(options %>% html_attr("value") == "","Nothing",
                               ifelse(grepl("\\.",options %>% html_attr("value")),"Share","Index")),
                 Ticker = options %>% html_attr("value") %>% strsplit("\\.") %>% sapply(`[`, 1), # avant les "."
                 Description = options %>% html_text(trim = TRUE),
                 `Country.Code` = options %>% html_attr("value") %>% strsplit("\\.") %>% sapply(`[`, 2) %>% toupper(),
                 Ticker_fullname = options %>% html_attr("value")
             )
             ticker_data = ticker_data[order(ticker_data$Country.Code ),]


             # Indexes
             brvm_market@Indexes = ticker_data[startsWith(ticker_data$Ticker_fullname,"BRVM") & ticker_data$Type == "Index",2:3]
             rownames(brvm_market@Indexes) = NULL

             # Shares
             brvm_market@Shares = ticker_data[!startsWith(ticker_data$Ticker_fullname,"BRVM") & !startsWith(ticker_data$Ticker_fullname,"SIKA") & ticker_data$Type == "Share",2:4]
             rownames(brvm_market@Shares) = NULL

             # Name List
             brvm_market@ListIndexes = brvm_market@Indexes[,1]
             brvm_market@ListShares = brvm_market@Shares[,1]
             brvm_market@List = c(brvm_market@ListIndexes,brvm_market@ListShares) #Nom de tous les actifs
             brvm_market@Ticker_full_name = ticker_data[!(ticker_data$Ticker_fullname == ""),5]

            return(brvm_market)
        },
        error = function(e) {
            message("Make sure you have an active internet connection. ")
        },
        warning = function(w) {
            message("Make sure you have an active internet connection. ")
        }
    )
})

