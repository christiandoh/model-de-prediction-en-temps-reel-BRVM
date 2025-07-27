#' BRVMFetcher S4 Class - Fetches ticker information from BRVM Stock Exchange
#'
#' @slot url Character. URL to the Google Sheet containing ticker data.
#' @slot data A data.frame. Holds the fetched ticker and company name data.
#'
#' @export
setClass("BRVMFetcher",
         slots = list(
             url = "character",
             data = "data.frame"
         )
)

#' Initialize BRVMFetcher Object
#'
#' @param .Object A BRVMFetcher object
#' @param url A character string, the URL of the Google Sheet
#'
#' @return An initialized BRVMFetcher object
setMethod("initialize", "BRVMFetcher", function(.Object, url = "") {
    .Object@url <- url
    .Object@data <- data.frame()
    .Object
})

#' Get Ticker Information from BRVM
#'
#' @param object A `BRVMFetcher` object.
#'
#' @return A tibble with two columns: Ticker and Company name.
#'
#' @importFrom tibble as_tibble
#' @importFrom gsheet gsheet2tbl
#'
#' @examples
#' \donttest{
#' brvm <- new("BRVMFetcher", url = "https://docs.google.com/spreadsheets/d/1RZ4uh4O8klBgo14eL-JyRL-UbbcAVkC_UY5Ouk4FNRE/edit#gid=581510196")
#' ticks <- getTickers(brvm)
#' dput(ticks$Ticker)
#' }
#'
#' @export
setGeneric("getTickers", function(object) standardGeneric("getTickers"))

setMethod("getTickers", "BRVMFetcher", function(object) {
    tryCatch({
        all.tickers <- gsheet::gsheet2tbl(object@url)
        all.tickers <- all.tickers[1:2]
        colnames(all.tickers) <- c("Ticker", "Company name")
        all.tickers <- tibble::as_tibble(all.tickers)
        object@data <- all.tickers
        return(all.tickers)
    }, error = function(e) {
        message("Make sure you have an active internet connection")
        return(NULL)
    }, warning = function(w) {
        message("Make sure you have an active internet connection")
        return(NULL)
    })
})
