#' BRVM Tickers - Information about listed companies on BRVM Stock Exchange
#'
#' @description
#' Retrieves information about companies listed on the Bourse R\u00E9gionale des Valeurs Mobili\u00E8res (BRVM).
#' This function returns an S4 object containing the list of tickers, detailed shares information,
#' and (optionally) BRVM indexes.
#'
#' @details
#' The BRVM (Bourse Régionale des Valeurs Mobilières) is a regional stock exchange serving the
#' West African Economic and Monetary Union (WAEMU / UEMOA).
#' @return An object of class \code{brvm_tickers} with the following slots:
#' \itemize{
#'   \item \code{List} - Character vector containing the tickers.
#'   \item \code{Indexes} - Data frame of BRVM indexes (may be empty if not retrieved).
#'   \item \code{Shares} - Data frame of BRVM shares with columns:
#'         \code{Ticker} and \code{Company name}.
#' }
#'
#' @author Koffi Frederic SESSIE
#' @author Oudouss Diakité Abdoul
#' @author Steven P. Sanderson II, MPH
#' #author Olabiyi Aurel G\u00E9offroy ODJO
#'
#' @seealso \code{\link{BRVM_ticker_desc}}
#'
#' @importFrom rvest read_html html_elements html_table
#' @importFrom httr GET config
#'
#' @examples
#' \donttest{
#' # Retrieve BRVM tickers
#' brvm_data <- BRVM_tickers()
#'
#' # Display shares
#' brvm_data$Shares
#'
#' # List of tickers
#' brvm_data$List
#'
#' # Print object
#' brvm_data
#' }
setClass(
    "brvm_tickers",
    slots = c(List = "character",Indexes = "data.frame",Shares = "data.frame"),
    prototype = list(
        List = "",
        Indexes = data.frame(NA),
        Shares = data.frame(NA)
    )
)

setMethod("$", "brvm_tickers", function(x, name) {
    if (!name %in% slotNames(x)) {
        stop(sprintf("Slot '%s' not found. Available: %s", name, paste(slotNames(x), collapse = ", ")))
    }
    slot(x, name)
})

.DollarNames.brvm_tickers <- function(x, pattern = "") {
    grep(pattern, slotNames(x), value = TRUE)
}

setMethod("show","brvm_tickers",function(object){
    output = c(
        paste0("============================ BRVM TICKERS [n = ",length(object@List),"] ============================"),
        paste(object@List,collapse = ", "),"\n",
        paste0("\u2023 === INDEXES [n = ",nrow(object@Indexes),"]"),
        capture.output(print(object@Indexes)),
        paste0("\u2023 === SHARES [n = ",nrow(object@Shares),"]"),
        capture.output(print(object@Shares))
    )
    writeLines(output)
})



#' BRVM Tickers - Information about listed companies on BRVM Stock exchange
#'
#' @author Koffi Frederic SESSIE
#' @author Oudouss Diakité Abdoul
#' @author Steven P. Sanderson II, MPH
#' #author Olabiyi Aurel G\u00E9offroy ODJO
#'
#' @description It receives no argument and returns two informations about BRVM exchange companies (ticker and company name).
#'
#' @seealso `BRVM_ticker_desc()`
#'
#' @return A tibble
#'
#' @importFrom rvest read_html html_elements
#' @importFrom httr GET
#'
#'
#' @examples
#'\donttest{
#' BRVM_tickers()
#' ticks <- BRVM_tickers()
#' dput(ticks$Ticker) ## Returns the name of all tickers
#'}

setGeneric("BRVM_tickers", function(object) standardGeneric("BRVM_tickers"))
#' @export
setMethod("BRVM_tickers", signature(object = "missing"), function(object) {
    tryCatch(
         {
             object=new("brvm_tickers")
             url_indexes = "https://www.brvm.org/en/indices"
             url_shares = "https://www.brvm.org/en/cours-actions/0/"

             # indexes
             object@Indexes = data.frame(Ticker = paste0(
                 "BRVM",c(
                     "30","C","PR","PA","-CB","-CD","-EN","-IN","SF","SP","-TEL","AG","AS",
                     "DI","FI","IN","-SP","TR"
                 )
             ),
             Name = c('BRVM - 30','BRVM - COMPOSITE','BRVM - PRESTIGE','BRVM - PRINCIPAL','BRVM - CONSOMMATION DE BASE','BRVM - CONSOMMATION DISCRETIONNAIRE','BRVM - ENERGIE','BRVM - INDUSTRIELS','BRVM - SERVICES FINANCIERS','BRVM - SERVICES PUBLICS','BRVM - TELECOMMUNICATIONS','BRVM - AGRICULTURE','BRVM - AUTRES SECTEURS','BRVM - DISTRIBUTION','BRVM - FINANCE','BRVM - INDUSTRIE','BRVM - SERVICES PUBLICS','BRVM - TRANSPORT')
             )

             #indexes_page <- GET(url_indexes, config(ssl_verifypeer = FALSE))
             #indexes_tables <- read_html(indexes_page, encoding = "UTF-8") %>%
             #html_elements("table") %>% html_table()
             #object@Indexes = as.data.frame(do.call("rbind",indexes_tables[4:100]))[1]


             # shares
             asset_page <- GET(url_shares, config(ssl_verifypeer = FALSE))
             asset_tables <- read_html(asset_page, encoding = "UTF-8") %>%
                 html_elements("table") %>% html_table()
             object@Shares = as.data.frame(asset_tables[[4]])[1:2]
             colnames(object@Shares)<-c("Ticker","Company name")

             # List
             object@List = c(object@Indexes[,1],object@Shares[,1])

            return(object)
        },
        error = function(e) {
            message("Make sure you have an active internet connection")
        },
        warning = function(w) {
            message("Make sure you have an active internet connection")
        }
    )
})



