#' African Market Class
#'
#' @description
#' An S4 class designed to represent and store structured information
#' about African financial markets, including metadata, trading instruments,
#' and market data sources.
#'
#' @slot Market_short_name A short abbreviation of the market name (e.g. "BRVM").
#' @slot Market_full_name The full name of the market (e.g. "Bourse Régionale des Valeurs Mobilières").
#' @slot Official_url The official website of the market.
#' @slot Market_url A general URL for accessing market information.
#' @slot Market_data_url A URL pointing to detailed market data.
#' @slot List A string summarizing available lists of instruments.
#' @slot ListShares A string or URL referencing the list of shares.
#' @slot ListIndexes A string or URL referencing the list of indexes.
#' @slot ListBonds A string or URL referencing the list of bonds.
#' @slot Indexes A data frame containing index-level information.
#' @slot Shares A data frame containing share-level information.
#' @slot Bonds A data frame containing bond-level information.
#' @slot Ticker_full_name The full name corresponding to a ticker symbol.
#'
#' @return
#' An object of class \code{african_market}.
#'
#' @author Koffi Frederic SESSIE
#' @author Olabiyi Aurel Geoffroy ODJO
#'
#' @importFrom methods setGeneric setMethod
#' @importFrom methods new slot slotNames
#' @importFrom utils capture.output
#'
#' @exportClass african_market
setClass(
    "african_market",
    slots = c(
        Market_short_name = "character",
        Market_full_name  = "character",
        Official_url        = "character",
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
        Official_url        = "",
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
#' @description
#' Creates an object of class \code{african_market}, which stores metadata and financial
#' data related to an African stock market. This includes basic identifiers, official URLs,
#' and structured data frames for indexes, shares, and bonds.
#'
#' @param Market_short_name A character string for the abbreviated name of the market (e.g. "BRVM").
#' @param Market_full_name A character string for the full name of the market (e.g. "Bourse Régionale des Valeurs Mobilières").
#' @param Official_url A character string for the official website of the market.
#' @param Market_url A character string for the general URL of the market.
#' @param Market_data_url A character string for the URL to access detailed market data.
#' @param List A character string describing the types of lists available (e.g. "Shares, Indexes, Bonds").
#' @param ListShares A character string or URL pointing to the list of shares.
#' @param ListIndexes A character string or URL pointing to the list of indexes.
#' @param ListBonds A character string or URL pointing to the list of bonds.
#' @param Indexes A data frame containing information on market indexes.
#' @param Shares A data frame containing information on market shares.
#' @param Bonds A data frame containing information on market bonds.
#' @param Ticker_full_name A character string for the full name associated with a ticker symbol.
#'
#' @details
#' This constructor initializes an S4 object of class \code{african_market},
#' which is useful for storing structured data and metadata for African financial markets.
#' It can serve as the backbone for functions that fetch, analyze, and visualize market data.
#'
#' @importFrom methods new setGeneric setMethod
#'
#' @return An object of class \code{african_market}.
#'
#' @family African Markets
#' @seealso \code{\link{setClass}}, \code{\link{african_market}}
#'
#' @rdname african_market
#' @export
#' @return A new S4 object of class 'african_market'.
setGeneric("african_market",
           function(Market_short_name,
                    Market_full_name,
                    Official_url,
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


#' @rdname african_market
#' @export
setMethod("african_market",
          signature(Market_short_name = "character",
                    Market_full_name = "character",
                    Official_url = "character",
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
                   Official_url = "",
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
                Official_url = Official_url,
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
#'
#' @importFrom methods new slot slotNames
#' @importFrom utils capture.output
#'
setMethod("show", "african_market", function(object) {
    output = c(
        paste0("\033[31mMARKET NAME : ", object@Market_full_name,
               " (", object@Market_short_name, ").\033[0m"),
        paste0("Official URL : ",object@Official_url),
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

