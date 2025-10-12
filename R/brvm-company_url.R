#' BRVM company url
#'
#' @description It receives the ticker name and return an URL
#'
#' @family BRVM
#' @author Koffi Frederic SESSIE
#' @author Olabiyi Aurel Geoffroy ODJO
#'
#' @param ticker is the name of the Ticker
#'
#' @return URLs
#'
#'
#' @importFrom methods setGeneric setMethod
#'
#' @examples
#' \dontrun{
#'     BRVM_company_url("ALL")
#' }
#'
#' @rdname BRVM_company_url
#' @export
setGeneric("BRVM_company_url", function(ticker = "ALL") standardGeneric("BRVM_company_url"))


#' @rdname BRVM_company_url
#' @export
setMethod("BRVM_company_url", signature(ticker = "character"), function(ticker) {

    ticker <- unique(toupper(ticker))

    ticker <- unique(ticker)
    market_tickers = BRVM_tickers()
    all_tickers = market_tickers@List

    ifelse(ticker =="ALL",ticker <- market_tickers@List,ticker)
    ifelse(ticker =="ALL SHARES",ticker <- market_tickers@ListShares,ticker)
    ifelse(ticker =="ALL INDEXES",ticker <- market_tickers@ListIndexes,ticker)

    full_ticker_name = market_tickers@Ticker_full_name
    tick_vec = NULL

    for (tick in sort(ticker)) {
        locate_ticker = startsWith(full_ticker_name,tick)
        real_ticker = full_ticker_name[which(locate_ticker)][1]
        if(any(locate_ticker)){
            tick_vec = c(tick_vec,real_ticker)
        }
    }

    url <-paste0("https://www.sikafinance.com/marches/cotation_", tick_vec)
    return(url)
})
