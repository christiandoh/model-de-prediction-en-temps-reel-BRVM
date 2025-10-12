#' BRVM Company Ranking by Daily Performance
#'
#' @description
#' Retrieves daily trading data for all companies listed on the
#' Bourse Régionale des Valeurs Mobilières (BRVM) and ranks them
#' according to their percentage change in share price.
#'
#' @param object No need to give an argument.
#'
#' @details
#' The function scrapes the official BRVM website to collect trading
#' information such as traded volume, previous price, opening price,
#' closing price, and daily percent change.
#' After cleaning and converting numeric fields, companies are ranked
#' in descending order of percentage change, making it easy to identify
#' the day's top gainers and losers.
#'
#' @return
#' A tibble containing the following columns:
#' \itemize{
#'   \item \code{ticker} – The stock ticker symbol.
#'   \item \code{company_name} – The name of the company.
#'   \item \code{percent_change} – The daily percentage change.
#'   \item \code{rank} – The company's position in the ranking (1 = highest increase).
#' }
#'
#'
#' @family Data Retrieval
#' @family BRVM
#'
#' @importFrom methods setGeneric setMethod
#' @import rvest dplyr
#'
#' @author Koffi Frederic SESSIE
#' @author Olabiyi Aurel Geoffroy ODJO
#' @author Oudouss Diakite Abdoul
#' @author Steven P. Sanderson II, MPH
#'
#' @seealso \url{https://www.brvm.org/en/cours-actions/0}
#'
#' @details This function will get the rank of the companies listed on the BVRM exchange through the Rich Bourse site.
#' The function takes no parameter
#'
#' @description This function returns companies rank from the BRVM Bourse exchange according to their daily change (variation).
#'
#'
#' @return
#' "tbl_df"     "tbl"        "data.frame"
#'
#' @export
#'
#' @examples
#' \donttest{
#' library(dplyr)
#' library(rvest)
#' BRVM_company_rank()
#' comp.rank <- BRVM_company_rank()
#' comp.rank<-comp.rank%>%
#' dplyr::arrange(desc(percent_change))
#' comp.rank
#'}
#' @rdname BRVM_company_rank
#' @export
setGeneric("BRVM_company_rank", function(object) standardGeneric("BRVM_company_rank" ))



#' @rdname BRVM_company_rank
#' @export
setMethod("BRVM_company_rank", signature(object = "missing"), function(object) {
  tryCatch(
    {
      quotes_tbl <- rvest::read_html("https://www.brvm.org/en/cours-actions/0/status/200") %>%
        rvest::html_nodes('table') %>%
        rvest::html_table()
      quotes_tbl <- quotes_tbl[[4]]

      # quotes_tbl$`Change (%)`<-gsub(",", ".", quotes_tbl$`Change (%)`)
      # quotes_tbl$`Change (%)`<-as.numeric(quotes_tbl$`Change (%)`)
      # quotes_tbl$Volume<-gsub(" ", "", quotes_tbl$Volume)
      # quotes_tbl$Volume<-as.numeric(quotes_tbl$Volume)
      # quotes_tbl$`Previous price`<-gsub(" ", "", quotes_tbl$`Previous price`)
      # quotes_tbl$`Previous price`<-as.numeric(quotes_tbl$`Previous price`)
      # quotes_tbl$`Opening price`<-gsub(" ", "", quotes_tbl$`Opening price`)
      # quotes_tbl$`Opening price`<-as.numeric(quotes_tbl$`Opening price`)
      # quotes_tbl$`Closing price`<-gsub(" ", "", quotes_tbl$`Closing price`)
      # quotes_tbl$`Closing price`<-as.numeric(quotes_tbl$`Closing price`)

      # Mes colonnes numeriques
      numeric_columns <- c("Change (%)", "Volume", "Previous price", "Opening price", "Closing price")

      # Enlever les espaces vides
      quotes_tbl <- quotes_tbl %>%
          dplyr::mutate(across(numeric_columns, ~(gsub(" ", "", .))))

      quotes_tbl <- quotes_tbl %>%
          dplyr::mutate(across(all_of(numeric_columns), ~as.numeric(gsub(",", ".", .))))

      colnames(quotes_tbl)<-c(
        "ticker",
        "company_name",
        "volume",
        "previous_price",
        "open",
        "close",
        "percent_change")
      quotes_tbl$rank <- rank(-quotes_tbl$`percent_change`)

      # Use order() instead
      quotes_tbl <- quotes_tbl[order(-quotes_tbl$`percent_change`),]
      #quotes_tbl <-dplyr::arrange(quotes_tbl, dplyr::desc(quotes_tbl$`percent_change`))
      # quotes_tbl <- quotes_tbl[sort(quotes_tbl$rank), ]
      #print(names(quotes_tbl))
      return(quotes_tbl[c(1,2,7,8)])
    },
    error = function(e) {
      message("Make sure you have an active internet connection")
    },
    warning = function(w) {
      message("Make sure you have an active internet connection")
    }
  )
})

