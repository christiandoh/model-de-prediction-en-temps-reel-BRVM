#' BRVM Get info about a ticker (Beta, RSI, Closing, Valorisation, etc.)
#'
#' @param ticker The ticker of a company or index listed on the BRVM
#'
#' @author Koffi Frederic SESSIE
#' @author Olabiyi Aurel Geoffroy ODJO
#'
#' @description
#' Retrieves detailed financial information (RSI, Beta, closing price, etc.)
#' for a company or index listed on the BRVM stock exchange.
#' The input is automatically converted to upper case.
#'
#' @seealso \url{https://www.sikafinance.com}
#'
#' @return A tibble containing indicators and values for the given ticker(s)
#'
#' @importFrom methods setGeneric setMethod
#' @importFrom utils head tail
#' @importFrom rvest html_elements read_html html_table
#' @importFrom httr GET
#' @importFrom dplyr bind_rows
#' @export
#'
#' @examples
#' \donttest{
#' BRVM_company_info("BOAS")
#' BRVM_company_info("BoaM")
#' BRVM_company_info("BRVMAG")
#' BRVM_company_info("ALL INDEXES")
#' BRVM_company_info("ALL SHARES")
#' BRVM_company_info("ALL")
#' }
#'
#' @rdname BRVM_company_info
#' @export
setGeneric("BRVM_company_info", function(ticker = "ALL") standardGeneric("BRVM_company_info"))

#' @rdname BRVM_company_info
#' @export
setMethod("BRVM_company_info", signature(ticker = "character"), function(ticker) {

    tryCatch({

  ticker<-toupper(ticker)

  ticker <- unique(ticker)
  market_tickers = BRVM_tickers()
  all_tickers = market_tickers@List

  ifelse(ticker =="ALL",ticker <- market_tickers@List,ticker)
  ifelse(ticker =="ALL SHARES",ticker <- market_tickers@ListShares,ticker)
  ifelse(ticker =="ALL INDEXES",ticker <- market_tickers@ListIndexes,ticker)

  tick_vec <- NULL
  full_ticker_name = market_tickers@Ticker_full_name
  ## Filter ticker in .indexes or all_ticker list
  ticker_info_specifique = NULL
  nb_merging = 0
  for (tick in sort(ticker)) {
      locate_ticker = startsWith(full_ticker_name,tick)
      real_ticker = full_ticker_name[which(locate_ticker)][1]
      if(any(locate_ticker)){
          tick_vec = c(tick_vec,real_ticker)
      }

      url <-paste0("https://www.sikafinance.com/marches/cotation_", real_ticker)
      test = httr::GET(url)

      if (test$status_code == 200){
          val<- read_html(url) %>% html_elements('table') %>% html_table()
          ticker_info_specifique <- rbind(val[[1]], val[[2]], val[[3]])
          ticker_info_specifique$Ticker = tick

          if(nb_merging <= 1){
              ticker_info = ticker_info_specifique
          } else {
              ticker_info = rbind(ticker_info,ticker_info_specifique)
          }
          message(paste0("\U2705 Information extracted for ",tick,"."))
      } else {
          message(paste0("\u274C Extraction failed for ",tick,"."))
      }
      nb_merging = nb_merging + 1
    }

    if(length(ticker) == 1){
        colnames(ticker_info) = c("Indicateur","Performance","Ticker")
        ticker_info = ticker_info[,colnames(ticker_info) != c("Ticker")]
    }

    return(ticker_info)
  },
  error = function(e) {
    message("Make sure you have an active internet connection")
  },
  warning = function(w) {
    message("Make sure you have an active internet connection")
  })
})

