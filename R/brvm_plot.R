#' BRVM Plot
#'
#' @description
#' Generates an interactive chart for one or several BRVM-listed tickers.
#' This function retrieves historical market data for the specified ticker(s)
#' and produces an interactive price and volume chart using `highcharter`.
#'
#' @family Data Retrieval
#' @family Plot
#' @family BRVM
#'
#' @author Koffi Frederic SESSIE
#' @author Olabiyi Aurel Geoffroy ODJO
#'
#' @param object Either a character vector specifying one or more ticker symbols,
#' or a `data.frame` containing price data.
#' If a character vector is provided, the data are automatically fetched from the BRVM API.
#' If a `data.frame` is supplied, it must include at least the following columns:
#' `"Date"`, `"Open"`, `"High"`, `"Low"`, `"Close"`, and `"Volume"`.
#' When additional `"Ticker"` columns are present, multiple series are plotted.
#'
#' @param from Start date of the period to retrieve (quoted).
#' Must be in `"YYYY-MM-DD"` or `"YYYY/MM/DD"` format. Defaults to 89 days before today.
#'
#' @param to End date of the period to retrieve (quoted).
#' Must be in `"YYYY-MM-DD"` or `"YYYY/MM/DD"` format. Defaults to yesterday.
#'
#' @param up.col Color for upward movements. Default is `"darkgreen"`.
#' @param down.col Color for downward movements. Default is `"red"`.
#' @param ... another arguments.
#'
#' @return
#' An interactive `highchart` object displaying price and volume dynamics.
#'
#' @importFrom methods setGeneric setMethod
#' @importFrom xts as.xts
#' @importFrom highcharter highchart hc_title hc_add_series hc_add_yAxis hc_add_series hc_yAxis_multiples hc_colors hc_exporting
#'
#' @examples
#' \donttest{
#' \dontrun{
#' library(highcharter)
#' library(lubridate)
#' library(rlang)
#' library(httr2)
#' library(dplyr)
#' library(stringr)
#' library(xts)
#'
#' # Plot a single ticker
#' BRVM_plot("BICC")
#'
#' # Customize the up and down colors
#' BRVM_plot("BICC", up.col = "blue", down.col = "pink")
#'
#' # Plot a group of tickers
#' BRVM_plot(object = c("BICC", "ETIT", "SNTS"))
#'
#' # Plot using a local data.frame with market data
#' data = BRVM_get("BOABF")
#' BRVM_plot(data)
#'
#' data <- data.frame(
#'   Date = Sys.Date() - 0:5,
#'   Open = 1:6, High = 2:7, Low = 1:6, Close = 2:7, Volume = 10:15
#' )
#' BRVM_plot(data)
#' }}
#' @rdname BRVM_plot
#' @export
setGeneric("BRVM_plot", function(object = "ALL INDEXES",from = Sys.Date() - 89,to = Sys.Date() - 1,up.col = "darkgreen",down.col = "red",...) standardGeneric("BRVM_plot"))



#' @rdname BRVM_plot
#' @export
setMethod("BRVM_plot",signature(object = "character"),
          function(object = "ALL INDEXES",
                     from = Sys.Date() - 89,
                     to = Sys.Date() - 1,
                     up.col = "darkgreen",
                     down.col = "red") {

    tryCatch(
        {
      #  message('It possible to plot each sector chart line. You can use as argument .sectors$Agriculture to plot. Example BRVM_plot(.sector$Agriculture)')
      date1<- from
      date2 = to
      # Evaluate input parameters ----
      .company <- unique(toupper(object))
      # companies <- c( "ABJC", "BICC", "BNBC", "BOAB", "BOABF", "BOAC", "BOAM", "BOAN", "BOAS", "CABC", "CBIBF", "CFAC", "CIEC", "ECOC", "ETIT", "FTSC", "NEIC", "NSBC", "NTLC", "ONTBF", "ORGT", "PALC", "PRSC", "SAFC", "SCRC", "SDCC", "SDSC", "SEMC", "SGBC", "SHEC", "SIBC", "SICC", "SIVC", "SLBC", "SMBC", "SNTS", "SOGC", "SPHC", "STAC", "STBC", "SVOC", "TTLC", "TTLS", "UNLC", "UNXC"
      #               #, "TTRC"
      # )
      # ifelse(.company == "ALL",
      #        .company<- companies,
      #        .company)


      Global.returns<- BRVM_get(ticker = .company, from = date1, to = date2)

      if (length(Global.returns)== 6){
        ticker.name <- .company
        Global.returns1 <- Global.returns
        Global.returns <-as.xts(Global.returns[,-c(1)],
                               order.by=Global.returns$Date)
        Global.returns1$direction<-NA
        for (i in 2:nrow(Global.returns1)) {
          i1<- i-1
          ifelse (Global.returns1[i,6] >= Global.returns1[i1,6],
                  Global.returns1[i, "direction"] <- "up",
                  Global.returns1[i, "direction"] <- "down")
        }

        brvm.plot<- highchart (type="stock") %>%
          hc_title(text = paste0(ticker.name," chart : from ", date1, " to ", date2),
                   style = list(fontWeight = "bold", fontSize = "25px"),
                   align = "center") %>%
          hc_add_series (name = "Prices",
                         Global.returns,
                         yAxis = 0,
                         showInLegend = FALSE,
                         upColor= up.col,
                         color = down.col) %>%
          hc_add_yAxis (nid = 1L,
                        relative = 1)%>%
          hc_add_series (name = "Volume",
                         data = Global.returns1[, c(1,6,7)],
                         yAxis = 1,
                         showInLegend= FALSE,
                         type="column",
                         hcaes(x = Date,
                               y = Volume,
                               group = direction ))%>%
          hc_add_yAxis (nid = 2L,
                        relative = 1) %>%
          hc_yAxis_multiples(
            list(title = list(
              style=list(color='#333333',
                         fontSize = "20px",
                         fontFamily= "Erica One"),
              text = "Price"), top = "-10%", height = "90%", opposite = FALSE),
            list(title = list(
              style=list(color='gray',
                         fontSize = "20px",
                         fontFamily= "Erica One"),
              text = "Volume"), top = "80%", height = "20%")
          )%>%
          hc_colors(colors = c(down.col, up.col))%>%
          hc_exporting(
            enabled = TRUE, # always enabled,
            filename = paste0(ticker.name," chart : from ", date1, " to ", date2))

      } else if (length(Global.returns) > 6) {
        .company = paste0(.company, collapse = ", ")
        brvm.plot<- highchart(type = "stock") %>%
          hc_add_series(data = Global.returns,
                        type = "line",
                        hcaes(x =Date, y= Close, group= Ticker))%>%
          hc_xAxis(title = list(text = ""))%>%
          hc_title(text = paste0("Tickers (", .company, ") line chart from ", date1, " to ", date2)) %>%
          hc_exporting(
            enabled = TRUE, # always enabled,
            filename = paste0("Tickers line chart from ", date1, " to ", date2)
          )
      }
      return(brvm.plot)

    },
  error = function(e) {
      message("Make sure you have an active internet connection")
  },
  warning = function(w) {
      message("Make sure you have an active internet connection")
  })
})


#' @param ticker.name character, ticker name.
#' @rdname BRVM_plot
#' @export
setMethod("BRVM_plot",signature(object = "data.frame"),function(object,ticker.name = NULL,
                                                                 up.col = "darkgreen",
                                                                 down.col = "red") {
    tryCatch(
        {

            Global.returns<- object

            #names(Global.returns)

            if (length(Global.returns)== 6){

                default_colnames = c("Date","Open","High","Low","Close","Volume")
                if(!(all(default_colnames %in% colnames(Global.returns)) == TRUE)){
                    rlang::abort(message = "the dataframe does not have the required columns.")
                }


                if(is.null(ticker.name)){

                    # ticker.name <- tryCatch({
                    #     env <- parent.frame()
                    #     noms_possibles <- ls(env)
                    #     match <- noms_possibles[sapply(noms_possibles, function(nom) identical(get(nom, envir = env), object))]
                    #     if (length(match) > 0) match[1] else "Data"
                    #
                    #     # #ticker.name = deparse(substitute(object))
                    #     # #rlang::abort(message = "'ticker.name' is empty. The asset name is missing. Please specify it to continue.")
                    #
                    #     }, error = function(e) "Data")
                    #

                    ticker.name <- tryCatch({
                        # On remonte dans l'environnement parent de l'appel
                        call_env <- parent.frame()
                        # On récupère l'appel complet à la fonction
                        mc <- match.call(definition = sys.function(sys.parent()), call = sys.call(sys.parent()))
                        # On extrait ce qui a été passé à 'object'
                        arg_expr <- mc$object

                        # On convertit en texte
                        arg_name <- deparse(arg_expr)

                        # Nettoyage : si c’est une fonction (ex: as.data.frame(bicc)) → on récupère juste l’intérieur
                        arg_name <- gsub(".*\\(([^()]+)\\).*", "\\1", arg_name)
                        trimws(arg_name)
                    }, error = function(e) "Data")
                }
                print(ticker.name)

                Global.returns1 <- Global.returns
                Global.returns <-as.xts(Global.returns[,-c(1)],
                                        order.by=Global.returns$Date)
                Global.returns1$direction<-NA
                for (i in 2:nrow(Global.returns1)) {
                    i1<- i-1
                    ifelse (Global.returns1[i,6] >= Global.returns1[i1,6],
                            Global.returns1[i, "direction"] <- "up",
                            Global.returns1[i, "direction"] <- "down")
                }

                brvm.plot<-     highchart (type="stock") %>%
                    hc_title(text = paste0(ticker.name," chart : from ", date1, " to ", date2),
                             style = list(fontWeight = "bold", fontSize = "25px"),
                             align = "center") %>%
                    hc_add_series (name = "Prices",
                                   Global.returns,
                                   yAxis = 0,
                                   showInLegend = FALSE,
                                   upColor= up.col,
                                   color = down.col) %>%
                    hc_add_yAxis (nid = 1L,
                                  relative = 1)%>%
                    hc_add_series (name = "Volume",
                                   data = Global.returns1[, c(1,6,7)],
                                   yAxis = 1,
                                   showInLegend= FALSE,
                                   type="column",
                                   hcaes(x = Date,
                                         y = Volume,
                                         group = direction ))%>%
                    hc_add_yAxis (nid = 2L,
                                  relative = 1) %>%
                    hc_yAxis_multiples(
                        list(title = list(
                            style=list(color='#333333',
                                       fontSize = "20px",
                                       fontFamily= "Erica One"),
                            text = "Price"), top = "-10%", height = "90%", opposite = FALSE),
                        list(title = list(
                            style=list(color='gray',
                                       fontSize = "20px",
                                       fontFamily= "Erica One"),
                            text = "Volume"), top = "80%", height = "20%")
                    )%>%
                    hc_colors(colors = c(down.col, up.col))%>%
                    hc_exporting(
                        enabled = TRUE, # always enabled,
                        filename = paste0(ticker.name," chart : from ", date1, " to ", date2))


            } else if (length(Global.returns) > 6) {

                default_colnames = c("Date","Open","High","Low","Close","Volume","Ticker")
                if(!(all(default_colnames %in% colnames(object)) == TRUE)){
                    rlang::abort(message = "the dataframe does not have the required columns.")
                }

                .company = unique(Global.returns$Ticker)
                .company = paste0(.company, collapse = ", ")
                brvm.plot<- highchart(type = "stock") %>%
                    hc_add_series(data = Global.returns,
                                  type = "line",
                                  hcaes(x =Date, y= Close, group= Ticker))%>%
                    hc_xAxis(title = list(text = ""))%>%
                    hc_title(text = paste0("Tickers (", .company, ") line chart from ", date1, " to ", date2)) %>%
                    hc_exporting(
                        enabled = TRUE, # always enabled,
                        filename = paste0("Tickers line chart from ", date1, " to ", date2)
                    )
            }
            return(brvm.plot)

        },
        error = function(e) {
            message("Make sure you have an active internet connection")
        },
        warning = function(w) {
            message("Make sure you have an active internet connection")
        })
})

