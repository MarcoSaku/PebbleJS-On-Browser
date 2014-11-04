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
 * Virtual Pebbler
 *
 * Emula un Pebble Wacht compatibile con la libreria PebbleJS
 *
 * @description Viene implementato come Plugin jQuery attraverso il prototipo $.fn
 * per semplificare l'accesso agli elementi
 *
 * @param {PebbleEmulator} pebble
 * @param {object} options
 * @returns {$.fn}
 */
$.fn.virtualPebble = function(pebble, options) {

    var _self = this;

    var defaults = {};
    var options = $.extend({}, defaults, options);

    this.Pebble = null; // il PebbleEmulator con cui comunicare
    this.SystemOS = null; // il sistema operativo del Virtual Pebble Watch
    this.Display = null; // il display




    // Riceve un nuovo comando dall'app Pebble, lo decodifica e lo esegue
    this.receive = function(data, event) {

        var decoded = _self.SystemOS.decode(data);
        //console.log("Decoded "+JSON.stringify(data));
        //console.log("[VirtualPebble.received]", decoded);
        _self.SystemOS.execute(decoded.name, decoded.params);
    };

    // Gestore dei pulsanti
    this.buttonHandler = function(button) {
        var btn = $(button),
            btnData = btn.data(),
            btnName = btnData.pebbleButton,
            btnType = btnData.pebbleButtonType,
            currentItem = this.Display.currentWindow();

        // Se l'elemento corrente sul Pebble è una finestra allora per 
        // il tasto back devo gestire il ritorno all'elemento UI precedente
        if (btn.is('.back') && this.Display.currentWindow().getId() !== 1) {
            this.backTo();
            return;
        }

        // Se l'elemento corrente sul Pebble è un Menu gestisco diversamente gli eventi
        if ((currentItem instanceof Menu)) {
            if (btnName == 'up') {
                currentItem.selectUp();
            } else if (btnName == 'down') {
                currentItem.selectDown();
            } else if (btnName == 'select') {
                var selected = currentItem.getSelected();
                this.SystemOS.execute('menuSelect', [selected.section, selected.item])
            }
            return;
        }

        var timeDiff = (new Date).getTime() - btn.data('pressTime');

        if (timeDiff >= 750) {
            btnType = 'longClick';
        }

        _self.SystemOS.execute(btnType, [btnName]);
    };

    // Torna alla schermata precedente
    this.backTo = function() {

        var lastElement = this.Display.currentWindow();

        if ((lastElement instanceof Window)) // Per il tipo Window invoco eseguo sull'OS un windowHide
            this.SystemOS.execute('windowHide', [lastElement.getId()]);
        else if ((lastElement instanceof Stage)) // altrimenti per gli Stage uno stageRemove
            this.SystemOS.execute('stageRemove', [lastElement.getId()]);

    };

    // Timer interno
    this.internalClock = function() {
        setInterval(function() {
            _self.trigger('tick.tack');
        }, 999); // 1s
    };

    // Inizializzazione del Pebble Watch
    this.init = function() {
        // Mi metto in ascolto per ricevere i messaggio dall'app
        this.Pebble.addEventListener('sendappmessage', this.receive);

        // Aggangio gli eventi sui pulsanti
        // Con due eventi attraverso un timestamp determino se è di tipo click o longclick

        // Pressione del pulsante, setto il timestamp
        this.on('mousedown', '[data-pebble-button]', function() {
            $(this).data('pressTime', (new Date).getTime());
        });

        // Rilascio del pulsante e invoco il gestore dei pulsanti
        this.on('mouseup', '[data-pebble-button]', function() {
            _self.buttonHandler(this);
        });

        this.internalClock();
        this.resources = ResourceManager;

    };

    if (this.length > 0) {

        this.Pebble = pebble;
        this.Display = new Display(this);

        this.SystemOS = new SystemOS(this);

        this.init();
        return this;
    }

};




///////////////////////////////////////////////////////////////////////////////////////////////////////////////////




/**
 * Gestore delle Risorse
 *
 * Oggetto per gestire le risorse dell'app in modo semplice e veloce
 */
var ResourceManager = new function() {

    // Recupero l'app info
    var appInfo = Pebble.getAppInfo();

    // Recupera un Media dal suo Id
    this.getMedia = function(media_id) {
        return appInfo.resources['media'][media_id - 1];
    };

    // Recupera il path di un Icona dal suo Id
    this.getIcon = function(media_id) {
        return 'resources/' + (this.getMedia(media_id).file);
    };
};


/**
 * Pebble Commands
 *
 * @param {$.fn.virtualPebble} virtual_pebble Instance of VirtualPebble
 * @returns {SystemOS}
 */
function SystemOS(virtual_pebble) {

    // Colego il sistema operativo all Pebble Watch passato

    this.Pebble = virtual_pebble.Pebble; // Pebble corrente
    this.display = virtual_pebble.Display; // Display
    this.vibration = virtual_pebble.Vibration; // Vibrazione
    this.commands = window.commands; // Database comandi


    // Mappa comandi
    this.commandsIdMap = {};

    // Fa il setup a della Command Map grazie al commands-definition.js
    for (var i in this.commands) {
        this.commandsIdMap[this.commands[i].name] = this.commands[i].id;

    }
    // console.log("MapID "+JSON.stringify(this.commandsIdMap));
}

/**
 * commands
 *
 * Database comandi
 *
 * E' un array dei comandi definiti dalla libreria PebbleJS
 * Ogni comando è identificato da un codice e definisce una serie di parametri
 * definiti a loro voltra attraverso un'ulteriore codice ed il tipo aspettato
 * L'associazione è definita attraverso la ParamMap
 *
 * @type Array
 */
SystemOS.prototype.commands = null;


/**
 * decode
 *
 * Decodifica un comando a partire dal payload (dati) ricevuti sul Pebble Watch
 * trasformandolo in un oggetto "comprensibile" e di facile elaborazione
 *
 * Nel payload il primo valore del payload identifica il comando,
 * quelli successivi i parametri
 *
 * @example {0: 15, 1: 0, 2: 7, 3: "Ciao mondo"}
 *
 * Questo è il payload relativo al comando "setMenuItem"
 *
 * @param {object} command_payload
 * @returns {undefined|SystemOS.prototype.decode.decodedCommand}
 */
////////////*** VEDI QUI *******************///////////
SystemOS.prototype.decode = function(command_payload) {

    var id = command_payload[0],
        command = this.commands[id];
    //alert("Comando "+id);
    if (!command) return;

    var decodedCommand = {
        name: command.name,
        params: {}
    };

    for (var index in command_payload) {
        if (index === 0) continue; // skip command id

        for (var i = 0; i < command.params.length; i++) {

            var param = command.paramMap[command.params[i].name];

            if (!(param.name in decodedCommand.params)) {
                decodedCommand.params[param.name] = null;
            }

            if (param.id != index) continue;

            decodedCommand.params[param.name] = command_payload[index];
            break;

        }
    }

    return decodedCommand;
};

/**
 * Esegue un comando
 *
 * @param {string} command_name Nome del comando
 * @param {object} params Parametri
 */
SystemOS.prototype.execute = function(command_name, params) {

    var _self = this;

    var commandId = this.commandsIdMap[command_name];

    switch (command_name) {

        // Window Hide
        case 'windowHide':
            var windowId = params[0] || params.id;
            this.Pebble.send([commandId, windowId]);
            this.display.windowHide(windowId);
            break;

            // Set Card
        case 'setCard':

            this.display.setCard(params);
            break;
            /*******************************************************/
            // Set Card
        case 'setWTemp':

            this.display.setWTemp(params);
            break;
            /*******************************************************/


            // Set Menu
        case 'setMenu':
            // first call - menu definition
            if (params.clear === -1 && params.sections > 0) {
                for (var i = 0; i < params.sections; i++) {
                    this.execute('getMenuSection', [i]);
                }
                return;
            }

            // second call - setup of menu items
            this.display.setMenu(params);
            break;


            // Get Menu Sections - for current menu
        case 'getMenuSection':
            this.Pebble.send([commandId, params[0]]);
            break;

            // Get Menu Sections - for current menu
        case 'setMenuSection':
            var currentMenu = this.display.currentWindow();
            if (currentMenu instanceof Menu) {
                currentMenu.addSection(params);
                for (var i = 0; i < Number(params.items); i++) {

                    this.execute('getMenuItem', [params.section, i]);
                }
            }
            break;

            // Get Menu Sections - for current menu
        case 'getMenuItem':
            this.Pebble.send([commandId, params[0], params[1]]);
            break;

            // Set the Menu Item
        case 'setMenuItem':
            var currentMenu = this.display.currentWindow();
            if (currentMenu instanceof Menu) {
                currentMenu.addItem(params);
            }
            break;

            // Menu Item Select
        case 'menuSelect':
            this.Pebble.send([commandId, params[0], params[1]]);
            break;


            // Set Stage
        case 'setStage':
            this.display.setStage(params);
            break;

            // Stage Element
        case 'stageElement':
            this.display.stageElement(params);
            break;

            // Stage Animate
        case 'stageAnimate':
            this.display.animate(params, function(window_index) {
                _self.execute('stageAnimateDone', [window_index]);
            });
            break;

            // Stage Animate Done
        case 'stageAnimateDone':
            this.Pebble.send([commandId, params[0]]);
            break;


            // Window Hide
        case 'stageRemove':
            var stageId = params[0];
            this.Pebble.send([commandId, stageId]);
            this.display.windowHide(stageId);
            break;


            // Button Click
        case 'click':
        case 'longClick':

            var btnId = params[0];

            switch (btnId.toLowerCase()) {
                case 'back':
                    btnId = 0;
                    break;
                case 'up':
                    btnId = 1;
                    break;
                case 'select':
                    btnId = 2;
                    break;
                case 'down':
                    btnId = 3;
                    break;
            }

            this.Pebble.send([commandId, btnId]);

            break;

        case 'vibe':
            //console.log(this);
            this.vibration.vibrate(params.type);

            break;


            // Command unknowned or not implemented
        default:
            console.log("Unknowned command: ", command_name, params);

    }

};

/**
 * Display
 *
 * Il display del Pebble, si occupa di gestire e renderizzare
 * gli elementi visualizzati sul Pebble Watch virtuale
 *
 * @param {$.fn.virtualPebble} virtual_pebble Instance of VirtualPebble
 *
 * @returns {Display}
 */
function Display(virtual_pebble) {

    var _self = this;

    this.statusBar = null;

    // The system status bar at the top of the display showing the time,
    // although apps can also be made fullscreen, removing the status bar.
    this.setupStatusBar = function() {
        var statusBar = $(document.createElement('div'));
        statusBar.attr('id', 'StatusBar');
        this.viewport.parent().prepend(statusBar);
        virtual_pebble.on('tick.tack', this.updateTime);
        _self.statusBar = statusBar;
    };

    this.updateTime = function() {
        var now = new Date();
        _self.statusBar.text(now.strftime('%H:%M'));
    };

    this.windowStack = [];
    this.fullscreenMode = false;
    this.viewport = virtual_pebble.find('#Viewport');
    this.setupStatusBar();
    this.updateTime();
}

/**
 * setFullscreen
 *
 * Imposta lo schermo nella modalità fullscreen
 *
 * @param {bool} flag
 */


/**
 * searchElement
 *
 * Cerca un elemento renderizzato sul Display in base all'id ed eventualmente il tipo
 *
 * @param {int} id
 * @param {string} type
 *
 * @returns {DisplayObject}
 */
Display.prototype.searchElement = function(id, type) {

    if (type)
        return this.viewport.find('.' + type + '[data-id="' + id + '"]');

    return this.viewport.find('[data-id="' + id + '"]');
};

/**
 * currentWindow
 *
 * Ritorna l'elemento (window) attualmente visualizzato sullo schermo
 *
 * @returns {DisplayObject}
 */
Display.prototype.currentWindow = function() {

    return this.windowStack[this.windowStack.length - 1];
};

/**
 * show
 *
 * Mostra sullo schermo un nuovo elemento
 *
 * @param {DisplayObject} new_element
 */
Display.prototype.show = function(new_element) {

    if (new_element instanceof DisplayObject) {

        this.windowStack = [new_element];
        this.viewport.children().remove();

        this.viewport.append(new_element.get());
        this.setFullscreen(new_element.fullscreen);
    }

};

/**
 * windowHide
 *
 * Nasconde una finestra corrente in base all'id
 *
 * @details Il check sull'id è solo un controllo aggiuntivo per verificare
 * l'integrità dello stack su PebbleJS, in realtà il Pebble Watch visualizza
 * sulo schermo un solo elemento alla volta
 *
 * @param {int} window_id
 */
Display.prototype.windowHide = function(window_id) {
    //console.log("[VirtualPebble.windowHide] id:",window_id);
    if (!window_id) return;

    var currentWindow = this.currentWindow();
    if ((currentWindow instanceof Window) && currentWindow.getId() == window_id) {
        for (var i in currentWindow.animations) {
            currentWindow.animations[i].stop();
        }
        currentWindow.remove();
    }

};

/**
 * setCard
 *
 * Crea una nuova card sul display
 *
 * @param {object} params
 * @returns {Card}
 */
Display.prototype.setCard = function(params) {

    var card = new Card(params);

    this.show(card);
    return card;

};

/*******************************************************/
/**
 * setCard
 *
 * Crea una nuova card sul display
 *
 * @param {object} params
 * @returns {Card}
 */
Display.prototype.setWTemp = function(params) {

    var wTemp = new WTemp(params);

    this.show(wTemp);
    return wTemp;

};
/*******************************************************/



/**
 * setMenu
 *
 * Crea un nuovo stage sul display
 *
 * @param {object} params
 * @returns {Menu}
 */
Display.prototype.setMenu = function(params) {

    var menu = new Menu(params);

    this.show(menu);
    return menu;

};

/**
 * getTextAlign
 *
 * Ritorna in base al codice di allineamento il relativo tipo
 *
 * Metodo statico di Display
 *
 * @param {int} align_code
 * @returns {String}
 */
Display.getTextAlign = function(align_code) {
    switch (align_code) {
        case 0:
            return 'left';
        case 1:
            return 'center';
        case 2:
            return 'right';
    }
    return '';
};

/**
 * stageElement
 *
 * Aggiunge un nuovo elemento sullo stage
 *
 * @param {object} params
 */
Display.prototype.stageElement = function(params) {

    switch (params.type) {

        // text element
        case 3:

            var textElement;
            var currentStage = this.currentWindow();

            var textElement = currentStage.find(params.id);

            if (!(currentStage instanceof Stage)) return;

            if (textElement) {
                textElement.update(params);
            } else {
                if (params.updateTimeUnits && params.updateTimeUnits > 0)
                    textElement = new TimeText(params);
                else
                    textElement = new TextElement(params);

                currentStage.render(textElement);
            }

            break;
    }


};

/**
 * animate
 *
 * Anima un elemento sul display
 *
 * @description Utilizza la funzione animate di jQuery
 *
 * @param {object} params
 */
Display.prototype.animate = function(params, complete_callback) {

    var currentWindow = this.currentWindow();
    var element = this.searchElement(params.id);
    var animationTime = params.duration || 400;

    var anim = element.animate({
        top: params.y,
        left: params.x,
        width: params.width,
        height: params.height
    }, animationTime, function() {
        var windowIndex = currentWindow.element.index();
        // Chiama la funzione di callback per notificare il termine all'app Pebble
        complete_callback(windowIndex)
    });

    currentWindow.animations.push(anim);

};

/**
 * setStage
 *
 * Crea un nuovo stage sul display
 *
 * @param {object} params
 * @returns {Stage}
 */
Display.prototype.setStage = function(params) {

    var stage = new Stage(params);

    this.show(stage);
    return stage;

};



/**
 * DisplayObject
 *
 * Prototipo base per tutti gli oggetti da visualizzare sul display
 * Definisce alcuni metodi utili alla loro gestione
 *
 * Ogni oggetto DisplayObject costruisce un elemento che viene incapsulato in jQuery
 *
 * @param {object} params
 * @returns {DisplayObject}
 */
function DisplayObject(params) {
    this.element = $(document.createElement('div'));
    this.element.addClass(this.getType())
        .attr('data-id', params.id);

    params = params || {};
    for (var k in params) this[k] = params[k];
}
DisplayObject.prototype.element = null;
DisplayObject.prototype.fullscreen = false;

/**
 * get
 *
 * Ritorna l'elemento jQuery
 *
 * @returns {$}
 */
DisplayObject.prototype.get = function() {
    return this.element;
};

/**
 * remove
 *
 * Rimuove l'elemento
 */
DisplayObject.prototype.remove = function() {
    this.element.remove();
};

/**
 * getId
 *
 * Ritorna l'id dell'elemento
 *
 * @description Utilizza l'attributo data attraverso l'elemento jQuery
 *
 * @returns {int}
 */
DisplayObject.prototype.getId = function() {
    return this.element.data('id');
};

/**
 * getType
 *
 * Ritorna il tipo dell'oggetto
 *
 * @returns {string}
 */
DisplayObject.prototype.getType = function() {
    var funcNameRegex = /function (.{1,})\(/;
    var results = (funcNameRegex).exec((this).constructor.toString());
    return (results && results.length > 1) ? results[1] : "";
};

/**
 * factory
 *
 * Crea un nuovo oggetto DisplayObject da un tipo specifico non implementato
 *
 * @param {string} type Tipo dell'oggetto da costruire
 * @param {object} params
 * @returns {DisplayObject}
 */
DisplayObject.factory = function(type, params) {
    var obj = new DisplayObject(params || {});
    obj.element.attr('class', type);
    return obj;
};



/**
 * Window
 *
 * Implementazione dell'oggetto PebbleJS UI.Stage, eredita da DisplayObject
 *
 * @param {object} params
 * @returns {Window}
 */
function Window(params) {
    DisplayObject.call(this, params); // call super constructor    
    this.fullscreen = params.fullscreen || false;
    this.animations = [];
    this.elements = [];
}
Window.prototype = Object.create(DisplayObject.prototype);
Window.prototype.constructor = Window;

/**
 * find
 *
 * Trova un elemento nella finestra in base al suo id
 *
 * @param {object} element_id
 * @returns {Array|Boolean}
 */
Window.prototype.find = function(element_id) {
    for (var e in this.elements) {
        if (this.elements[e].getId() == element_id)
            return this.elements[e];
    }
    return false;
}



/**
 * Card
 *
 * Implementazione dell'oggetto PebbleJS UI.Card, eredita da Window
 *
 * @param {object} params
 * @returns {Card}
 */
function Card(params) {
    //alert('card');
    Window.call(this, params); // call super constructor

    var card = this.element;

    if (params.style) {
        card.addClass(param.style);
    }

    if (params.title) {
        var row = $(document.createElement('div')).addClass('row'); // necessario per allineare correttamente il testo e l'icona
        var title = $(document.createElement('div')).addClass('title').text(params.title);
        row.append(title);

        if (params.icon) {
            try {
                var iconCell = $(document.createElement('div')).addClass('icon');
                var icon = $(new Image());
                icon.addClass('title-icon')
                    .attr('src', ResourceManager.getIcon(params.icon));
                iconCell.append(icon);
                row.prepend(iconCell);
            } catch (e) {
                console.log("Error loading icon", e);
            }
        }
        card.append(row);
    }

    if (params.subtitle) {
        var subtitle = $(document.createElement('span')).addClass('subtitle').text(params.subtitle);
        card.append(subtitle);
    }

    if (params.body) {
        var body = $(document.createElement('span')).addClass('body').text(params.body);
        card.append(body);
    }

};
Card.prototype = Object.create(Window.prototype);
Card.prototype.constructor = Card;

/*************************************************************/
/**
 * wTemp (Card customizzata contenente widget Temperatura)
 *
 * Implementazione dell'oggetto PebbleJS UI.wTemp, eredita da Window
 *
 * @param {object} params
 * @returns {Card}
 */

 function WTemp(params) {
    Window.call(this, params); // call super constructor    
    var wTemp = this.element;
    if (params.style) {
        wTemp.addClass(param.style);
    }
	//Creazione elementi html contenente il nuovo div e lo script per la creazione del widget 
    var row = $(document.createElement('div')).addClass('row').attr('style', "margin-left:25%;margin-top:2.5%"); // necessario per allineare correttamente il testo e l'icona
    var title = $(document.createElement('div')).attr('id', "gauge");
    var textScr = " $(document).ready(function () {var majorTicks = { size: '5%', interval: 10 },\
                minorTicks = { size: '5%', interval: 2.5, style: { 'stroke-width': '1%', stroke: '#aaaaaa'} },\
                labels = { interval: 10 };\
            $('#gauge').jqxLinearGauge({\
				width: '50%',\
				height: 100,\
                orientation: 'horizontal',\
                labels: labels,\
                ticksMajor: majorTicks,\
                ticksMinor: minorTicks,\
                max: 50,\
				min: -30,\
                value: -30,\
                pointer: { size: '6%' },\
                colorScheme: 'scheme04',\
               \
            });"
        /***************************
			set in tempC e tempF value of temperature
		***************************/
	//Chiamata GET ad API weather Yahoo per ottenere la temperatura della città passata come parametro a wTemp
    $.ajax({
        url: 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20weather.forecast%20where%20woeid\
		%20in%20(select%20woeid%20from%20geo.places(1)%20where%20text%3D%22' + params.city + '%22)&format=json&\
		env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys',
        type: 'GET',
        dataType: 'JSON',
        success: function(data) {
			
            tempF = data.query.results.channel.item.condition.temp;
            tempC = (tempF - 32) * 5 / 9;
			
            var textScript = textScr.concat("$('#gauge').jqxLinearGauge('value', " + tempC + ");    });");
            var script = $(document.createElement("script")).text(textScript);
            title.append(script);
            row.append(title);
            wTemp.append(row);       
			var cityName=data.query.results.channel.location.city;
            var text = $(document.createElement('div')).text("Temperature in " + cityName + " " + Math.ceil(tempC) + "°\
			C (" + tempF + "°F)").attr('id', "textID").attr('style', "text-align:center;margin-top:3px");
            wTemp.append(text);			
        },
        error: function() {
            alert("Error getting temperature from Yahoo API");
        }
    });
    /***************************/
};
WTemp.prototype = Object.create(Window.prototype);
WTemp.prototype.constructor = WTemp;


/*************************************************************/

/**
 * Stage
 *
 * Implementazione dell'oggetto PebbleJS UI.Stage, eredita da Window
 *
 * @param {object} params
 * @returns {Stage}
 */
function Stage(params) {

    Window.call(this, params); // call super constructor

    var stage = this.element;

    this.createActionBar(params);
}
Stage.prototype = Object.create(Window.prototype);
Stage.prototype.constructor = Stage;
Stage.prototype.actionBar = false;

/**
 * render
 *
 * Renderizza l'oggetto passato sullo Stage
 *
 * @param {Element} element
 */
Stage.prototype.render = function(element) {
    this.elements.push(element);
    this.element.append(element.get());
};

/**
 * createActionBar
 *
 * Crea un action bar sullo stage corrente
 *
 * @param {object} params
 */
Stage.prototype.createActionBar = function(params) {

    if (!params.action)
        return;

    var actionBar = $(document.createElement('div')).addClass('action-bar');
    var iconUp = $(document.createElement('div')).addClass('action up');
    var iconSelect = $(document.createElement('div')).addClass('action select');
    var iconDown = $(document.createElement('div')).addClass('action down');

    actionBar.append(iconUp);
    actionBar.append(iconSelect);
    actionBar.append(iconDown);

    // action up
    if (params.actionUp) {
        var icon = $(new Image());
        icon.addClass('action-icon')
            .attr('src', ResourceManager.getIcon(params.actionUp));
        iconUp.append(icon);
    }

    // action select
    if (params.actionSelect) {
        var icon = $(new Image());
        icon.addClass('action-icon')
            .attr('src', ResourceManager.getIcon(params.actionSelect));
        iconSelect.append(icon);
    }

    // action down
    if (params.actionDown) {
        var icon = $(new Image());
        icon.addClass('action-icon')
            .attr('src', ResourceManager.getIcon(params.actionDown));
        iconDown.append(icon);
    }


    if (params.actionBackgroundColor == 'white') {
        actionBar.addClass('white');
    }

    this.element.append(actionBar)
        .addClass('has-action-bar');

    this.action = actionBar;
};


/**
 * Menu
 *
 * Implementazione dell'oggetto PebbleJS UI.Menu, eredita da Window
 *
 * @param {object} params
 * @returns {Menu}
 */
function Menu(params) {

    Window.call(this, params); // call super constructor

    var menu = this.element;

    this.items = [];
    this.sections = [];
    this.selected = -1;
}
Menu.prototype = Object.create(Window.prototype);
Menu.prototype.constructor = Menu;

/**
 * Seleziona l'elemento precedente
 */
Menu.prototype.selectUp = function() {
    this.select(-1);
};

/**
 * selectDown
 *
 * Seleziona l'elemento successivo
 */
Menu.prototype.selectDown = function() {
    this.select(+1);
};

/**
 * select
 *
 * Seleziona un elemento spiazzato di un offset in base all'elemento corrente
 *
 * @param {object} offset
 */
Menu.prototype.select = function(offset) {

    if (this.selected + offset >= 0 && this.selected + offset < this.items.length) {
        this.selected += offset;
        var items = this.element.find('.MenuItem');
        var previousActive = items.filter('.active');
        var currentActive = items.filter(':eq(' + this.selected + ')');
        previousActive.removeClass('active')
            .find('img').each(function() {
                CanvasService.invertColor(this);
            });;
        currentActive.addClass('active')
            .find('img').each(function() {
                CanvasService.invertColor(this);
            });

        var viewport = this.element.parents('#Viewport');

        var boundTop = currentActive.position().top;
        var viewportHeight = viewport.height();

        if (boundTop > (viewportHeight / 2)) {
            var maxTop = -(this.element.outerHeight(true) - viewportHeight);
            var newTop = ((viewportHeight - currentActive.height()) / 2) - boundTop;

            if (newTop < maxTop) newTop = maxTop;
            this.element.stop().animate({
                top: newTop
            }, 300);
        } else {
            this.element.stop().animate({
                top: 0
            }, 300);
        }

        return;
    }

};

/**
 * getSelected
 *
 * Ritorna l'elemento corrente selezionato
 *
 * @returns {object}
 */
Menu.prototype.getSelected = function() {
    return this.items[this.selected];
};

/**
 * Aggiunge una nuova sezione al Menu
 *
 * @param {object} params
 */
Menu.prototype.addSection = function(params) {

    var menuSection = DisplayObject.factory('Section', params);
    var section = menuSection.get();

    section.attr('data-section', params.section);

    if (params.title) {
        var title = $(document.createElement('div'));
        title.text(params.title)
            .addClass('title');
        section.append(title);
    }

    this.element.append(section);
    this.sections.push(menuSection);
};

/**
 * addItem
 *
 * Aggiunge un nuovo elemento al Menu
 *
 * @param {object} params
 */
Menu.prototype.addItem = function(params) {

    var menuItem = DisplayObject.factory('MenuItem', params);
    var item = menuItem.get();
    item.attr('data-item', params.item);

    var text = $(document.createElement('div')).addClass('text');

    if (params.title) {
        var title = $(document.createElement('span')).addClass('title').text(params.title);
        text.append(title);
    }

    if (params.subtitle) {
        var subtitle = $(document.createElement('span')).addClass('subtitle').text(params.subtitle);
        text.append(subtitle);
    }

    item.append(text);

    if (params.icon) {
        try {
            var iconCell = $(document.createElement('div')).addClass('icon');
            var icon = $(new Image());
            icon.addClass('title-icon')
                .attr('src', ResourceManager.getIcon(params.icon));
            iconCell.append(icon);
            item.prepend(iconCell);
            text.addClass('icon-text');
        } catch (e) {
            console.log("Error loading icon", e);
        }
    }

    // select the first option
    if (this.selected === -1) {
        this.select(1);
    }

    this.element.find('[data-section="' + params.section + '"]').append(item);
    this.items.push(menuItem);

};


/**
 * Element
 *
 * Definizione del tipo base Element, eredita da DisplayObject
 *
 * @param {object} params
 * @returns {Element}
 */
function Element(params) {
    DisplayObject.call(this, params);
}
Element.prototype = Object.create(DisplayObject.prototype);
Element.prototype.constructor = DisplayObject;
Element.prototype.update = function(params) {}


/**
 * TextElement
 *
 * Implementazione dell'oggetto PebbleJS UI.TextElement
 *
 * Mostra un campo di testo sul display del Pebble
 *
 *
 * @param {object} params
 * @returns {TextElement}
 */
function TextElement(params) {

    Element.call(this, params); // call super constructor

    this.element.css('position', 'absolute');
    this.update(params);
}
TextElement.prototype = Object.create(Element.prototype);
TextElement.prototype.constructor = Element;
Element.prototype.update = function(params) {

    var textElement = this.element;

    if (params.x) textElement.css('left', params.x);
    if (params.y) textElement.css('top', params.y);
    if (params.width) textElement.css('width', "100%");
    if (params.height) textElement.css('height', params.height);
    if (params.textAlign) textElement.css('textAlign', Display.getTextAlign(params.textAlign));
    if (params.textOverflow) textElement.css('textOverflow', (params.textOverflow ? 'ellipsis' : ''));

    if (params.backgroundColor)
        textElement.addClass('black')
    else if (params.backgroundColor == 1)
        textElement.addClass('white')
    else
        textElement.removeClass('black').removeClass('white')

    if (params.text)
        textElement.text(params.text)

    if (params.font) {
        textElement.addClass(params.font || this.font);
    }

};


/**
 * TimeText
 *
 * Implementazione dell'oggetto PebbleJS UI.TimeText
 *
 * E' un elemento che mostra un testo con data e/o orario formattata sullo schermo
 *
 * @description Le opzioni di formattazione sono definite come
 * la funzione strftime() di c ed è implementata attraverso la libreria strftime.js
 *
 * @uses strftime.js
 *
 * @param {object} params
 * @returns {TimeText}
 */
function TimeText(params) {

    TextElement.call(this, params); // call super constructor

    var textElement = this.element,
        updateInterval = 1000 //specifiche non chiare, come specifico l'updateTimeUnit?;

    function updateText() {
        var now = new Date();
        textElement.text(now.strftime(params.text));
    };

    setInterval(updateText, updateInterval);
    updateText();

}

TimeText.prototype = Object.create(TextElement.prototype);
TimeText.prototype.constructor = TimeText;



// CanvasService - Util
var CanvasService = new function(image) {

    // Inverte i colori di un immagine
    this.invertColor = function(img) {
        var canvas = document.createElement('canvas'),
            context = canvas.getContext("2d");
        try {
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0);
            var imageData = context.getImageData(0, 0, img.width, img.height);
            var data = imageData.data;
            for (var i = 0; i < data.length; i += 4) {
                data[i] = 255 - data[i]; // red
                data[i + 1] = 255 - data[i + 1]; // green
                data[i + 2] = 255 - data[i + 2]; // blue
            }
            context.putImageData(imageData, 0, 0);
            img.src = canvas.toDataURL();
        } catch (ex) {}
    };

};