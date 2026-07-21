Questo è il mio tentativo di fare una app per aiutarmi a tener traccai di come spendo.

TODO:

Cancellare artifacts/budget-tracker/server/serve.js se non mi serve la preview di Expo.

FUNZIONAMENTO:

utils/notificationHandler.ts → handleNotification() rileva le notifiche bancarie

utils/amountExtractor.ts → extractAmountWithCurrency() estrae importo + valuta con regex
