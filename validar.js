const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxHY6kNTNWcrHd0oX6Bx7M858utqxYZayKNxu1m3uiU-twY7TqTAWjYaX8mK_lTgLLN/exec";

function jsonp(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const cb = "cb_" + Math.random().toString(36).substring(2);
    const script = document.createElement("script");
    let done = false;

    function cleanup() {
      if (done) return;
      done = true;
      try { delete window[cb]; } catch (_) {}
      script.remove();
      clearTimeout(timer);
    }

    window[cb] = (data) => {
      cleanup();
      resolve(data);
    };

    script.src = url + (url.includes("?") ? "&" : "?") + "callback=" + cb;
    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP error"));
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("JSONP timeout"));
    }, timeoutMs);

    document.body.appendChild(script);
  });
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name) || "";
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function initValidacion() {
  const resultado = document.getElementById("resultado");
  const dni = (getParam("dni") || "").replace(/\D+/g, "");

  if (!dni) {
    resultado.innerHTML = `
      <div class="validacion-estado estado-inactivo">❌ Validación inválida</div>
      <div class="validacion-mensaje">No se recibió un DNI válido en el código QR.</div>
    `;
    return;
  }

  try {
    const res = await jsonp(
      `${SCRIPT_URL}?modo=qr&dni=${encodeURIComponent(dni)}&_=${Date.now()}`
    );

    if (!res || !res.ok) {
      resultado.innerHTML = `
        <div class="validacion-estado estado-inactivo">❌ Error</div>
        <div class="validacion-mensaje">No se pudo validar en este momento.</div>
      `;
      return;
    }

    if (res.valido) {
      resultado.innerHTML = `
        <div class="validacion-estado estado-activo">✅ AFILIADO ACTIVO</div>
        <div class="validacion-detalle">
          <div><strong>Nombre:</strong> ${escapeHtml(res.afiliado?.nombre || "-")}</div>
          <div><strong>DNI:</strong> ${escapeHtml(res.afiliado?.dni || "-")}</div>
          <div><strong>Estado:</strong> ${escapeHtml(res.estado || "ACTIVO")}</div>
          <div><strong>Validado:</strong> ${escapeHtml(res.fechaValidacion || "-")}</div>
        </div>
      `;
    } else {
      resultado.innerHTML = `
        <div class="validacion-estado estado-inactivo">❌ AFILIADO INACTIVO</div>
        <div class="validacion-detalle">
          <div><strong>DNI:</strong> ${escapeHtml(dni)}</div>
          <div><strong>Estado:</strong> ${escapeHtml(res.estado || "INACTIVO")}</div>
        </div>
        <div class="validacion-mensaje">
          ${escapeHtml(res.message || "El afiliado no se encuentra activo.")}
        </div>
      `;
    }
  } catch (e) {
    resultado.innerHTML = `
      <div class="validacion-estado estado-inactivo">❌ Error de conexión</div>
      <div class="validacion-mensaje">No se pudo consultar el estado del afiliado.</div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", initValidacion);