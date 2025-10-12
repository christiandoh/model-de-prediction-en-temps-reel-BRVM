#' BRVM Capitalization Ranking
#'
#' @description
#' Retrieves market capitalization data of companies listed on the
#' Bourse Régionale des Valeurs Mobilières (BRVM) and ranks them
#' in descending order. Users can choose to extract either the top
#' or bottom *n* companies by their global capitalization.
#'
#' @param select A character string indicating whether to return the
#'   "Top" or "Bottom" ranked companies. Default is "Top".
#' @param N An integer specifying the number of companies to return.
#'   Default is 10.
#'
#'
#' @family Data Retrieval
#' @family BRVM
#'
#' @author Koffi Frederic SESSIE
#' @author Olabiyi Aurel Geoffroy ODJO
#'
#' @seealso \url{https://www.brvm.org/en/capitalisations/0}
#'
#' @return
#' A tibble containing company names, market capitalization, and related
#' information from the BRVM website.
#'
#'
#' @importFrom methods setGeneric setMethod
#' @importFrom rvest html_elements html_table read_html
#' @importFrom tibble as_tibble
#'
#' @examples
#' \donttest{
#' # Top 10 companies by capitalization
#' BRVM_rank("Top", 10)
#'
#' # Bottom 5 companies by capitalization
#' BRVM_rank("Bottom", 5)
#' }
#'
#' @rdname BRVM_rank
#' @export
setGeneric("BRVM_rank", function(select = "Top",N = 10) standardGeneric("BRVM_rank"))




#' @rdname BRVM_rank
#' @export
setMethod("BRVM_rank", signature(select = "character",N = "numeric"), function(select = "Top",N = 10) {
    tryCatch({
        brvm_cap <- rvest::read_html("https://www.brvm.org/en/capitalisations/0/status/200")
        Sys.sleep(1)
        brvm_cap <- brvm_cap %>%
          rvest::html_elements('table') %>%
          rvest::html_table()
        brvm_cap <- brvm_cap[[4]]
        brvm_cap <- tibble::as.tibble(brvm_cap) %>% dplyr::arrange(desc(`Global capitalization`))

        if(toupper(select[1]) == "TOP"){
            brvm_cap = head(brvm_cap,N)
        }

        if(toupper(select[1]) == "BOTTOM"){
            brvm_cap = tail(brvm_cap,N)
        }
        return(brvm_cap)
      },
  error = function(e) {
    message("Make sure you have an active internet connection")
  },
  warning = function(w) {
    message("Make sure you have an active internet connection")
  })
})

