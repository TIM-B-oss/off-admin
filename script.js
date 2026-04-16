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

// ПЕРЕМЕННЫЕ
let currentServer = "spb"; 
let allAdmins = [];
let currentPanelUser = null;
let currentEditingAdmin = null;

const THEME_STORAGE_KEY = "siteTheme";
const ADMIN_SESSION_KEY = "panelCurrentUser";

// ЭЛЕМЕНТЫ
const adminTableBody = document.getElementById("adminTableBody");
const searchInput = document.getElementById("searchInput");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const adminPanel = document.getElementById("adminPanel");
const adminPanelContent = document.getElementById("adminPanelContent");

// 1. ЗАГРУЗКА АДМИНОВ
async function loadAdmins() {
    try {
        // Загружаем всех админов
        const snapshot = await db.collection("admins").get();
        
        allAdmins = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        filterAndRender();
    } catch (error) {
        console.error("Ошибка загрузки:", error);
    }
}

// Фильтрация по городу и поиску
function filterAndRender() {
    const searchTerm = searchInput.value.toLowerCase();
    
    const filtered = allAdmins.filter(admin => {
        // Если у админа нет поля город, считаем его за spb (чтобы старые не пропали)
        const adminCity = admin.город || "spb";
        const matchesCity = adminCity === currentServer;
        const matchesSearch = admin.id.toLowerCase().includes(searchTerm);
        return matchesCity && matchesSearch;
    });

    // Сортировка по порядку
    filtered.sort((a, b) => (a.порядок || 99) - (b.порядок || 99));

    renderTable(filtered);
}

function renderTable(data) {
    adminTableBody.innerHTML = "";
    if (data.length === 0) {
        adminTableBody.innerHTML = '<tr><td colspan="4" class="muted-cell" style="text-align:center; padding:30px;">Нет данных</td></tr>';
        return;
    }

    data.forEach(admin => {
        const row = `
            <tr>
                <td class="nickname-cell">${admin.id}</td>
                <td class="level-cell">${admin.уровень || 0} LVL</td>
                <td><span class="status-tag">${admin.статус || '—'}</span></td>
                <td><a href="${admin.вк || '#'}" target="_blank" class="vk-btn">VK</a></td>
            </tr>
        `;
        adminTableBody.insertAdjacentHTML("beforeend", row);
    });
}

// 2. ПЕРЕКЛЮЧЕНИЕ ТЕМЫ
function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
}

themeToggleBtn.addEventListener("click", () => {
    const isDark = document.body.getAttribute("data-theme") === "dark";
    applyTheme(isDark ? "light" : "dark");
});

// 3. ПЕРЕКЛЮЧЕНИЕ СЕРВЕРОВ НА ГЛАВНОЙ
document.querySelectorAll(".server-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".server-tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentServer = btn.dataset.server;
        filterAndRender();
    });
});

// 4. ВХОД В АДМИНКУ
document.getElementById("openAdminPanelBtn").addEventListener("click", () => {
    adminPanel.style.display = "flex";
    const saved = localStorage.getItem(ADMIN_SESSION_KEY);
    if (saved) {
        currentPanelUser = JSON.parse(saved);
        showAdminControls();
    }
});

document.getElementById("closeAdminPanel").addEventListener("click", () => {
    adminPanel.style.display = "none";
});

document.getElementById("loginBtn").addEventListener("click", async () => {
    const log = document.getElementById("adminLogin").value;
    const pas = document.getElementById("adminPassword").value;
    
    const doc = await db.collection("panel_users").doc(log).get();
    if (doc.exists && doc.data().пароль === pas) {
        currentPanelUser = { имя: doc.data().имя, логин: log };
        localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(currentPanelUser));
        showAdminControls();
    } else {
        document.getElementById("loginError").textContent = "Неверные данные!";
        document.getElementById("loginError").classList.add("show");
    }
});

function showAdminControls() {
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("adminControls").style.display = "block";
    adminPanelContent.classList.remove("login-mode");
    adminPanelContent.classList.add("admin-mode");
    document.getElementById("currentUserInfo").textContent = `Вы вошли как: ${currentPanelUser.имя}`;
}

document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    location.reload();
});

// 5. УПРАВЛЕНИЕ АДМИНАМИ
document.getElementById("addAdminBtn").addEventListener("click", async () => {
    const nick = document.getElementById("addNickname").value.trim();
    const city = document.getElementById("addServer").value;
    const data = {
        уровень: document.getElementById("addLevel").value,
        статус: document.getElementById("addStatus").value,
        вк: document.getElementById("addVk").value,
        город: city,
        порядок: 99
    };
    await db.collection("admins").doc(nick).set(data);
    alert("Добавлен!");
    loadAdmins();
});

document.getElementById("loadAdminBtn").addEventListener("click", async () => {
    const nick = document.getElementById("editNicknameSearch").value.trim();
    const doc = await db.collection("admins").doc(nick).get();
    if (doc.exists) {
        const d = doc.data();
        currentEditingAdmin = { id: doc.id, ...d };
        document.getElementById("editNickname").value = doc.id;
        document.getElementById("editLevel").value = d.уровень;
        document.getElementById("editStatus").value = d.статус;
        document.getElementById("editVk").value = d.вк;
        document.getElementById("editServer").value = d.город || "spb";
        document.getElementById("editSortOrder").value = d.порядок || 99;
        document.getElementById("editFields").style.display = "block";
    }
});

document.getElementById("updateAdminBtn").addEventListener("click", async () => {
    const newNick = document.getElementById("editNickname").value.trim();
    const data = {
        уровень: document.getElementById("editLevel").value,
        статус: document.getElementById("editStatus").value,
        вк: document.getElementById("editVk").value,
        город: document.getElementById("editServer").value,
        порядок: parseInt(document.getElementById("editSortOrder").value)
    };
    if (newNick !== currentEditingAdmin.id) {
        await db.collection("admins").doc(currentEditingAdmin.id).delete();
    }
    await db.collection("admins").doc(newNick).set(data);
    alert("Обновлено!");
    loadAdmins();
});

document.getElementById("deleteAdminBtn").addEventListener("click", async () => {
    if(confirm("Удалить?")) {
        await db.collection("admins").doc(currentEditingAdmin.id).delete();
        loadAdmins();
        document.getElementById("editFields").style.display="none";
    }
});

// Массовый импорт
document.getElementById("bulkImportBtn").addEventListener("click", async () => {
    const text = document.getElementById("bulkAdminText").value;
    const city = document.getElementById("bulkServer").value;
    const lines = text.split("\n");
    for (let line of lines) {
        const [n, l, s, v] = line.split("\t");
        if (n) {
            await db.collection("admins").doc(n.trim()).set({
                уровень: l, статус: s, вк: v, город: city, порядок: 99
            });
        }
    }
    alert("Импорт завершен!");
    loadAdmins();
});

// ИНИЦИАЛИЗАЦИЯ
document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "light";
    applyTheme(savedTheme);
    loadAdmins();
});

searchInput.addEventListener("input", filterAndRender);
