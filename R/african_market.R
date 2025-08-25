#' S4 Class african_market
#'
#' A class that represents market data with its indexes, shares and Bonds.
#'
#' @slot Market_short_name Abbreviated name of the market (character)
#' @slot Market_full_name Full name of the market (character)
#' @slot Market_url URL of the market (character)
#' @slot List List of tickers (character)
#' @slot Indexes Index data (data.frame)
#' @slot Shares Share data (data.frame)
#' @slot Bonds Bond data (data.frame)
#'
#' @author Koffi Frederic SESSIE
#' @author Olabiyi Aurel Géoffroy ODJO
#'
#' @export
setClass(
    "african_market",
    slots = c(
        Market_short_name = "character",
        Market_full_name  = "character",
        Market_url        = "character",
        Market_data_url   = "character",
        List              = "character",
        ListShares = "character",
        ListIndexes = "character",
        ListBonds = "character",
        Indexes           = "data.frame",
        Shares            = "data.frame",
        Bonds            = "data.frame",
        Ticker_full_name = "character"
    ),
    prototype = list(
        Market_short_name = "",
        Market_full_name  = "",
        Market_url        = "",
        Market_data_url   = "",
        List              = "",
        ListShares = "",
        ListIndexes = "",
        ListBonds = "",
        Indexes           = data.frame(),
        Shares            = data.frame(),
        Bonds            = data.frame(),
        Ticker_full_name = ""
    )
)




#' @title Constructor for the 'african_market' S4 class
#'
#' @description Creates an object of the S4 class 'african_market' to represent data for an African stock market.
#'
#' @param Market_short_name A character string for the abbreviated name of the market.
#' @param Market_full_name A character string for the full name of the market.
#' @param Market_url A character string for the URL of the market.
#' @param List A character vector of the market's tickers.
#' @param Indexes A data frame containing data for the market's indexes.
#' @param Shares A data frame containing data for the market's shares.
#' @param Bonds A data frame containing data for the market's bonds.
#' @return A new S4 object of class 'african_market'.
setGeneric("african_market",
           function(Market_short_name,
                    Market_full_name,
                    Market_url,
                    Market_data_url,
                    List,
                    ListShares,
                    ListIndexes,
                    ListBonds,
                    Indexes,
                    Shares,
                    Bonds,
                    Ticker_full_name) standardGeneric("african_market"))
#' @export
setMethod("african_market",
          signature(Market_short_name = "character",
                    Market_full_name = "character",
                    Market_url = "character",
                    Market_data_url = "character",
                    List = "character",
                    ListShares = "character",
                    ListIndexes = "character",
                    ListBonds = "character",
                    Indexes = "data.frame",
                    Shares = "data.frame",
                    Bonds = "data.frame",
                    Ticker_full_name = "character"),
          function(Market_short_name = "",
                   Market_full_name  = "",
                   Market_url = "",
                   Market_data_url = "",
                   List = "",
                   ListShares = "",
                   ListIndexes = "",
                   ListBonds = "",
                   Indexes = data.frame(),
                   Shares = data.frame(),
                   Bonds = data.frame(),
                   Ticker_full_name = "") {
    tryCatch({
            new("african_market",
                Market_short_name = Market_short_name,
                Market_full_name  = Market_full_name,
                Market_url        = Market_url,
                Market_data_url = Market_data_url,
                List              = List,
                ListShares = ListShares,
                ListIndexes = ListIndexes,
                ListBonds = ListBonds,
                Indexes           = Indexes,
                Shares            = Shares,
                Ticker_full_name = Ticker_full_name)
    },
    error = function(e) {
        message(e)
    },
    warning = function(w) {
        message(w)
    })
})




#' Method for accessing slots with $
#'
#' Allows access to slots using the $ notation, similar to S3.
#' @param x An object of class african_market.
#' @param name The name of the slot.
setMethod("$", "african_market", function(x, name) {
    if (!name %in% slotNames(x)) {
        stop(sprintf("Slot '%s' not found. Available: %s",
                     name, paste(slotNames(x), collapse = ", ")))
    }
    slot(x, name)
})


# Autocompletion
.DollarNames.african_market <- function(x, pattern = "") {
    grep(pattern, slotNames(x), value = TRUE)
}




#' Show method for african_market
#'
#' @param object An object of class african_market.
#' @export
setMethod("show", "african_market", function(object) {
    output = c(
        paste0("\033[31mMARKET NAME : ", object@Market_full_name,
               " (", object@Market_short_name, ").\033[0m"),
        paste0("============================ ",
               object@Market_short_name,
               " TICKERS [n = ", length(object@List), "] ============================"),
        paste(object@List, collapse = ", "), "\n",
        paste0("\u2023 === INDEXES [n = ", nrow(object@Indexes), "]"),
        capture.output(print(object@Indexes)), "\n",
        paste0("\u2023 === SHARES [n = ", nrow(object@Shares), "]"),
        capture.output(print(object@Shares)),"\n",
        paste0("\u2023 === BONDS [n = ", nrow(object@Bonds), "]"),
        capture.output(print(object@Bonds)),"\n"
    )
    writeLines(output)
})

