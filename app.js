__loader.define("app.js", 109, function(module, require) {
/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

var UI = require('ui');
var Vector2 = require('vector2');

var main = new UI.Card({
  title: 'Domotic Example',
  body: 'Press select to show temperature',
  scrollable: true,
});

main.show();

main.on('click', 'select', function(e) {
	var temp=new UI.WTemp({
	city: 'Naples' //Set city name
	});
	temp.show();
});



main.on('click', 'up', function(e) {
  var menu = new UI.Menu({
    sections: [{
      items: [{
        title: 'Pebble.js',
        icon: 'images/menu_icon.png',
        subtitle: 'Can do Menus'
      }, {
        title: 'Second Item',
        subtitle: 'Subtitle Text'
      }, {
        title: 'Third Item',
        subtitle: 'Subtitle Text'
      }, {
        title: 'Fourth Item',
        subtitle: 'Subtitle Text'
      }, {
        title: 'Fifth Item',
        subtitle: 'Subtitle Text'
      }, {
        title: 'Sixth Item',
        subtitle: 'Subtitle Text'
      }, {
        title: 'Seventh Item',
        subtitle: 'Subtitle Text'
      }, {
        title: 'Eight Item',
        subtitle: 'Subtitle Text'
      }, {
        title: 'Ninth Item',
        subtitle: 'Subtitle Text'
      }, {
        title: 'Tenth Item',
        subtitle: 'Subtitle Text'
      }, {
        title: 'Eleventh Item',
        subtitle: 'Subtitle Text'
      }, {
        title: 'Twelfth Item',
        subtitle: 'Subtitle Text'
      }, {
        title: 'Thirteenth Item',
        subtitle: 'Subtitle Text'
      }, {
        title: 'Fourteenth Item',
        subtitle: 'Subtitle Text'
      }]
    }]
  });
  menu.on('select', function(e) {
    alert('Selected item: ' + e.section + ' ' + e.item);
  });
  menu.show();
});




////*******************************/////////////////////
});
