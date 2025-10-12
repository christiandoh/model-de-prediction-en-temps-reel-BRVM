#' BRVM Rank
#'
#' @family Ranking
#' @family Ticker Data Retrieval
#'
#' @author Koffi Frederic SESSIE
#' @author Olabiyi Aurel Geoffroy ODJO
#' @author Oudouss Diakite Abdoul
#' @author Steven P. Sanderson II, MPH
#'
#' @details This function will get any n results for the top or flop ranking
#' of the BRVM tickers.
#'
#' @description This function will take in 'Up' or 'Down' and returns respectively n results for the top or flop ranking
#' of the BRVM tickers.
#'
#' @param .up_or_down This is a character string set to "Up" It can either be
#' 'Up' or 'Down'.
#' @param N An integer specifying the number of companies to return.
#'   Default is 10.
#'
#' @importFrom methods setGeneric setMethod
#'
#' @examples \donttest{
#' BRVM_direction("Up", 10)
#' BRVM_direction("Down", 5)
#'}
#'
#' @return
#' A tibble
#'
#'
#' @rdname BRVM_direction
#' @export
setGeneric("BRVM_direction", function(.up_or_down = "Up", N = 10) standardGeneric("BRVM_direction"))


#' @rdname BRVM_direction
#' @export
setMethod("BRVM_direction", signature(.up_or_down = "character", N = "numeric"), function(.up_or_down = "Up", N = 10) {

    # Set params ----
    up_down <- tolower(.up_or_down)
    quotes_tbl = BRVM_company_rank()
    ret = NULL

    if (up_down == "up") {
        ret <- head(quotes_tbl,N)
    } else if (up_down == "down") {
        ret <- tail(quotes_tbl,N)
    } else{
        message(paste0("'",up_down, "' is not correct! ","Choose 'Up' or 'Down' instead!"))
    }
    return(ret)

    #
    # # get data ----
    # quotes_tbl <- gsheet::gsheet2tbl("https://docs.google.com/spreadsheets/d/1rdjGjlQg7cUzWAEJFikrxOnisk-yQQx-n652sJUL-qc/edit#gid=0")
    #
    # names(quotes_tbl) <- c("Symbol", "Name", "Volume",
    #                        "Previous price  (FCFA)", "Opening price (FCFA)",
    #                        "Closing price  (FCFA)", "Change_percent")
    #
    #
    # quotes_tbl$Change_percent <- gsub(",", ".", quotes_tbl$Change_percent)
    # quotes_tbl$Change_percent <- as.numeric(quotes_tbl$Change_percent)
    # quotes_tbl <- quotes_tbl[-c(3:6)]
    #
    # if (up_down == "up") {
    #     ret <- dplyr::arrange(quotes_tbl, dplyr::desc(quotes_tbl$Change_percent)) %>%
    #         dplyr::slice(1:nrow(quotes_tbl))
    #     ret <- dplyr::as_tibble(ret)
    #     names(ret) <- c("Symbole", "Nom", "Variation in percentage")
    #     # Return data ----
    #
    #     return(ret)
    # } else if (up_down == "down") {
    #     quotes_tbl$rank <- rank(quotes_tbl$Change_percent)
    #     quotes_tbl <- quotes_tbl[order(quotes_tbl$rank), ]
    #     ret <- quotes_tbl %>%
    #         dplyr::slice(1:nrow(quotes_tbl)) %>%
    #         dplyr::select(-rank)
    #     ret <- dplyr::as_tibble(ret)
    #     names(ret) <- c("Symbol", "Name", "Variation in percentage")
    #     # Return data ----
    #
    #     return(ret)
    #  } else{
    #       message(paste0("'",up_down, "' is not correct! ","Choose 'Up' or 'Down' instead!"))
    #  }

})

