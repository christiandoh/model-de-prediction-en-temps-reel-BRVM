#' Get historical data for BRVM securities
#'
#' @description
#' This function retrieves historical price and volume data for one or more securities listed on the BRVM (Bourse Regionale des Valeurs Mobilieres) market.
#'
#' @family Data Retrieval
#' @family Sikafinance
#'
#' @author Koffi Frederic SESSIE
#' @author Olabiyi Aurel Geoffroy ODJO
#'
#'
#' @seealso `BRVM_tickers()`
#' @seealso \url{https://www.sikafinance.com/}
#'
#'
#' @details This function will get data of the companies listed on the BVRM exchange through the sikafinance site. The function
#' takes in a single parameter of `ticker` The function will auto-format the
#' tickers you input into all upper case by using `toupper()`


#' The function allows you to specify a single ticker or a vector of tickers. It also provides shortcuts for retrieving data for all securities ("ALL"), all shares ("ALL SHARES"), or all indexes ("ALL INDEXES").
#'
#' The data is retrieved from a remote server, and the function handles the pagination of requests to ensure that long time periods can be fetched without errors. It also includes error handling for internet connection issues and invalid date parameters.
#'
#' The output can be formatted in two ways:
#' \itemize{
#'   \item \code{"by_col"}: Returns a single data frame with a \code{Ticker} column that identifies each security's data. This is the default format.
#'   \item \code{"by_row"}: Returns a single data frame where each security's data (Open, High, Low, Close, Volume) is arranged in separate columns, with the ticker name as a prefix (e.g., \code{TICKER.Open}). This format is suitable for direct use in time series analysis where each column represents a different series.
#' }
#'
#' A progress bar is displayed in the console to show the download progress for each ticker.
#'
#' @param ticker A character vector specifying the tickers of the securities to retrieve. The ticker names are case-insensitive. Special values include:
#' \itemize{
#'   \item \code{"ALL"}: Retrieves data for all securities (shares and indexes).
#'   \item \code{"ALL SHARES"}: Retrieves data for all shares.
#'   \item \code{"ALL INDEXES"}: Retrieves data for all indexes.
#'   \item A vector of specific ticker symbols, e.g., \code{c("ECOC", "SGBCI")}.
#' }
#' @param Period An integer or character string specifying the data aggregation period. Valid values are:
#' \itemize{
#'   \item \code{0} or \code{"daily"} (default): Daily data.
#'   \item \code{7} or \code{"weekly"}: Weekly data.
#'   \item \code{30} or \code{"monthly"}: Monthly data.
#'   \item \code{91} or \code{"quarterly"}: Quarterly data.
#'   \item \code{365} or \code{"yearly"}: Yearly data.
#' }
#' @param from A date object or a character string representing the start date of the data period. The function expects a format like \code{"YYYY-MM-DD"}. Defaults to 90 days before the current date.
#' @param to A date object or a character string representing the end date of the data period. The function expects a format like \code{"YYYY-MM-DD"}. Defaults to the current date.
#' @param output_format A character string indicating the desired output structure. Must be one of \code{"by_col"} (default) or \code{"by_row"}.
#'
#' @return A data frame containing the historical data for the specified tickers. The columns of the data frame are \code{Date}, \code{Open}, \code{High}, \code{Low}, \code{Close}, \code{Volume}, and optionally \code{Ticker} if `output_format` is "by_col". If no data is available for a given ticker in the specified date range, a message is printed to the console, and that ticker is not included in the output.
#'
#' @importFrom methods setGeneric setMethod
#' @importFrom httr2 req_body_json req_perform request resp_body_json
#' @importFrom dplyr group_by summarise as_tibble
#' @importFrom lubridate parse_date_time
#' @importFrom rlang abort
#' @importFrom stringr str_sub
#'
#'
#' @examples
#' \dontrun{
#'
#' library(lubridate)
#' library(rlang)
#' library(httr2)
#' library(dplyr)
#' library(stringr)
#' # Get daily data for a single ticker
#' daily_data <- BRVM_get("SGBCI", from = "2023-01-01", to = "2023-03-31")
#'
#' # Get monthly data for multiple tickers, with a single column per ticker
#' monthly_data <- BRVM_get(ticker = c("ECOC", "SGBCI"), Period = "monthly", output_format = "by_row")
#'
#' # Get weekly data for all indexes for the last year
#' all_indexes_weekly <- BRVM_get("ALL INDEXES", Period = "weekly", from = Sys.Date() - 365)
#' }
#' @rdname BRVM_get
#' @export
setGeneric("BRVM_get", function(ticker = "ALL",Period = "daily",from = Sys.Date() - 89,to = Sys.Date(),output_format = c("by_col","by_row")) standardGeneric("BRVM_get"))


#' @rdname BRVM_get
#' @export
setMethod(
    "BRVM_get",
    signature(ticker = "character"),
    function(ticker = "ALL",Period = "daily",from = Sys.Date() - 89,to = Sys.Date(),output_format = c("by_col","by_row")) {
        tryCatch({

            first_date <- lubridate::parse_date_time(from, orders = "ymd")
            end_date   <- lubridate::parse_date_time(to, orders = "ymd")
            ssl_verifypeer = TRUE

            #Period = "daily"
            if(Period %in% c('daily', 'weekly', 'monthly', 'quarterly','yearly')){
                Period = switch(
                    tolower(Period),
                    daily = 0,
                    weekly = 7,
                    monthly = 30,
                    quarterly = 91,
                    yearly = 365
                )
            }

            if (first_date >= end_date){
                rlang::abort(
                    "The '.from' parameter (start_date) must be less than '.to' (end_date)"
                )
            } else if (first_date >= Sys.Date()-2){
                rlang::abort(
                    "The '.from' parameter (start_date) must be less than today's date"
                )
            }

            tryCatch(
                {
                if (!ssl_verifypeer) { # pour les ordinateurs qui n'ont pas le SSL a jours ou a jours par rapport aux ssl du serveur
                    message("This request is not protected.
                                    SSL verification is disabled.
                                    The request can be intercepted (MITM),
                                    data can be stolen or modified,
                                    and the host may be exposed to attacks.
                                    Avoid disabling SSL verification unless you fully trust the server and your internet connection.")
                }

                ticker <- unique(toupper(ticker))
                market_tickers = BRVM_tickers()
                all_tickers = market_tickers@List

                ifelse(ticker =="ALL",ticker <- market_tickers@List,ticker)
                ifelse(ticker =="ALL SHARES",ticker <- market_tickers@ListShares,ticker)
                ifelse(ticker =="ALL INDEXES",ticker <- market_tickers@ListIndexes,ticker)

                tick_vec <- NULL
                full_ticker_name = market_tickers@Ticker_full_name
                ## Filter ticker in .indexes or all_ticker list

                for (tick in ticker) {
                    locate_ticker = startsWith(full_ticker_name,tick)
                    if(any(locate_ticker)){
                        tick_vec = c(tick_vec,full_ticker_name[which(locate_ticker)])
                    }
                }

                # Check input parameters after filtering ----
                if (length(tick_vec) < 1){
                    rlang::abort(
                        "The 'ticker' parameter cannot be blank. Please enter at least one ticker.
                        If entering multiple please use .symbol = c(Tick_1, Tick_2, ...)"
                    )
                } else {
                    ticker <- tick_vec
                }

                ticker_data <- as.data.frame(matrix(NA, ncol = 7, nrow = 0))
                names(ticker_data) <- c("Date", "Open", "High", "Low", "Close", "Volume","Ticker")

                nb_merging = 0 # nombre de fusion fait

                    if (as.numeric(Period) %in% c(0, 7, 30, 91, 365)){
                        #Tick = ticker[1]
                        #Period = 0
                        for (Tick in ticker) {

                            TickName = sub("\\..*", "", Tick)
                            asset_data <- as.data.frame(matrix(NA, ncol = 6, nrow = 0))
                            names(asset_data) <- c("Date", "Open", "High", "Low", "Close", "Volume")

                            range_period = seq(from = first_date, to = end_date, by = "89 day")
                            ifelse(!(end_date %in% range_period),
                                range_period <- c(range_period,end_date),range_period)

                            range_period_length = length(range_period)
                            range_period_length_adjusted = range_period_length - 1 # parcourir jusqu'a l'avant derniere date

                            for(i in 1:range_period_length_adjusted) {  # parcourir les intervalles de periode

                                # i = 1
                                from_date <- as.Date.POSIXct(range_period[i])
                                to_date <- as.Date.POSIXct(range_period[i+1])

                                base_request <- request(market_tickers@Market_data_url) %>%
                                    req_method("POST") %>%
                                    req_headers(
                                        "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0",
                                        "Accept" = "*/*",
                                        "Accept-Language" = "fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3",
                                        "Origin" = "https://www.sikafinance.com",
                                        "Connection" = "keep-alive",
                                        "Referer" = paste0("https://www.sikafinance.com/marches/historiques/", Tick),
                                        "Sec-Fetch-Dest" = "empty",
                                        "Sec-Fetch-Mode" = "cors",
                                        "Sec-Fetch-Site" = "same-origin"
                                    )

                                Sys.sleep(0.111) #;print("A") fast

                                my_data <- base_request %>%
                                    req_body_json(list('ticker'= Tick,
                                                       'datedeb'= from_date,
                                                       'datefin'= to_date,
                                                       'xperiod'= paste0(Period,''))) %>%
                                    req_perform() %>%
                                    resp_body_json(simplifyVector = T)

                                if (length(my_data$lst)==6) {
                                    my_data <- as.data.frame(my_data$lst)
                                    asset_data <- rbind(asset_data, my_data)
                                }
                            }

                            if (ncol(asset_data) == 6 && nrow(asset_data) > 0) {

                                asset_data$Date<-as.Date.character(asset_data$Date, format = "%d/%m/%Y")

                                ifelse (any(duplicated(asset_data$Date)),
                                        asset_data <- asset_data %>% dplyr::distinct(),asset_data)
                                        # dplyr::group_by(Date)%>%
                                        #     dplyr::summarise(Open = mean(Open),
                                        #                      High = mean(High),
                                        #                      Low = mean(Low),
                                        #                      Close = mean(Close),
                                        #                      Volume = mean(Volume))

                                message(paste0("\U2705 We obtained ",TickName,  " data from ",
                                               min(asset_data$Date),
                                               " to ",
                                               max(asset_data$Date)))

                                if(output_format[1] == "by_col"){ # agencer suivant les colonnes
                                    asset_data$Ticker <- TickName
                                    if (nb_merging == 0){
                                        ticker_data <- asset_data # initialisation
                                    } else if(nb_merging > 0){
                                        ticker_data <- rbind(ticker_data, asset_data)
                                    }
                                } else if(output_format[1] == "by_row"){ # agencer suivant les lignes

                                    asset_data_names = colnames(asset_data)
                                    colnames(asset_data) <- c(
                                        asset_data_names[1],
                                        paste(TickName,asset_data_names,sep = ".")[-1]
                                    )

                                    if (nb_merging == 0){
                                        ticker_data <- asset_data # initialisation
                                    } else if(nb_merging > 0){
                                        ticker_data <- merge(ticker_data, asset_data,by = asset_data_names[1],all = TRUE)
                                    }
                                }
                                nb_merging = nb_merging + 1

                            } else {
                                message(paste0("\u274C ",TickName," data aren't available between ",
                                               first_date,
                                               " and ",
                                               end_date))
                            }

                        }


                        if(is.data.frame(ticker_data)){
                            if (length(unique(ticker_data$Ticker)) == 1){
                                ticker_data = ticker_data[, -7] # enlever colonne ticker
                            }

                            ticker_data = ticker_data %>% dplyr::arrange(Date)
                        }

                        return(ticker_data) # final output

                    }

                    else {
                        message("Choose the best period between 0, 7, 30, 91 and 365")
                    }

                },
                error = function(e) {
                    message("Make sure you have an active internet connection")
                },
                warning = function(w) {
                    message("Make sure you have an active internet connection")
                }
            )
})})
