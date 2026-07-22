Questo è il mio tentativo di fare una app per aiutarmi a tener traccai di come spendo.

Sono riuscito a fare una build release e pushare l'apk sul mio telefono ma ora non funziona più ilbuild e non trovo più l'apk, mi sa che il push o la organizzazione della cartella git ha eliminato un pò di roba...

Inoltre l'errore del cambiare valuta enza transazioni ancora non modifica il budget. Ho provato un fix veloce, ma devo verificare funzioni.

Ho poi notato che se inserisco spesa e poi income dello stesso prezzo (es: 3 uscite e 3 entrate) viene erroneamente fuori che ho speso 0. 
Da fixare: amount left può aumentare di quei 3 mentre invece spent non può diminuire!!

FUNZIONAMENTO: (da verificare)

utils/notificationHandler.ts → handleNotification() rileva le notifiche bancarie

utils/amountExtractor.ts → extractAmountWithCurrency() estrae importo + valuta con regex
