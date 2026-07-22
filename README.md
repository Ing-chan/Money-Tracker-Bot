Questo è il mio tentativo di fare una app per aiutarmi a tener traccai di come spendo.

CHECK per vedere se ha funzionato il fix:

L'errore del cambiare valuta enza transazioni ancora non modifica il budget. Ho provato un fix veloce, vediamo se ha funzionato.
Ho poi notato che se inserisco spesa e poi income dello stesso prezzo (es: 3 uscite e 3 entrate) viene erroneamente fuori che ho speso 0. Amount left può aumentare di quei 3 mentre invece spent non può diminuire!!


TODO:

Nella History tab rimane il simbolo del dollaro e non viene cambiato assieme alle currencies, deve cambiare!! 

laa scheramta Add Expense per l'aggiunta manuale e quella di exchange rate vanno modificate in modo che quando compare la tastiera a chermo non va sopra i riquadri, i riquadri devono scivolare verso l'alto.
Exhage rate basta si sposti di 2/3 cm mentre inveceAdd expense deve proprio salire di un pò. 
Vorrei fare come su whatsapp dove la barra di inserimento del messaggi e tasto per audio/invio salgono e fluttuano fino ad arrivare a pelo con la tastiera e poi tornano giù quando scompare la tastiera.


FUNZIONAMENTO:

(per il momento nonsembra funzionare, ho dato special app access -> notification read,reply and control alla app ma non ha letto il bank transfer, magari funziona almeno con le notifiche della carta?)

utils/notificationHandler.ts → handleNotification() rileva le notifiche bancarie

utils/amountExtractor.ts → extractAmountWithCurrency() estrae importo + valuta con regex
