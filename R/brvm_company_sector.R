#' Company's sector — Retrieve the sector of a given company
#'
#' @family Data Retrieval
#' @family BRVM
#'
#' @author Koffi Frederic SESSIE
#' @author Olabiyi Aurel Geoffroy ODJO
#'
#' @description
#' This function takes the name (ticker) of a company listed on the BRVM stock exchange,
#' converts it to uppercase using `toupper()`, and returns information about the company's sector.
#'
#' If the company is not found, a message is displayed indicating that the company does not exist.
#' If a single match is found, the function returns the corresponding sector as a character string.
#' If multiple matches are found, it returns a data frame containing both tickers and their sectors.
#'
#' @param company A character string specifying the ticker of a company listed on the BRVM stock exchange.
#'
#' @return A character string representing the sector of the company if a single match is found,
#' or a data frame if multiple matches are found.
#'
#' @importFrom methods setGeneric setMethod
#'
#' @examples
#' company_sector("BICC")
#' company_sector("SNTS")
#'
#' @rdname company_sector
#' @export
setGeneric("company_sector", function(company) standardGeneric("company_sector" ))

#' @rdname company_sector
#' @export
setMethod("company_sector", signature(company = "character"), function(company) {

    company<-toupper(company)

    ticker_sector = BRVM_bySector("ALL")
    #ticker_sector = ticker_sector[c("Ticker","Sector")]
    ticker_sector = ticker_sector[ticker_sector$Ticker %in% company,c("Ticker","Sector")]

    if(nrow(ticker_sector) == 0){
        message(paste0("Company ",company," doesn't exist.\n"))
    }

    if(nrow(ticker_sector) == 1){
        return(c(ticker_sector[[1,2]]))
    } else {
        return(ticker_sector)
    }
#
#     unique_sector = unique(ticker_sector$Sector)
#
#     .sectors = list()
#
#     for(sector in unique_sector){
#         .sectors[sector] = ticker_sector[ticker_sector$Sector == sector,1]
#     }

    # .sectors =list(Agriculture = c("PALC","SCRC","SICC","SOGC","SPHC"),
    #                Distribution = c("ABJC","BNBC","CFAC","PRSC","SHEC","TTLC","TTLS"),
    #                Industry = c("CABC","FTSC","NEIC","NTLC","SEMC","SIVC","SLBC","SMBC","STBC","TTRC","UNLC","UNXC"),
    #                Finance = c("BOAB","BOABF","BOAC","BOAM","BOAN","BOAS","BICC","CBIBF","ECOC","ETIT","NSBC","ORGT","SAFC","SGBC","SIBC"),
    #                Transport = c("SDSC","SVOC"),
    #                "Public service" = c("CIEC","ONTBF","SDCC","SNTS", "ORAC"),
    #                Other = c("STAC"))
    #
#
#     for (elem in 1:length(.sectors)){
#         if (company %in% .sectors[[elem]]) {
#             return(names(.sectors)[[elem]])
#         }
#     }
})

