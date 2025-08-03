const client = mqtt.connect("ws://192.168.178.40:9001");
var colorPicker = new iro.ColorPicker("#picker");
const colorSubmitButton = document.getElementById("colorSubmit");
let selectedColor;
let debounceTimeout;
// Lokale Status-Verwaltung (pro Lampe)
const lampStates = {
  lamp_1: "OFF",
  lamp_2: "OFF",
  lamp_3: "OFF",
  lamp_4: "OFF",
};

colorSubmitButton.addEventListener("click", () => {});

colorPicker.on("color:change", function (color) {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    for (let i = 1; i <= 4; i++) {
      client.publish(
        `zigbee2mqtt/lamp_${i}/set`,
        JSON.stringify({ color: { hex: color.hexString } })
      );
    }
  }, 300);
});

client.on("connect", () => {
  console.log("Connected to MQTT broker");

  // Alle Status-Themen abonnieren
  for (let i = 1; i <= 4; i++) {
    client.subscribe(`zigbee2mqtt/lamp_${i}`);
  }

  // Toggle-Logik beim Buttonklick
  for (let i = 1; i <= 4; i++) {
    const lampId = `lamp_${i}`;
    const lampButton = document.getElementById(`lamp${i}`);

    lampButton.addEventListener("click", () => {
      const currentState = lampStates[lampId] || "OFF";
      const nextState = currentState === "ON" ? "OFF" : "ON";

      client.publish(
        `zigbee2mqtt/${lampId}/set`,
        JSON.stringify({ state: nextState })
      );

      console.log(`Toggled ${lampId} to ${nextState}`);
    });
  }
});

// Aktuelle Zustände aus den Nachrichten extrahieren
client.on("message", (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    const topicParts = topic.split("/");
    const lampId = topicParts[1]; // z.B. "lamp_1"

    if (payload.state) {
      lampStates[lampId] = payload.state;
      console.log(`Updated ${lampId} to ${payload.state}`);
    }
  } catch (err) {
    console.error("Failed to parse MQTT message:", err);
  }
});
