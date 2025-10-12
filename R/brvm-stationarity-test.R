#' Stationarity test with univariate data
#'
#' @description Performs different types of stationarity test.
#'
#' @family Test
#' @family BRVM
#' @author Koffi Frederic SESSIE
#' @author Olabiyi Aurel Geoffroy ODJO
#'
#' @seealso `normality_test`
#'
#' @param x a numeric vector or time series.
#' @param type.test character such as "Box-Pierce and Ljung-Box","Kwiatkowski-Phillips-Schmidt-Shin (KPSS)", "Augmented Dickey-Fuller Test (ADF)", "Phillips-Perron Unit Root Test"
#'
#' @return a number that indicates the P-value of the stationarity test
#'
#' @importFrom methods setGeneric setMethod
#' @importFrom tseries kpss.test adf.test pp.test
#'
#' @examples
#'
#' library(tseries)
#'
#' # one and a half week stock index
#' # data including a weekend
#' y <-ts(c(5353.08,5409.24,5315.57,5270.53, 5211.66,NA,NA,5160.80,5172.37,5160.80,5172.37))
#'
#' stationarity_test(y, "Box-Pierce and Ljung-Box")
#' stationarity_test(y, "ALL")
#'
#' @rdname stationarity_test
#' @export
setGeneric("stationarity_test", function(x, type.test) standardGeneric("stationarity_test" ))

#' @rdname stationarity_test
#' @export
setMethod("stationarity_test", signature(x = "numeric"), function(x, type.test) {

  if (length(unique(x)) > 1) {

      # init
      used_method <- list()
      if (tolower(type.test[1]) == "all"){
          type.test = c(
              "box-pierce and ljung-box","kwiatkowski-phillips-schmidt-shin (kpss)",
              "augmented dickey-fuller test (adf)","phillips-perron unit root test"
          )
      }
      type.test = tolower(type.test)

      if (is.ts(x)) {
        x <- na.remove(x)
      } else {
        x <- na.omit(x)
      }

      if("box-pierce and ljung-box" %in% type.test){
        if (length(x)>= 3) {
          pval <- Box.test(x)$p.value
        } else { pval <- NA }
          used_method["box-pierce and ljung-box"] = as.numeric(pval)
      }

      if ("kwiatkowski-phillips-schmidt-shin (kpss)" %in% type.test){
        if (length(x)>= 3) {
          pval <- kpss.test(x)$p.value } else { pval <- NA }
          used_method["kwiatkowski-phillips-schmidt-shin (kpss)"] = as.numeric(pval)

      }

      if ("augmented dickey-fuller test (adf)" %in% type.test){
        if (length(x)>= 7) {
          pval <- adf.test(x)$p.value
        } else { pval <- NA }
          used_method["augmented dickey-fuller test (adf)"] = as.numeric(pval)
      }

      if ("phillips-perron unit root test" %in% type.test){
        if (length(x)>= 4) {
          pval <- pp.test(x)$p.value
        } else { pval <- NA }
         used_method["phillips-perron unit root test"] = as.numeric(pval)
      }

  } else {
      used_method = NA
  }

  return(used_method)
})



#' @rdname stationarity_test
#' @export
setMethod("stationarity_test", signature(x = "ts"), function(x, type.test) {

    if (length(unique(x)) > 1) {

        # init
        used_method <- list()
        if (tolower(type.test[1]) == "all"){
            type.test = c(
                "box-pierce and ljung-box","kwiatkowski-phillips-schmidt-shin (kpss)",
                "augmented dickey-fuller test (adf)","phillips-perron unit root test"
            )
        }
        type.test = tolower(type.test)

        if (is.ts(x)) {
            x <- na.remove(x)
        } else {
            x <- na.omit(x)
        }

        if("box-pierce and ljung-box" %in% type.test){
            if (length(x)>= 3) {
                pval <- Box.test(x)$p.value
            } else { pval <- NA }
            used_method["box-pierce and ljung-box"] = as.numeric(pval)
        }

        if ("kwiatkowski-phillips-schmidt-shin (kpss)" %in% type.test){
            if (length(x)>= 3) {
                pval <- kpss.test(x)$p.value } else { pval <- NA }
            used_method["kwiatkowski-phillips-schmidt-shin (kpss)"] = as.numeric(pval)

        }

        if ("augmented dickey-fuller test (adf)" %in% type.test){
            if (length(x)>= 7) {
                pval <- adf.test(x)$p.value
            } else { pval <- NA }
            used_method["augmented dickey-fuller test (adf)"] = as.numeric(pval)
        }

        if ("phillips-perron unit root test" %in% type.test){
            if (length(x)>= 4) {
                pval <- pp.test(x)$p.value
            } else { pval <- NA }
            used_method["phillips-perron unit root test"] = as.numeric(pval)
        }

    } else {
        used_method = NA
    }

    return(used_method)
})



