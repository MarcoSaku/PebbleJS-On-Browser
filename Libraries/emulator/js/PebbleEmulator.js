/******************************************************************************
 *
 * Pebble JS on Browser
 * @author Marco Saviano - Alessandro Longobardi
 *
 * @madein Univesrità degli Studi di Napoli "Parthenope"
 *
 * @email: marco.saviano.89@gmail.com
 * @email: alessandrolongobardi89@gmail.com
 *
 ******************************************************************************/
/******************************************************************************
 * 
 * Pebble Emulator
 * @author Domenico Maria Maresca
 * 
 * @madein Univesrità degli Studi di Napoli "Parthenope"
 * 
 * @email: domenico.maresca@gmail.com
 * @email: domenicomaria.maresca@studenti.uniparthenope.it
 * 
 ******************************************************************************/



/**
 * Pebble Emulator
 * 
 * Emula l'app Pebble per Smartphone
 * 
 * @param {object} settings Configurazione per l'emulatore è possibile impostare 
 * il tempo di risposta e la possibilità di mostrare i log
 * 
 * @returns {PebbleEmulator}
 */
function PebbleEmulator(settings){
    
    var options = settings || {};

    var defaultResponseTime = 50;
    this.eventHandlers = [];

    this.gateway = null;
    this.showLogs = options.showLogs || false;
    this.responseTime = options.responseTime || defaultResponseTime;
    
    /**
     * Generatore di GUID (Globally Unique Identifier, identificatore unico globale)
     * Un codice esadecimale pseudo-casuale nel formato: 00000000-0000-0000-0000-000000000000
     * 
     * Necessario per generare un id delle transazioni da/verso il Pebble
     *     
     * @returns {String}
     */
    this.guid = function(){
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                       .toString(16)
                       .substring(1);
        }
        
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
               s4() + '-' + s4() + s4() + s4();
    };
    
}

/**
 * addEventListener
 * 
 * Aggiunge un listner al Pebble, funzioni che si mettono in ascolto su determinati eventi 
 * Questa è una funzione dell'interfaccia di Pebble
 * 
 * Gli eventi esposti dal Pebble sono:
 * ready -> L'app è pronta
 * appmessage -> Riceve un nuovo messaggio dal Pebble 
 * showConfiguration -> Apre la pagina di configurazione dell'app
 * webviewclosed -> La pagina di configurazione dell'app è stata chiusa
 * 
 * Gli eventi implementati per l'emulatore invece sono:
 * 
 * 
 * @emulated Emula l'interfaccia di Pebble
 * 
 * @param {string} event Tipo di evento su cui mettersi in ascolto
 * @param {function} callback La funzione di callback da chiamare a quell'evento
 */
PebbleEmulator.prototype.addEventListener = function(event, callback){
	
    /* Eventi gestiti:  implementazione da migliorare dividendo gli eventi del pebble da quelli dell'emulatore
    switch(event){
	
        // Pebble is ready
        case 'ready':
        break;

        // Receiving messages from Pebble
        // Your JavaScript code can process messages coming from Pebble through the appmessage event. The callback to this event takes one parameter: a JavaScript object with a key payload representing the message received.
        case 'appmessage':
        break;

        // Echo of messages to Pebble
        case 'sendappmessage':
        break;

        // Start the Web UI of application setting
        case 'showConfiguration':
        break;

        // Exit from Web UI of application setting
        case 'webviewclosed ':
        break;

    }
    */
    
    // Aggiunge l'evento da gestire
    this.pushEvent(event, callback);

};


/**
 * sendAppMessage
 * 
 * Invia un "messaggio" al Pebble
 * 
 * @emulated Emula l'interfaccia di Pebble
 * 
 * @todo Il Pebble ammette messaggi fino a 124 bytes, bisognerebbe verificarne la dimensione
 * 
 * @param {object} data
 * @param {function} ackHandler Funzione di callback in caso di Successo
 * @param {function} nackHandler Funzione di callback in caso di Errore
 * 
 * @returns {PebbleEmulator.prototype.sendAppMessage@call;guid} Id della transazione
 */
PebbleEmulator.prototype.sendAppMessage = function(data, ackHandler, nackHandler){
    console.log("AppMessage: "+JSON.stringify(data));
    this.log("[sendAppMessage]", data, ackHandler, nackHandler);
    
    var _self = this;
    
    // genero l'id
    var transactionId = this.guid();

    // genero oggetto che descrive il messaggio da inviare
    var event = {
        transactionId: transactionId, // gli associo l'id della transazione
        date: (new Date()).getTime() // ed un timestamp
    };

    // Temporizzo l'invio dei dati al pebble per rimulare il suo delay
    setTimeout(function(){
        ackHandler.call(Pebble, event);
        _self.triggerEvent('sendappmessage', data, event);
    }, this.responseTime);
    
    // L'error handler non viene mai invocato
    function errorHandler(error_reason){
        event.message = error_reason;
        nackHandler.call(Pebble, event);
    }

    // ritorno l'id della transazione
    return transactionId;
};

/**
 * openURL
 * 
 * Apre la finestra di configurazione dell'app e ne gestisce
 * gli eventi di salvataggio e chiusura
 * 
 * @description
 * La gestione della pagina di configurazione è stata una questione complessa:
 * siccome non è possibile emulare il comportamento che si ha sull'app Pebble
 * sono necessari alcuni accorgimenti (hack)
 *  1) la pagina di configurazione deve esporre l'header Access-Control-Allow-Origin: * 
 *  2) le richieste di  "pebblejs://close" devono essere trasformate in "?close" *  
 *     Per farlo controllare attraverso javasrcipt l'esistenza della variabile window.cloudpebble
 * 
 * Dettagli implementativi: per agirare le security restriction dei browser
 * l'iframe (webui) carica due pagine la prima è una pagina con
 * lo stesso dominio di cloupebble che funge da preloader e che successivamente 
 * sarà rimpiazzata da quella di configurazione che viene caricata in ajax
 * (ecco il perchè dell'Access-Control-Allow-Origin)
 * 
 * L'azione di chiusura della pagina viene individuata con levento load sull'iframe
 * 
 * @emulated Emula l'interfaccia di Pebble
 * @uses jQuery
 * 
 * @param {string} url
 */
PebbleEmulator.prototype.openURL = function(url){
    
    // Elaboro l'url da aprire recuperando soltanto la parte relativa ai settings dell'app
    var urlData = url.split('#')[1] || '';
    
    // creo la "webui" un contenitore in cui visualizzare la pagina di configuraizone
    var webui = $(document.createElement('iframe'));    
    webui.addClass('web-ui');
    webui.attr('id', 'AppConfiguration');
    
    // First load: carico la pagina di preload del 
    webui.one('load', function(){
        
        // Carico la vera pagina di configurazione
        $.ajax({
            url: url,
            cache: false,
            success: function(html){
                var frame = webui.get(0);
                var frameWindow = frame.contentWindow || this.contentDocument.parentWindow;
                var doc = frameWindow.document;
                
                frameWindow.cloudpebble = true;
                doc.write(html);
                doc.close();
                
                frameWindow.location.hash = urlData;
            }
        });
        
        // Second load: la pagina di configurazione è stata caricata
        // Aggangio gli eventi per il detect dell'url
        webui.load(function(){
            var frame = webui.get(0);
            var frameWindow = frame.contentWindow || this.contentDocument.parentWindow;
            var currentUri = frameWindow.location.toString();

            frameWindow.cloudpebble = true;
            
            // La pagina di configurazione è stata chiusa
            if(currentUri.indexOf('?close')>-1){
                var e = {response:''};
                var urlPart = currentUri.substring(currentUri.indexOf('?close')+7);
                
                // La pagina è stata chiusa inviando dei nuovi settings per l'app
                if(urlPart && urlPart.length>0){
                    
                    // recupero i dati
                    e.response = urlPart;
                    
                    // Scateno l'evento su Pebble
                    Pebble.triggerEvent('webviewclosed', e);
                }else{
                    // Nessun nuovo setting
                    e.response = 'CANCELLED';
                }
                
                // L'app Pebble chiude la webview
                Pebble.triggerEvent('webviewclosed', e);
                
                // Ripristino la pagina del Pebble Emulator
                $('body').removeClass('show-configuration');
                webui.remove();
            }
        });
        
    });
    
    // Scateno il primo caricamento: imposto come src dell'iframe la pagina di configurazione
    webui.attr('src', BASE_URL+'configurable?'+'#'+urlData);
    
    // predispongo la finestra del Pebble Emulator aggiungendo una classe che
    // nasconde tutti gli altri elementi e aggangio la web ui
    $('body').addClass('show-configuration')
             .append(webui);
};

/**
 * showSimpleNotificationOnPebble
 * 
 * Invia una notifica di tipo semplice al Pebble: solo titolo e testo
 * 
 * @emulated Emula l'interfaccia di Pebble
 * 
 * @todo da implementare
 * 
 * @param {type} title
 * @param {type} text
 */
PebbleEmulator.prototype.showSimpleNotificationOnPebble = function(title, text){
    // non implementata
    this.log("[showSimpleNotificationOnPebble]", title, text);
};


/**
 * pushEvent
 * 
 * Aggiunge alla collection un nuovo evento da monitorare, con relativa callback da scatenare
 * 
 * @note Questa è una funzione specifica del Pebble Emulator
 * 
 * @param {string} event Tipo di evento
 * @param {type} callback Funzione di callback
 */
PebbleEmulator.prototype.pushEvent = function(event, callback){
    this.eventHandlers.push({type: event, handler: callback});
};


/**
 * send
 * 
 * Simula un nuovo evento sul Pebble Watch, inviando un messaggio all'app Pebble
 * Wrappa i dati in ingresso nel formato che si aspetta PebbleJS {payload: [array]}
 * Scateno l'apposito vento sul PebbleEmulator
 * 
 * @note Questa è una funzione specifica del Pebble Emulator
 * 
 * @param {array} Dati da inviare
 */
PebbleEmulator.prototype.send = function(data){
    
    var e = {payload: data}; // preparo i dati
    
    // Scateno l'evento "appmessage" per segnalare l'arrivo (sull app)
    // di un nuovo messaggio dal Pebble Watch
    this.triggerEvent('appmessage', e);
};

/**
 * triggerEvent
 * 
 * Scatena l'evento richiesto passando eventualmente i dati alla relativa callback
 * 
 * @note Questa è una funzione specifica del Pebble Emulator
 * 
 * @param {string} Tipo di evento da scatenare
 * @param {object} Dati da inviare alla funzione di callback
 */
PebbleEmulator.prototype.triggerEvent = function(type, data){

    // Ciclo tutti gli eventi che si sono messi in ascolto
    for(var h in this.eventHandlers){
        
        // Se è del tipo giusto, lo scateno
        if(this.eventHandlers[h] && this.eventHandlers[h].type===type){
            var args = Array.prototype.slice.call(arguments, 1);
            this.log("[Event trigged]", type,args);
            this.eventHandlers[h].handler.apply(this, args);
            break; // Ne posso gestire solo uno. Esco
        }
        
    }
};

/**
 * log
 * 
 * Gestisco al meglio i log per il Pebble Emulatorm, se richiesto li visualizza
 * 
 * @note Questa è una funzione specifica del Pebble Emulator
 */
PebbleEmulator.prototype.log = function(){
    
    arguments[0] = 'PebbleEmulator '+arguments[0];
    
    if(this.showLogs)
        console.log.apply(console, arguments);
    
};

/**
 * getAppInfo
 * 
 * Recupera i l'appinfo
 * 
 * @note Questa è una funzione specifica del Pebble Emulator
 * 
 * @returns {object}
 */
PebbleEmulator.prototype.getAppInfo = function(){
    var settings = null;
    $.ajax({
        url: APP_INFO_URL,
        dataType: "json",
        async: false,
        cache: false,
        method: 'get'
    }).success(function(response){
        settings=response;
    });
    return settings;
};



/**
 * showSimpleNotificationOnPebble
 * 
 * Account Token univoco associato al Pebble dell'utente corrente
 * 
 * @emulated Emula l'interfaccia di Pebble
 * 
 * @todo da implementare
 * 
 * @param {type} title
 * @param {type} text
 */
PebbleEmulator.prototype.getAccountToken = function(){
    return '00000000000000000000000000000000';
};


// INIT
var Pebble = new PebbleEmulator({showLogs:true});
window.Pebble = Pebble; // rendo la variable Pebble globale

// Il Pebble.ready coincide con il windows.load
// perché in quel momento tutte le risorse sono state caricate
window.onload = function(){
    Pebble.triggerEvent('ready');
};