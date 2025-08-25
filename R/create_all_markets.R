#' Create and return all available markets
#'
#' @param object ignored (use the "missing" method)
#' @return A list of objects of type \code{market_data} or derived classes
#'
#' @author Koffi Frederic SESSIE
#' @author Olabiyi Aurel Géoffroy ODJO
#'
setGeneric("CREATE_ALL_MARKETS", function(object) standardGeneric("CREATE_ALL_MARKETS"))
#' @export
setMethod("CREATE_ALL_MARKETS", signature(object = "missing"), function(object) {
    tryCatch(
        {
            list(
                BRVM_MARKET = african_market(
                    Market_short_name = "BRVM",
                    Market_full_name = "Bourse Régionale des Valeurs Mobilières",
                    Market_url = "https://www.sikafinance.com/",
                    Market_data_url = "https://www.sikafinance.com/api/general/GetHistos",
                    List = "",
                    ListShares = "",
                    ListIndexes = "",
                    ListBonds = "",
                    Indexes = data.frame(),
                    Shares = data.frame(),
                    Bonds = data.frame(),
                    Ticker_full_name = ""
                )  # BRVM (1)
            )
        },
        error = function(e) {
            message(e)
        },
        warning = function(w) {
            message(w)
        }
    )
})
