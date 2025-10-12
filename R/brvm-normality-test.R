#' Normality test with univariate data
#'
#' @description Performs different types of normality test.
#'
#' @family Test
#' @family BRVM
#' @author Koffi Frederic SESSIE
#' @author Olabiyi Aurel Geoffroy ODJO
#'
#' @seealso `stationarity_test`
#'
#' @param x a numeric vector or time series..
#' @param type.test character such as "Anderson-Darling","Shapiro-Wilk","Jarque Bera","Cramer-von Mises","Shapiro-Francia","Lilliefors (Kolmogorov-Smirnov)","Pearson chi-square", "Agostino".
#'
#' @return a number that indicates the P-value of the normality test
#'
#' @importFrom methods setGeneric setMethod
#' @importFrom goftest ad.test cvm.test
#' @importFrom tseries jarque.bera.test
#' @importFrom nortest sf.test lillie.test pearson.test
#' @importFrom fBasics dagoTest
#'
#' @examples
#' \donttest{
#'library(goftest)
#'library(tseries)
#'library(nortest)
#'library(fBasics)
#'
#'# one and a half week stock index
#'# data including a weekend
#' y <- ts(c(5353.08,5409.24,5315.57,5270.53, 5211.66,NA,NA,5160.80,5172.37,5160.80,5172.37))
#'
#' normality_test(y ,"Shapiro-Wilk")
#'
#' # You can test multiple methods simultaneously
#' normality_test(y,type.test = c("anderson-darling","Shapiro-Wilk","agostino"))
#'
#' }
#'
#' @rdname normality_test
#' @export
setGeneric("normality_test", function(x, type.test = "ALL") standardGeneric("normality_test" ))

#' @rdname normality_test
#' @export
setMethod("normality_test", signature(x = "numeric",type.test = "character"), function(x, type.test = "ALL") {
    if (length(unique(x)) > 1) {

        # init
        used_method <- list()

        if (tolower(type.test[1]) == "all"){
            type.test = c(
                "anderson-darling","shapiro-wilk","jarque bera","cramer-von mises",
                "shapiro-francia","lilliefors (kolmogorov-smirnov)","pearson chi-square",
                "agostino"
            )
        }
        type.test = tolower(type.test)

        if (is.ts(x)) {
            x <- na.remove(x)
        } else {
            x <- na.omit(x)
        } # For super Friend Fredy

        if("anderson-darling" %in% type.test){
            if (length(x)>= 8) {
                pval = ad.test(x)$p.value
            } else { pval <- NA }
            used_method["anderson-darling"] = as.numeric(pval)
        }

        if ("shapiro-wilk" %in% type.test){
            if (length(x)>= 3) {
                pval <- shapiro.test(x)$p.value
            } else { pval <- NA }
            used_method["shapiro-wilk"] = as.numeric(pval)
        }

        if ("jarque bera" %in% type.test){
            if (length(x)>= 3) {
                pval <- jarque.bera.test(x)$p.value
            } else { pval <- NA }
            used_method["jarque bera"] = as.numeric(pval)
        }

        if ("cramer-von mises" %in% type.test){
            if (length(x)>= 1) {
                pval <- goftest::cvm.test(x)$p.value
            } else { pval <- NA }
            used_method["cramer-von mises"] = as.numeric(pval)
        }

        if ("shapiro-francia" %in% type.test){
            if (length(x)>= 5) {
                pval <- sf.test(x)$p.value
            } else { pval <- NA }
            used_method["shapiro-francia"] = as.numeric(pval)
        }

        if ("lilliefors (kolmogorov-smirnov)" %in% type.test){
            if (length(x)>= 5) {
                pval <- lillie.test(x)$p.value
            } else { pval <- NA }
            used_method["lilliefors (kolmogorov-smirnov)"] = as.numeric(pval)
        }

        if ("pearson chi-square" %in% type.test){
            if (length(x)>= 2) {
                pval <- pearson.test(x)$p.value
            } else { pval <- NA }
            used_method["pearson chi-square"] = as.numeric(pval)
        }

        if ("agostino" %in% type.test){
            if (length(x)>= 20) {
                pval <- (dagoTest(x)@test$p.value)[[1]]
            } else { pval <- NA }
            used_method["agostino"] = as.numeric(pval)
        }

    } else {used_method = NA}

    # if (pval != NA){
    #   pval <- round(as.numeric(pval), digits = 3)
    # }

    return(used_method)
})


#' @rdname normality_test
#' @export
setMethod("normality_test", signature(x = "ts",type.test = "character"), function(x, type.test = "ALL") {
    if (length(unique(x)) > 1) {

        # init
        used_method <- list()

        if (tolower(type.test[1]) == "all"){
            type.test = c(
                "anderson-darling","shapiro-wilk","jarque bera","cramer-von mises",
                "shapiro-francia","lilliefors (kolmogorov-smirnov)","pearson chi-square",
                "agostino"
            )
        }
        type.test = tolower(type.test)

        if (is.ts(x)) {
            x <- na.remove(x)
        } else {
            x <- na.omit(x)
        } # For super Friend Fredy

        if("anderson-darling" %in% type.test){
            if (length(x)>= 8) {
                pval = ad.test(x)$p.value
            } else { pval <- NA }
            used_method["anderson-darling"] = as.numeric(pval)
        }

        if ("shapiro-wilk" %in% type.test){
            if (length(x)>= 3) {
                pval <- shapiro.test(x)$p.value
            } else { pval <- NA }
            used_method["shapiro-wilk"] = as.numeric(pval)
        }

        if ("jarque bera" %in% type.test){
            if (length(x)>= 3) {
                pval <- jarque.bera.test(x)$p.value
            } else { pval <- NA }
            used_method["jarque bera"] = as.numeric(pval)
        }

        if ("cramer-von mises" %in% type.test){
            if (length(x)>= 1) {
                pval <- goftest::cvm.test(x)$p.value
            } else { pval <- NA }
            used_method["cramer-von mises"] = as.numeric(pval)
        }

        if ("shapiro-francia" %in% type.test){
            if (length(x)>= 5) {
                pval <- sf.test(x)$p.value
            } else { pval <- NA }
            used_method["shapiro-francia"] = as.numeric(pval)
        }

        if ("lilliefors (kolmogorov-smirnov)" %in% type.test){
            if (length(x)>= 5) {
                pval <- lillie.test(x)$p.value
            } else { pval <- NA }
            used_method["lilliefors (kolmogorov-smirnov)"] = as.numeric(pval)
        }

        if ("pearson chi-square" %in% type.test){
            if (length(x)>= 2) {
                pval <- pearson.test(x)$p.value
            } else { pval <- NA }
            used_method["pearson chi-square"] = as.numeric(pval)
        }

        if ("agostino" %in% type.test){
            if (length(x)>= 20) {
                pval <- (dagoTest(x)@test$p.value)[[1]]
            } else { pval <- NA }
            used_method["agostino"] = as.numeric(pval)
        }

    } else {used_method = NA}

    # if (pval != NA){
    #   pval <- round(as.numeric(pval), digits = 3)
    # }

    return(used_method)
})

