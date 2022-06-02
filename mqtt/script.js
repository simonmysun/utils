const config = {
    host: "ws://vv.makelove.expert",
    username: "mysun",
    password: "3.1415926"
};

const devices = [
    {
        name: "",
        type: "E27 RGBW"
    }
];

const client = mqtt.connect();
client.subscribe("mqtt/demo");

client.on("message", function (topic, payload) {
    console.log([topic, payload].join(": "));
    client.end();
})

client.publish("mqtt/demo", "hello world!");
