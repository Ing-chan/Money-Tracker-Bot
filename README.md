Questo è il mio tentativo di fare una app per aiutarmi a tener traccia di come spendo.

utils/notificationHandler.ts → handleNotification() rileva le notifiche bancarie

utils/amountExtractor.ts → extractAmountWithCurrency() estrae importo + valuta con regex

TODO:

Creare una versione per IOS? Ew

Potrei far scomparire il "On Android ..." una volta che è stato dato il permesso alla app.

Inserire supporto multilingua: al momento funziona solo in inglese. Quali lingue potrei aggiungere?

Se inserisco il supporto multilingua, tanto vale inserire le app bancarie più famose per quella lingua.

Creare una versione da publicare sul Play store?

Potrei creare una versione dell'app che prende il tasso di cambio da internet, ma non sarebbe mai preciso: ogni circuito bancario ha il suo (es: Visa vs Mastercard) e su google si mostra un tasso medio di mercato solitamente più favorevole o senza i costi della banca inclusi.

Lato Positivo: Pagando in carta all'estero in automatico ho la transazione nella valuta della mia banca (sarà la mia banca a fare il cambio e pagare nella valuta locale: QUANDO SEI ALL'ESTERO MAI SELEZIONARE I PAGAMENTI CON VALUTA DIVERSA DA QUELLA LOCALE PERCHÉ SICURO GLI INFAMI LOCALS APPLICANO UN SOVRAPPREZZO SUL CAMBIO E NON SARÀ MAI VANTAGGIOSO QUANTO QUEWLLO DELLA MIA BANCA!)

Il problema si avrebbe su eventuali pagamenti in contanti, ma di base il contante in valuta estera lo cambio nella mia banca e viene prelevato dal mio conto, quindi riceverò una notifica anche per quello. 
(altrimenti se lo prelievo all'estero dovrò comunque usare la mia carta agli atm -> avrò comunque la notifica sul cell e sarà segnato nella app con la mia valuta d'origine)
