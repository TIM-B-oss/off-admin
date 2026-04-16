const firebaseConfig = {
    apiKey: "AIzaSyC3uqEIX7Zee5_T9NAp5impPdK2nCPYIFo",
    authDomain: "admin-panel-site-c6658.firebaseapp.com",
    projectId: "admin-panel-site-c6658",
    storageBucket: "admin-panel-site-c6658.firebasestorage.app",
    messagingSenderId: "1007133132643",
    appId: "1:1007133132643:web:d8f203b6736fef5879b556",
    measurementId: "G-GFPJ1MLCZ5"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ===================== КОНСТАНТЫ ===================== */

const THEME_STORAGE_KEY = "siteTheme";
const ADMIN_SESSION_KEY = "panelCurrentUser";
const SERVER_STORAGE_KEY = "currentServer";

const SERVERS = {
    spb: "Невский",
    ekb: "Екатеринбург"
};

const MIN_LEVEL = 1;
const MAX_LEVEL = 8;

/* ===================== СОСТОЯНИЕ ===================== */

let currentServer = localStorage.getItem(SERVER_STORAGE_KEY) || "spb";
let allAdmins = [];
let currentEditingAdmin = null;
let currentPanelUser = null;

/* ===================== DOM ===================== */

const adminPanel = document.getElementById("adminPanel");
const adminPanelContent = document.getElementById("adminPanelContent");
const openAdminPanelBtn = document.getElementById("openAdminPanelBtn");
const closeAdminPanelBtn = document.getElementById("closeAdminPanel");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const searchInput = document.getElementById("searchInput");
const serverBadgeBtn = document.getElementById("serverBadgeBtn");

/* ===================== УТИЛИТЫ ===================== */

function showMessage(text, type = "success") {
    const el = document.getElementById("actionMessage");
    if (!el) return;

    el.textContent = text;
    el.className = `action-message ${type}`;
    el.style.display = "block";

    setTimeout(() => {
        el.style.display = "none";
    }, 4000);
}

function makeSafeDocId(value) {
    return value.trim().replace(/\s+/g, "_");
}

function normalizeLevel(value) {
    const level = parseInt(value, 10);
    if (!Number.isFinite(level)) return null;
    if (level < MIN_LEVEL || level > MAX_LEVEL) return null;
    return level;
}

function sortAdmins(admins) {
    return [...admins].sort((a, b) => {
        const orderA = Number(a.sortOrder) || 999999;
        const orderB = Number(b.sortOrder) || 999999;

        if (orderA !== orderB) return orderA - orderB;
        return (a.nickname || "").localeCompare((b.nickname || ""), "ru");
    });
}

/* ===================== СЕРВЕР ===================== */

function updateServerBadge() {
    if (!serverBadgeBtn) return;
    serverBadgeBtn.textContent = SERVERS[currentServer];
}

async function switchServer() {
    currentServer = currentServer === "spb" ? "ekb" : "spb";
    localStorage.setItem(SERVER_STORAGE_KEY, currentServer);
    updateServerBadge();
    await loadAdmins();
    showMessage(`Выбран сервер: ${SERVERS[currentServer]}`, "success");
}

if (serverBadgeBtn) {
    serverBadgeBtn.addEventListener("click", switchServer);
}

/* ===================== ЗАГРУЗКА АДМИНОВ ===================== */

function mapAdminFromDoc(doc) {
    const data = doc.data() || {};
    return {
        id: doc.id,
        nickname: doc.id,
        level: data["уровень"] ?? "",
        status: data["статус"] ?? "",
        vk: data["вк"] ?? "",
        city: data["город"] ?? "",
        sortOrder: data["порядок"] ?? 999999
    };
}

async function loadAdmins() {
    try {
        const snapshot = await db.collection("admins")
            .where("город", "==", currentServer)
            .get();

        allAdmins = sortAdmins(snapshot.docs.map(mapAdminFromDoc));
        renderAdmins(allAdmins);
    } catch (error) {
        console.error("Ошибка загрузки:", error);
        renderAdmins([]);
    }
}

function renderAdmins(admins) {
    const tbody = document.getElementById("adminTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!admins.length) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="4">Нет администраторов</td>
            </tr>
        `;
        return;
    }

    admins.forEach((admin) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td class="nickname-cell">${admin.nickname || "-"}</td>
            <td class="level-cell">${admin.level ?? "-"}</td>
            <td><span class="status-tag">${admin.status || "-"}</span></td>
            <td>
                ${admin.vk
                    ? `<a href="${admin.vk}" target="_blank" rel="noopener noreferrer" class="vk-btn">VK</a>`
                    : "—"}
            </td>
        `;

        tbody.appendChild(row);
    });
}

/* ===================== ДОБАВЛЕНИЕ ===================== */

const addAdminBtn = document.getElementById("addAdminBtn");

if (addAdminBtn) {
    addAdminBtn.addEventListener("click", async () => {
        const nickname = document.getElementById("addNickname").value.trim();
        const level = normalizeLevel(document.getElementById("addLevel").value);
        const status = document.getElementById("addStatus").value.trim();
        const vk = document.getElementById("addVk").value.trim();

        if (!nickname || !level || !status) {
            showMessage("Заполните обязательные поля. Уровень 1-8", "error");
            return;
        }

        const docId = makeSafeDocId(nickname);

        try {
            const existing = await db.collection("admins").doc(docId).get();
            if (existing.exists) {
                showMessage("Администратор уже существует", "error");
                return;
            }

            await db.collection("admins").doc(docId).set({
                "уровень": level,
                "статус": status,
                "вк": vk || "",
                "город": currentServer,
                "порядок": allAdmins.length + 1,
                "создан": firebase.firestore.FieldValue.serverTimestamp()
            });

            await loadAdmins();

            document.getElementById("addNickname").value = "";
            document.getElementById("addLevel").value = "";
            document.getElementById("addStatus").value = "";
            document.getElementById("addVk").value = "";

            showMessage("Администратор добавлен", "success");
        } catch (error) {
            console.error("Ошибка добавления:", error);
            showMessage("Ошибка добавления", "error");
        }
    });
}

/* ===================== ПОИСК ===================== */

function filterAdmins() {
    const value = (searchInput?.value || "").toLowerCase().trim();

    if (!value) {
        renderAdmins(allAdmins);
        return;
    }

    const filtered = allAdmins.filter(admin =>
        (admin.nickname || "").toLowerCase().includes(value)
    );

    renderAdmins(filtered);
}

if (searchInput) {
    searchInput.addEventListener("input", filterAdmins);
}

/* ===================== ТЕМА ===================== */

function applyTheme(theme) {
    const finalTheme = theme === "dark" ? "dark" : "light";
    document.body.setAttribute("data-theme", finalTheme);
    localStorage.setItem(THEME_STORAGE_KEY, finalTheme);
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute("data-theme") || "light";
    applyTheme(currentTheme === "dark" ? "light" : "dark");
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
}

/* ===================== ИНИЦИАЛИЗАЦИЯ ===================== */

document.addEventListener("DOMContentLoaded", async () => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "light";
    applyTheme(savedTheme);

    updateServerBadge();
    await loadAdmins();
});
