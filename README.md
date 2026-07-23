Questo è il mio tentativo di fare una app per aiutarmi a tener traccai di come spendo.

TODO:

L'errore del cambiare valuta enza transazioni ancora non modifica il budget. Ho provato un fix veloce, vediamo se ha funzionato.

FUNZIONAMENTO:

(per il momento nonsembra funzionare, ho dato special app access -> notification read,reply and control alla app ma non ha letto il bank transfer, magari funziona almeno con le notifiche della carta?)

utils/notificationHandler.ts → handleNotification() rileva le notifiche bancarie

utils/amountExtractor.ts → extractAmountWithCurrency() estrae importo + valuta con regex
