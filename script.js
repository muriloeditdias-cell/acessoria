const app = document.getElementById("app");

const GUESTS_KEY = "black_gold_rsvp_guests_v3";
const EVENT_KEY = "black_gold_rsvp_event_v3";

let guests = JSON.parse(localStorage.getItem(GUESTS_KEY)) || [];

let eventData = JSON.parse(localStorage.getItem(EVENT_KEY)) || {
  couple: "João & Maria",
  date: "20/12/2026",
  time: "16:30",
  place: "Espaço Jardim Imperial",
  address: "Rua das Flores, 1200 - Centro",
  cover: "",
  messageIntro: "Com muito carinho, estamos confirmando sua presença em nosso casamento."
};

function saveGuests() {
  localStorage.setItem(GUESTS_KEY, JSON.stringify(guests));
}

function saveEvent() {
  localStorage.setItem(EVENT_KEY, JSON.stringify(eventData));
}

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "guest-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function onlyNumbers(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizePhone(phone) {
  const clean = onlyNumbers(phone);

  if (clean.length === 11) return "55" + clean;
  if (clean.length === 10) return "55" + clean;
  if (clean.length === 13 && clean.startsWith("55")) return clean;

  return clean;
}

function parseGuestsFromText(text) {
  const lines = String(text || "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  const parsed = [];

  for (const line of lines) {
    const phoneMatch = line.match(/(\+?55)?\s?\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4}/);

    if (!phoneMatch) continue;

    const phoneRaw = phoneMatch[0];
    const phone = normalizePhone(phoneRaw);

    let name = line
      .replace(phoneRaw, "")
      .replace(/[-–|,;:]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!name) name = "Convidado";

    parsed.push({
      id: createId(),
      name,
      phone,
      status: "waiting",
      companions: 0,
      note: "",
      createdAt: new Date().toISOString(),
      answeredAt: null
    });
  }

  return parsed;
}

function getBaseUrl() {
  return `${location.origin}${location.pathname}`;
}

function encodeInviteData(guest) {
  const data = {
    guestId: guest.id,
    name: guest.name,
    phone: guest.phone,
    couple: eventData.couple,
    date: eventData.date,
    time: eventData.time,
    place: eventData.place,
    address: eventData.address,
    messageIntro: eventData.messageIntro,
    cover: eventData.cover || ""
  };

  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

function decodeInviteData(payload) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(payload))));
  } catch (error) {
    return null;
  }
}

function getConfirmLink(guestId) {
  const guest = guests.find(g => g.id === guestId);

  if (!guest) {
    return getBaseUrl();
  }

  const payload = encodeInviteData(guest);

  return `${getBaseUrl()}#convite/${payload}`;
}

function getWhatsAppMessage(guest) {
  const confirmLink = getConfirmLink(guest.id);

  return `Olá, ${guest.name}! ✨

${eventData.messageIntro}

Casamento de ${eventData.couple}
Data: ${eventData.date}
Horário: ${eventData.time}
Local: ${eventData.place}
Endereço: ${eventData.address}

Para confirmar sua presença, clique no link abaixo:
${confirmLink}

Com carinho,
Assessoria do casamento.`;
}

function getWhatsappLink(guest) {
  return `https://wa.me/${guest.phone}?text=${encodeURIComponent(getWhatsAppMessage(guest))}`;
}

function syncEventFromForm() {
  eventData.couple = document.getElementById("couple")?.value || "";
  eventData.date = document.getElementById("eventDate")?.value || "";
  eventData.time = document.getElementById("eventTime")?.value || "";
  eventData.place = document.getElementById("eventPlace")?.value || "";
  eventData.address = document.getElementById("eventAddress")?.value || "";
  eventData.messageIntro = document.getElementById("messageIntro")?.value || "";

  saveEvent();
}

function renderDashboard() {
  const total = guests.length;
  const confirmed = guests.filter(g => g.status === "confirmed").length;
  const declined = guests.filter(g => g.status === "declined").length;
  const waiting = guests.filter(g => g.status === "waiting").length;

  app.innerHTML = `
    <main class="app-shell">
      <section class="hero">
        <div class="brand">Black Gold RSVP</div>
        <h1>Confirmação de Presença</h1>
        <p>
          Painel premium para assessorias de casamento com importação de convidados,
          envio via WhatsApp e confirmação individual por link.
        </p>
      </section>

      <section class="container layout">
        <aside class="card">
          <h2>Dados do casamento</h2>

          <div class="form-group">
            <label>Nome dos noivos</label>
            <input id="couple" value="${escapeHTML(eventData.couple)}" oninput="syncEventFromForm()" />
          </div>

          <div class="form-group">
            <label>Data</label>
            <input id="eventDate" value="${escapeHTML(eventData.date)}" oninput="syncEventFromForm()" />
          </div>

          <div class="form-group">
            <label>Horário</label>
            <input id="eventTime" value="${escapeHTML(eventData.time)}" oninput="syncEventFromForm()" />
          </div>

          <div class="form-group">
            <label>Local</label>
            <input id="eventPlace" value="${escapeHTML(eventData.place)}" oninput="syncEventFromForm()" />
          </div>

          <div class="form-group">
            <label>Endereço</label>
            <input id="eventAddress" value="${escapeHTML(eventData.address)}" oninput="syncEventFromForm()" />
          </div>

          <div class="form-group">
            <label>Mensagem inicial</label>
            <textarea id="messageIntro" oninput="syncEventFromForm()">${escapeHTML(eventData.messageIntro)}</textarea>
          </div>

          <div class="upload-box">
            <label>Foto/banner do casamento</label>
            <input type="file" id="coverInput" accept="image/*" />
            <p class="small">Essa imagem aparece na tela de confirmação do convidado.</p>
          </div>

          <div class="form-group">
            <label>Colar lista dos convidados</label>
            <textarea id="guestText" placeholder="Maria Silva - 11999999999&#10;João Souza - 11988888888"></textarea>
          </div>

          <div class="upload-box">
            <label>Importar Excel / CSV</label>
            <input type="file" id="excelInput" accept=".xlsx,.xls,.csv" />
          </div>

          <div class="upload-box">
            <label>Importar PDF</label>
            <input type="file" id="pdfInput" accept=".pdf" />
          </div>

          <div class="actions">
            <button class="btn" onclick="addFromText()">Gerar lista</button>
            <button class="btn secondary" onclick="clearAll()">Limpar tudo</button>
          </div>

          <p class="small">
            Versão demonstrativa: o convidado consegue abrir o link em qualquer celular.
            Para a resposta voltar ao painel em tempo real, será necessário banco de dados.
          </p>
        </aside>

        <section class="card">
          <div class="table-tools">
            <h2>Lista de convidados</h2>

            <div class="stats">
              <div class="stat">
                <strong>${total}</strong>
                <span>Total</span>
              </div>

              <div class="stat">
                <strong>${confirmed}</strong>
                <span>Confirmados</span>
              </div>

              <div class="stat">
                <strong>${declined}</strong>
                <span>Não vão</span>
              </div>

              <div class="stat">
                <strong>${waiting}</strong>
                <span>Aguardando</span>
              </div>
            </div>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Convidado</th>
                  <th>Telefone</th>
                  <th>Status</th>
                  <th>Acompanhantes</th>
                  <th>Observação</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                ${
                  guests.length
                    ? guests.map((guest, index) => `
                      <tr>
                        <td>${index + 1}</td>
                        <td class="guest-name">${escapeHTML(guest.name)}</td>
                        <td>${escapeHTML(guest.phone)}</td>
                        <td>${statusBadge(guest.status)}</td>
                        <td>${guest.companions || 0}</td>
                        <td>${escapeHTML(guest.note || "-")}</td>
                        <td>
                          <div class="actions">
                            <a class="btn" href="${getWhatsappLink(guest)}" target="_blank">
                              WhatsApp
                            </a>

                            <button class="btn secondary" onclick="copyLink('${guest.id}')">
                              Copiar link
                            </button>

                            <button class="btn secondary" onclick="openConfirmPreview('${guest.id}')">
                              Ver tela
                            </button>
                          </div>
                        </td>
                      </tr>
                    `).join("")
                    : `
                      <tr>
                        <td colspan="7">
                          <div class="empty">
                            Nenhum convidado adicionado ainda.
                          </div>
                        </td>
                      </tr>
                    `
                }
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  `;

  setupInputs();
}

function statusBadge(status) {
  if (status === "confirmed") {
    return `<span class="status confirmed">Confirmado</span>`;
  }

  if (status === "declined") {
    return `<span class="status declined">Não poderá ir</span>`;
  }

  return `<span class="status waiting">Aguardando</span>`;
}

function setupInputs() {
  const coverInput = document.getElementById("coverInput");
  const excelInput = document.getElementById("excelInput");
  const pdfInput = document.getElementById("pdfInput");

  if (coverInput) coverInput.addEventListener("change", handleCover);
  if (excelInput) excelInput.addEventListener("change", handleExcel);
  if (pdfInput) pdfInput.addEventListener("change", handlePdf);
}

function handleCover(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    eventData.cover = reader.result;
    saveEvent();
    alert("Foto do casamento adicionada com sucesso.");
  };

  reader.readAsDataURL(file);
}

function addFromText() {
  syncEventFromForm();

  const text = document.getElementById("guestText").value;
  const parsed = parseGuestsFromText(text);

  if (!parsed.length) {
    alert("Não encontrei convidados com telefone válido.");
    return;
  }

  guests = [...guests, ...parsed];
  saveGuests();
  renderDashboard();
}

function clearAll() {
  if (!confirm("Deseja apagar toda a lista de convidados?")) return;

  guests = [];
  saveGuests();
  renderDashboard();
}

function copyLink(id) {
  const link = getConfirmLink(id);

  navigator.clipboard.writeText(link)
    .then(() => {
      alert("Link de confirmação copiado.");
    })
    .catch(() => {
      prompt("Copie o link abaixo:", link);
    });
}

function openConfirmPreview(id) {
  const guest = guests.find(g => g.id === id);

  if (!guest) {
    alert("Convidado não encontrado.");
    return;
  }

  const payload = encodeInviteData(guest);
  location.hash = `convite/${payload}`;
}

async function handleExcel(event) {
  const file = event.target.files[0];
  if (!file) return;

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const text = rows.map(row => row.join(" ")).join("\n");
  const parsed = parseGuestsFromText(text);

  if (!parsed.length) {
    alert("Não encontrei convidados válidos nesse arquivo.");
    return;
  }

  guests = [...guests, ...parsed];
  saveGuests();
  renderDashboard();
}

async function handlePdf(event) {
  const file = event.target.files[0];
  if (!file) return;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let text = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(" ") + "\n";
  }

  const parsed = parseGuestsFromText(text);

  if (!parsed.length) {
    alert("Não encontrei convidados válidos nesse PDF.");
    return;
  }

  guests = [...guests, ...parsed];
  saveGuests();
  renderDashboard();
}

function getInviteCover(invite) {
  if (invite.cover) {
    return `url('${invite.cover}')`;
  }

  return `
    linear-gradient(135deg, rgba(212,175,55,0.22), rgba(0,0,0,0.78)),
    url('https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=80')
  `;
}

function renderPublicInvitePage(invite) {
  if (!invite) {
    app.innerHTML = `
      <section class="confirm-page public-only">
        <div class="card final-message">
          <h1>Convite inválido</h1>
          <p>Não foi possível carregar os dados deste convite.</p>
        </div>
      </section>
    `;
    return;
  }

  app.innerHTML = `
    <section class="confirm-page public-only">
      <div class="card confirm-card">
        <div class="confirm-cover" style="--cover: ${getInviteCover(invite)}">
          <div class="confirm-cover-content">
            <div class="brand">Convite especial</div>
            <h1>${escapeHTML(invite.couple)}</h1>
          </div>
        </div>

        <div class="confirm-body">
          <div class="guest-pill">
            ${escapeHTML(invite.name)}
          </div>

          <p class="invite-text">
            ${escapeHTML(invite.messageIntro)}
          </p>

          <div class="event-info">
            <div class="info-box">
              <span>Data</span>
              <strong>${escapeHTML(invite.date)}</strong>
            </div>

            <div class="info-box">
              <span>Horário</span>
              <strong>${escapeHTML(invite.time)}</strong>
            </div>

            <div class="info-box">
              <span>Local</span>
              <strong>${escapeHTML(invite.place)}</strong>
            </div>
          </div>

          <div class="info-box">
            <span>Endereço</span>
            <strong>${escapeHTML(invite.address)}</strong>
          </div>

          <div class="form-group" style="margin-top:22px;">
            <label>Acompanhantes</label>
            <input id="publicCompanions" type="number" min="0" value="0" />
          </div>

          <div class="form-group">
            <label>Observação</label>
            <textarea id="publicNote" placeholder="Ex: restrição alimentar, criança, observação especial..."></textarea>
          </div>

          <div class="actions confirm-actions">
            <button class="btn success" onclick="publicAnswer('confirmed')">
              Confirmo presença
            </button>

            <button class="btn danger" onclick="publicAnswer('declined')">
              Não poderei ir
            </button>
          </div>

          <p class="small">
            Sua resposta será registrada nesta demonstração.
          </p>
        </div>
      </div>
    </section>
  `;
}

function publicAnswer(status) {
  const companions = document.getElementById("publicCompanions")?.value || 0;
  const note = document.getElementById("publicNote")?.value || "";

  const title = status === "confirmed"
    ? "Presença confirmada ✨"
    : "Resposta registrada";

  const message = status === "confirmed"
    ? `Obrigado! Sua confirmação foi registrada com ${companions} acompanhante(s).`
    : "Obrigado por avisar. Sua resposta foi registrada.";

  app.innerHTML = `
    <section class="confirm-page public-only">
      <div class="card final-message">
        <h1>${title}</h1>
        <p>${message}</p>
        ${note ? `<p class="small">Observação: ${escapeHTML(note)}</p>` : ""}
      </div>
    </section>
  `;
}

function router() {
  const hash = location.hash;

  if (hash.startsWith("#convite/")) {
    const payload = hash.replace("#convite/", "");
    const invite = decodeInviteData(payload);
    renderPublicInvitePage(invite);
    return;
  }

  renderDashboard();
}

window.addEventListener("hashchange", router);

router();
