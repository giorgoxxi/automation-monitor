const serviceConfig = require('./config.json'),
    devices = require('./user-config/devices.json'),
    rules = require('./user-config/rules.json'),
    deviceManagerFactory = require('./lib/device-manager-factory'),
    moment = require('moment'),
    request = require('request'),
    fs = require('fs'),
    util = require('util');

let log_file = fs.createWriteStream(__dirname + '/debug.log', {flags: 'a'});
let log_stdout = process.stdout;

console.log = function (d) {
    d = (new Date()).toUTCString() + ' - ' + d;
    log_file.write(util.format(d) + '\n');
    log_stdout.write(util.format(d) + '\n');
};

process.__defineGetter__('stderr', function () {
    return fs.createWriteStream(__dirname + '/error.log', {flags: 'a'})
});

let interval = serviceConfig["pollInterval"] * 1000;

let iftttUrl = (eventName) => {
    let iftttBaseUrl = serviceConfig.ifttt_url;
    return util.format(iftttBaseUrl, eventName, serviceConfig.ifttt_key);
};

let sendNotification = (rule) => {
    let options = {
        url: iftttUrl(rule.ifttt_event),
        method: 'POST',
        json: {
            "value1": rule.message
        },
        headers: {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8'
        }
    };

    console.log(`Sending notification for '${rule.ifttt_event}' event...`);

    request.post(options, function (error, response, body) {
        rule.notificationSentDateTime = moment();
        console.log(`Notification for '${rule.ifttt_event}' event sent successfully`);
    });
};

let setRuleViolated = (rule, violated) => {
    rule.violated = violated;
    rule.firstViolatedDateTime = violated ? moment() : null;
    rule.notificationSentDateTime = violated ? rule.notificationSentDateTime : null;
};

let getDifferenceInSeconds = (date) => {
    return moment.duration(moment().diff(date)).asSeconds();
};

setInterval(function () {
    for (let ruleName in rules) {
        let rule = rules[ruleName];
        let deviceConfig = devices[rule.device];

        let deviceManager = deviceManagerFactory(rule.device).deviceManager;

        deviceManager(deviceConfig, function (manager) {
            manager.executeCommand(rule.command, function (value) {
                if (value === rule.thresholdValue) {
                    if (!rule.violated) {
                        setRuleViolated(rule, true);
                    }
                } else {
                    setRuleViolated(rule, false);
                }

                if (rule.violated) {
                    if (getDifferenceInSeconds(rule.firstViolatedDateTime) > rule.thresholdHeldFor) {

                        console.log('\'' + ruleName + '\' rule violated');

                        if (rule.notificationSentDateTime) {
                            let secondsSinceLastNotification = getDifferenceInSeconds(rule.notificationSentDateTime);

                            if (secondsSinceLastNotification > serviceConfig.throttleNotificationDuration) {
                                sendNotification(rule);
                            } else{
                                console.log(`Skipping notification (Last one sent ${secondsSinceLastNotification} seconds ago)`);
                            }
                        } else {
                            sendNotification(rule);
                        }
                    }
                }
            });
        });
    }
}, interval);
