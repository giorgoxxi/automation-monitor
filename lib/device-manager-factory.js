const tplinkPlugManager = require('./device-managers/tplink-plug');

let DeviceManagerFactory = function(deviceName) {
    this.deviceManager = null;

    // Remove instance from device name
    deviceName = deviceName.substring(0, deviceName.indexOf('-') > -1 ? deviceName.indexOf('-') : deviceName.length);

    switch (deviceName){
        case 'tplinkplug':
            this.deviceManager = tplinkPlugManager;
            return;
    }
};

module.exports = (deviceName) => {
    return new DeviceManagerFactory(deviceName);
};