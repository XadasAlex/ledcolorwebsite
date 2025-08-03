const client = mqtt.connect("ws://192.168.178.40:9001");
const colorPicker = new iro.ColorPicker("#picker");
const brightnessSelector = document.getElementById("brightnessSelector");

const lampStates = {};
const lampInitialized = {};
let debounceTimeout;

const publishToAll = (message) => {
  for (let i = 1; i <= 4; i++) {
    client.publish(`zigbee2mqtt/lamp_${i}/set`, message);
  }
};

// Initialisiere Zustände
for (let i = 1; i <= 4; i++) {
  const id = `lamp_${i}`;
  lampStates[id] = "UNKNOWN";
  lampInitialized[id] = false;
}

// Farbauswahl mit Debounce (max. alle 300ms)
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

brightnessSelector.addEventListener("change", (e) => {
  publishToAll(JSON.stringify({ brightness: `${e.target.value}` }));
});

client.on("connect", () => {
  console.log("✅ Verbunden mit MQTT");

  for (let i = 1; i <= 4; i++) {
    const lampId = `lamp_${i}`;
    const button = document.getElementById(`lamp${i}`);
    button.disabled = true; // Deaktivieren bis Zustand empfangen

    client.subscribe(`zigbee2mqtt/${lampId}`);
    client.publish(`zigbee2mqtt/${lampId}/get`, JSON.stringify({ state: "" }));

    button.addEventListener("click", () => {
      if (!lampInitialized[lampId]) {
        console.warn(`⏳ ${lampId} ist noch nicht bereit.`);
        return;
      }

      const current = lampStates[lampId];
      const next = current === "ON" ? "OFF" : "ON";

      client.publish(
        `zigbee2mqtt/${lampId}/set`,
        JSON.stringify({ state: next })
      );

      console.log(`⏹️ Toggle ${lampId}: ${current} → ${next}`);
    });
  }
});

client.on("message", (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    const [, lampId] = topic.split("/");

    if (payload.state) {
      lampStates[lampId] = payload.state;
      lampInitialized[lampId] = true;

      const button = document.getElementById(lampId.replace("_", ""));
      if (button) {
        button.disabled = false;
      }

      console.log(`✅ Status empfangen: ${lampId} = ${payload.state}`);
      console.log(payload);
    }
  } catch (err) {
    console.error("❌ Fehler beim Parsen der Nachricht:", err);
  }
});

// Farbtemperatur Buttons
document.querySelectorAll("[data-temp]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const value = parseInt(btn.dataset.temp);
    publishToAll(JSON.stringify({ color_temp: value }));
    console.log(`🎨 Farbtemperatur gesetzt: ${value}`);
  });
});

// Zusätzliche Effektbuttons
document.querySelectorAll(".effect-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const effectName = btn.dataset.effect;
    publishToAll(JSON.stringify({ effect: effectName }));
    console.log(`✨ Effekt gesendet: ${effectName}`);
  });
});
