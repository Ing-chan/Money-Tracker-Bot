Questo è il mio tentativo di fare una app per aiutarmi a tener traccia di come spendo.

utils/notificationHandler.ts → handleNotification() rileva le notifiche bancarie

utils/amountExtractor.ts → extractAmountWithCurrency() estrae importo + valuta con regex

TODO:

Creare una versione per IOS? Ew

Inserire supporto multilingua: al momento funziona solo in inglese. Quali lingue potrei aggiungere?

Se inserisco il supporto multilingua, tanto vale inserire le app bancarie più famose per quella lingua.

Poi dentro la sezione banking apps to track della tab settings lascio invariato il primo pezzo dove fa vedere la lista delle app che sto attivamente tracciando, con l'opzione di rimuoeverle prendedo la x. invece la seconda sezione  quick add popular apps e la terza sezione custom app package name voglio modificarle. mi piace il fatto he ci sia il pulsante add app. vorrei quindi fare in modo che ci sia un pulsante  + add app to track e una volta schiaccaito si apre un popup con 2 bottoni: add custom app (che poi mostrerà il già esistente display name e package name da inserire) e quick add popular apps (che poi mostrerà la vecchia lista di apps popolari, da dover modificare aggiungendo a quelle esistenti tutte le app bancarie più famose nelle varie lingue).

Creare una versione da publicare sul Play store?

Potrei creare una versione dell'app che prende il tasso di cambio da internet, ma non sarebbe mai preciso: ogni circuito bancario ha il suo (es: Visa vs Mastercard) e su google si mostra un tasso medio di mercato solitamente più favorevole o senza i costi della banca inclusi. Ho provato a farlo ed è 99,9% preciso quindi direi va bene.

Lato Positivo: Pagando in carta all'estero in automatico ho la transazione nella valuta della mia banca (sarà la mia banca a fare il cambio e pagare nella valuta locale: QUANDO SEI ALL'ESTERO MAI SELEZIONARE I PAGAMENTI CON VALUTA DIVERSA DA QUELLA LOCALE PERCHÉ SICURO GLI INFAMI LOCALS APPLICANO UN SOVRAPPREZZO SUL CAMBIO E NON SARÀ MAI VANTAGGIOSO QUANTO QUEWLLO DELLA MIA BANCA!)

Il problema si avrebbe su eventuali pagamenti in contanti, ma di base il contante in valuta estera lo cambio nella mia banca e viene prelevato dal mio conto, quindi riceverò una notifica anche per quello. 
(altrimenti se lo prelievo all'estero dovrò comunque usare la mia carta agli atm -> avrò comunque la notifica sul cell e sarà segnato nella app con la mia valuta d'origine)
