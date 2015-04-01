var cfg = require('config');
var moment = require('moment');
var ac = require('ac-server-ctrl');
var History = require('../models/history');
var Events = require('../models/event');

var checkEvents = function() {
    var now = moment().unix();
    var last = now-cfg.get('watchdog.interval');

    Events.getDue(last, now, function(err, events) {
        if(err) {
            return console.error(err);
        }
        events.forEach(function(event) {
            console.log('checkEvents.getDue()', event);
            require('./event-util').start(event._id);
        });
    })
};

var checkServers = function () {
    for (var presetName in ac.servers) {
        ac.status(presetName, function(presetName, status) {
            if(status < 0) {
                console.error('Dead server', presetName, 'found');
                History.add('Watchdog', 'Preset ' + presetName + ' found dead');
                ac.stop(presetName, checkRestartPreset);
            }
        });
    }
};

var checkRestartPreset = function (presetName) {
    if(cfg.get('autorestart') && cfg.get('autostart').indexOf(presetName) >= 0) {
        console.log('Restarting', presetName);
        ac.start(presetName, function(presetName) {
            History.add('Watchdog', 'Restart ' + presetName);
        });
    }
};

var autoStartPresets = function () {
    cfg.get('autostart').forEach(function startServer(presetName) {
        console.log('Autostarting', presetName);
        ac.start(presetName, function addToHistory(presetName) {
            History.add('Watchdog', 'Autostart ' + presetName);
        });
    });
};

exports.start = function() {
    setInterval(checkServers, (cfg.get('watchdog.interval')*1000));
    setInterval(checkEvents, (cfg.get('watchdog.interval')*1000));
    autoStartPresets();
};
