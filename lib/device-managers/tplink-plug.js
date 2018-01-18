const commands = require('../../user-config/commands/tplink-plug-commands.json'),
    tplinkSmartHome = require('tplink-smarthome-api');

let TPlinkPlugManager = function (deviceConfig, callback) {
    let that = this;

    this.ip = deviceConfig.ip;

    this.tplinkConnector = new tplinkSmartHome.Client();

    if (callback !== undefined) {
        callback(that)
    }
};

TPlinkPlugManager.prototype.executeCommand = function (command, callback) {
    let commandDefinition = commands[command];

    this.tplinkConnector.getDevice({host: this.ip}).then((device) => {
        device[commandDefinition.functionToCall](...commandDefinition.parameters).then((value)=>{
            if (callback !== undefined){
                callback(value);
            }
        });
    }).catch((reason) => {
        console.log('Error - ' + reason)
    });
};

module.exports = function (deviceConfig, callback) {
    return new TPlinkPlugManager(deviceConfig, callback)
};