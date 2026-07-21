Questo è il mio tentativo di fare una app per aiutarmi a tener traccai di come spendo.

Problema: 
Il progetto funziona solo come un progetto Expo "managed". Devo sistemare il tutto per farlo runnare su Android Studio, altrimenti mi tocca sempre usare Expo Go (che però non include il mio modulo nativo per leggere notifiche bancarie quindi devo farlo per forza con app nativa).

FUNZIONAMENTO:

utils/notificationHandler.ts → handleNotification() rileva le notifiche bancarie

utils/amountExtractor.ts → extractAmountWithCurrency() estrae importo + valuta con regex
