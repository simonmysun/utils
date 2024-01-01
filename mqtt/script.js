const mqtt = require('mqtt');

const devices = [
    {
        name: "办公桌台灯",
        cmnd: "cmnd/tasmota_D2FBD2/Backlog"
    }, {
        name: "工作台台灯",
        cmnd: "cmnd/tasmota_D3EDA0/Backlog"
    }, {
        name: "床头柜台灯",
        cmnd: "cmnd/tasmota_D2FB56/Backlog"
    }, {
        name: "白色球形灯",
        cmnd: "cmnd/tasmota_D2FABD/Backlog"
    }
];

const host = process.env.host;
const username = process.env.username;
const password = process.env.password;

const clientId = 'light_batch_controller_mqttjs_' + Math.random().toString(16).slice(2, 10);

const options = {
    keepalive: 60,
    clientId: clientId,
    protocolId: 'MQTT',
    protocolVersion: 4,
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
    username: username,
    password: password,
};

const client = mqtt.connect(host, options);

client.on('connect', () => {
    console.log('connected');
});

client.on('message', function (topic, payload) {
    console.log([topic, payload].join(": "));
    client.end();
});

const fadeTo = function(to, now) {
    setTimeout(() => {
        if(now !== to) {
            now += Math.abs(to - now) / (to - now);
            console.log(now);
            devices.forEach(d => client.publish(d.cmnd, `NoDelay;Dimmer ${now}`));
            fadeTo(to, now);
        } else {
            process.exit();
        }
    }, 1000);
};

// fadeTo(0, 100);
fadeTo(100, 0);
