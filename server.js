const RPC = require('@xhayper/discord-rpc');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const client = new RPC.Client({
  clientId: '1488048615103397980'
});

// 🔒 IMAGEM DO MODO PRIVADO
const PRIVATE_LARGE_IMAGE = "private_large";

// 🖼️ FALLBACK
const DEFAULT_LARGE_IMAGE = "warptv";

// 🧠 ESTADO GLOBAL
let state = {
  media: null,
  manualGuide: null,
  privacy: false
};

// 🕒 CONTROLE
let tempoUltimaAtualizacao = Date.now();

client.on('ready', () => {
  console.log('✅ WarpTV Online no Discord!');
});

(async () => {
  try {
    await client.login();
  } catch {
    console.log("❌ Discord Desktop não detectado!");
  }
})();

// 🎯 FUNÇÃO CENTRAL
async function updatePresence() {
  if (!client.user) return;

  const media = state.media || {};

  // 🔒 MODO PRIVADO
  if (state.privacy) {
    try {
      await client.user.setActivity({
        details: "Assistindo em modo privado",
        state: "",

        largeImageKey: PRIVATE_LARGE_IMAGE || DEFAULT_LARGE_IMAGE,
        largeImageText: "Modo privado",

        type: 3
      });

      console.log("🔒 Modo privado ativo");
    } catch (err) {
      console.log("Erro RPC:", err.message);
    }
    return;
  }

  let finalDetails;
  let finalState;

  // 🥇 GUIA MANUAL
  if (state.manualGuide) {
    finalDetails = media.details || "WarpTV";
    finalState = state.manualGuide;
  }

  // 🥈 GUIA DO SITE
  else if (media.details) {
    finalDetails = media.details;
    finalState = media.state || "";
  }

  // 🥉 FALLBACK
  else {
    finalDetails = "Programação indisponível";
    finalState = "";
  }

  try {
    await client.user.setActivity({
      details: finalDetails,
      state: finalState,

      largeImageKey: media.largeImageKey || DEFAULT_LARGE_IMAGE,
      largeImageText: finalDetails,

      smallImageKey: media.smallImageKey || undefined,
      smallImageText: media.smallImageText || undefined,

      startTimestamp: media.startTimestamp || undefined,
      endTimestamp: media.endTimestamp || undefined,

      type: 3
    });

    console.log("🎯 Presença:", finalDetails, "|", finalState);
  } catch (err) {
    console.log("Erro RPC:", err.message);
  }
}

// 🚀 UPDATE
app.post('/update', (req, res) => {
  tempoUltimaAtualizacao = Date.now();
  state.media = req.body;

  updatePresence();

  res.send({ status: 'ok' });
});

// 📡 STATUS PRO POPUP
app.get('/update-status', (req, res) => {
  res.send(state.media || {});
});

// ✅ STATUS DO APP / DISCORD
app.get('/app-status', (req, res) => {
  res.send({
    discordConnected: !!client.user
  });
});

// ⚙️ COMMAND
app.post('/command', async (req, res) => {
  const { action, value } = req.body;

  switch (action) {
    case "set_manual_guide":
      state.manualGuide = value || null;
      console.log("📝 Guia manual:", state.manualGuide);
      break;

    case "clear_manual_guide":
      state.manualGuide = null;
      console.log("🧹 Guia manual removido");
      break;

    case "set_privacy":
      state.privacy = value;
      console.log("🔒 Privacidade:", value);
      break;

    case "clear_activity":
      try {
        if (client.user) {
          await client.user.clearActivity();
          console.log("🚪 Saiu do site - presença limpa");
        }
      } catch {}
      return res.send({ status: "ok" });

    case "resync":
      try {
        if (client.user) {
          await client.user.clearActivity();
          console.log("🔄 Resync");
        }
      } catch {}
      break;

    default:
      console.log("❓ Comando desconhecido:", action);
  }

  updatePresence();

  res.send({ status: "ok" });
});

// 🕒 LIMPEZA INTELIGENTE
setInterval(async () => {
  const agora = Date.now();

  if (agora - tempoUltimaAtualizacao > 7000) {
    try {
      if (client.user) {
        await client.user.clearActivity();
        console.log("⏹️ Presença limpa (inatividade)");
      }
    } catch {}
  }
}, 5000);

// 🚀 SERVER
const serverInstance = app.listen(3000, () => {
  console.log('🚀 WarpTV Server: http://127.0.0.1:3000');
});

module.exports = serverInstance;