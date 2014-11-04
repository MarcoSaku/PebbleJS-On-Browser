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
 * From PebbleJS Interface
 * Type & Commands Definitions
 */

window.Color = function(x) {
  switch (x) {
    case 'clear': return ~0;
    case 'black': return 0;
    case 'white': return 1;
  }
  return Number(x);
};

window.Font = function(x) {
  var id = Resource.getId(x);
  if (id) {
    return id;
  }
  x = myutil.toCConstantName(x);
  if (!x.match(/^RESOURCE_ID/)) {
    x = 'RESOURCE_ID_' + x;
  }
  x = x.replace(/_+/g, '_');
  return x;
};

window.TextOverflowMode = function(x) {
  switch (x) {
    case 'wrap'    : return 0;
    case 'ellipsis': return 1;
    case 'fill'    : return 2;
  }
  return Number(x);
};

window.TextAlignment = function(x) {
  switch (x) {
    case 'left'  : return 0;
    case 'center': return 1;
    case 'right' : return 2;
  }
  return Number(x);
};

window.TimeUnits = function(x) {
  var z = 0;
  x = myutil.toObject(x, true);
  for (var k in x) {
    switch (k) {
      case 'seconds': z |= (1 << 0); break;
      case 'minutes': z |= (1 << 1); break;
      case 'hours'  : z |= (1 << 2); break;
      case 'days'   : z |= (1 << 3); break;
      case 'months' : z |= (1 << 4); break;
      case 'years'  : z |= (1 << 5); break;
    }
  }
  return z;
};

window.CompositingOp = function(x) {
  switch (x) {
    case 'assign':
    case 'normal': return 0;
    case 'assignInverted':
    case 'invert': return 1;
    case 'or'    : return 2;
    case 'and'   : return 3;
    case 'clear' : return 4;
    case 'set'   : return 5;
  }
  return Number(x);
};

window.AnimationCurve = function(x) {
  switch (x) {
    case 'linear'   : return 0;
    case 'easeIn'   : return 1;
    case 'easeOut'  : return 2;
    case 'easeInOut': return 3;
  }
  return Number(x);
};

window.setWindowParams = [{
  name: 'clear',
}, {
  name: 'id',
}, {
  name: 'pushing',
  type: Boolean,
}, {
  name: 'action',
  type: Boolean,
}, {
  name: 'actionUp',
  type: Image,
}, {
  name: 'actionSelect',
  type: Image,
}, {
  name: 'actionDown',
  type: Image,
}, {
  name: 'actionBackgroundColor',
  type: Color,
}, {
  name: 'backgroundColor',
  type: Color,
}, {
  name: 'fullscreen',
  type: Boolean,
}, {
  name: 'scrollable',
  type: Boolean,
}];

window.setCardParams = setWindowParams.concat([{
  name: 'title',
  type: String,
}, {
  name: 'subtitle',
  type: String,
}, {
  name: 'body',
  type: String,
}, {
  name: 'icon',
  type: Image,
}, {
  name: 'subicon',
  type: Image,
}, {
  name: 'image',
  type: Image,
}, {
  name: 'style'
}]);

/***************************************************/
window.WTempParams = setWindowParams.concat([{
  name: 'city',
  type: String,
}]);
/***************************************************/

window.setMenuParams = setWindowParams.concat([{
  name: 'sections',
  type: Number,
}]);

window.setStageParams = setWindowParams;


var commands = [{
  name: 'setWindow',
  params: setWindowParams,
}, {
  name: 'windowShow',
  params: [{
    name: 'id'
  }]
}, {
  name: 'windowHide',
  params: [{
    name: 'id'
  }]
}, {
  name: 'setCard',
  params: setCardParams,
},{
  name: 'setWTemp',
  params: WTempParams,
}, {
  name: 'click',
  params: [{
    name: 'button',
  }],
}, {
  name: 'longClick',
  params: [{
    name: 'button',
  }],
}, {
  name: 'accelTap',
  params: [{
    name: 'axis',
  }, {
    name: 'direction',
  }],
}, {
  name: 'vibe',
  params: [{
    name: 'type',
  }],
}, {
  name: 'accelData',
  params: [{
    name: 'transactionId',
  }, {
    name: 'numSamples',
  }, {
    name: 'accelData',
  }],
}, {
  name: 'getAccelData',
  params: [{
    name: 'transactionId',
  }],
}, {
  name: 'configAccelData',
  params: [{
    name: 'rate',
  }, {
    name: 'samples',
  }, {
    name: 'subscribe',
  }],
}, {
  name: 'configButtons',
  params: [{
    name: 'back',
  }, {
    name: 'up',
  }, {
    name: 'select',
  }, {
    name: 'down',
  }],
}, {
  name: 'setMenu',
  params: setMenuParams,
}, {
  name: 'setMenuSection',
  params: [{
    name: 'clear',
    type: Boolean,
  }, {
    name: 'section',
  }, {
    name: 'items',
  }, {
    name: 'title',
    type: String,
  }],
}, {
  name: 'getMenuSection',
  params: [{
    name: 'section',
  }],
}, {
  name: 'setMenuItem',
  params: [{
    name: 'section',
  }, {
    name: 'item',
  }, {
    name: 'title',
    type: String,
  }, {
    name: 'subtitle',
    type: String,
  }, {
    name: 'icon',
    type: Image,
  }],
}, {
  name: 'getMenuItem',
  params: [{
    name: 'section',
  }, {
    name: 'item',
  }],
}, {
  name: 'menuSelect',
  params: [{
    name: 'section',
  }, {
    name: 'item',
  }],
}, {
  name: 'menuLongSelect',
  params: [{
    name: 'section',
  }, {
    name: 'item',
  }],
}, {
  name: 'image',
  params: [{
    name: 'id',
  }, {
    name: 'width',
  }, {
    name: 'height',
  }, {
    name: 'pixels',
  }],
}, {
  name: 'setStage',
  params: setStageParams,
}, {
  name: 'stageElement',
  params: [{
    name: 'id',
  }, {
    name: 'type',
  }, {
    name: 'index',
  }, {
    name: 'x',
  }, {
    name: 'y',
  }, {
    name: 'width',
  }, {
    name: 'height',
  }, {
    name: 'backgroundColor',
    type: Color,
  }, {
    name: 'borderColor',
    type: Color,
  }, {
    name: 'radius',
  }, {
    name: 'text',
    type: String,
  }, {
    name: 'font',
    type: Font,
  }, {
    name: 'color',
    type: Color,
  }, {
    name: 'textOverflow',
    type: TextOverflowMode,
  }, {
    name: 'textAlign',
    type: TextAlignment,
  }, {
    name: 'updateTimeUnits',
    type: TimeUnits,
  }, {
    name: 'image',
    type: Image,
  }, {
    name: 'compositing',
    type: CompositingOp,
  }],
}, {
  name: 'stageRemove',
  params: [{
    name: 'id',
  }],
}, {
  name: 'stageAnimate',
  params: [{
    name: 'id',
  }, {
    name: 'x',
  }, {
    name: 'y',
  }, {
    name: 'width',
  }, {
    name: 'height',
  }, {
    name: 'duration',
  }, {
    name: 'easing',
    type: AnimationCurve,
  }],
}, {
  name: 'stageAnimateDone',
  params: [{
    name: 'index',
  }],
}];


window.commands = commands;

// Build the commandMap and map each command to an integer.

var commandMap = {};

for (var i = 0, ii = commands.length; i < ii; ++i) {
  var command = commands[i];
  commandMap[command.name] = command;
  command.id = i;
	
  //alert("Map "+commandMap[command.name].name+" id="+commandMap[command.name].id);
  var params = command.params;
  if (!params) {
    continue;
  }

  var paramMap = command.paramMap = {};
  for (var j = 0, jj = params.length; j < jj; ++j) {
    var param = params[j];
    paramMap[param.name] = param;
    param.id = j + 1;
  }
}