// 1. КОНФИГУРАЦИЯ FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyC3uqEIX7Zee5_T9NAp5impPdK2nCPYIFo",
    authDomain: "admin-panel-site-c6658.firebaseapp.com",
    projectId: "admin-panel-site-c6658",
    storageBucket: "admin-panel-site-c6658.firebasestorage.app",
    messagingSenderId: "1007133132643",
    appId: "1:1007133132643:web:d8f203b6736fef5879b556"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
let currentServer = "Невский";
let allAdmins = [];
let originalNick = ""; // Для корректного переименования
const SESSION_KEY = "admin_panel_session";

// 3. ФУНКЦИИ ЛОГИРОВАНИЯ
async function addLoginLog(userData, action) {
    try {
        // Создаем красивую дату для названия документа: ДД-ММ-ГГГГ_ЧЧ-ММ-СС
        const d = new Date();
        const dateForID = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}_${String(d.getHours()).padStart(2, '0')}-${String(d.getMinutes()).padStart(2, '0')}-${String(d.getSeconds()).padStart(2, '0')}`;
        
        // Формируем понятное название документа: Ник_Дата_Время
        const logID = `${userData.login}_${dateForID}`;

        // Используем .doc(logID).set(...) вместо .add(...)
        await db.collection("login_logs").doc(logID).set({
            "имя": userData.name,
            "логин": userData.login,
            "действие": action,
            "дата": firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) { 
        console.error("Ошибка записи лога:", e); 
    }
}

async function loadLoginLogs() {
    const tbody = document.getElementById("loginLogsTableBody");
    if (!tbody) return;
    try {
        const snapshot = await db.collection("login_logs").orderBy("дата", "desc").limit(40).get();
        tbody.innerHTML = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            let dateStr = "—";
            if (data.дата) {
                const d = data.дата.toDate();
                dateStr = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
            }
            tbody.innerHTML += `
                <tr>
                    <td style="font-weight:700;">${data.логин || "—"}</td>
                    <td>${data.действие || "—"}</td>
                    <td style="color:var(--muted); font-size:13px;">${dateStr}</td>
                </tr>`;
        });
    } catch (e) { console.error(e); }
}

// 4. СЕССИЯ И ИНТЕРФЕЙС
function updatePanelUI() {
    const session = localStorage.getItem(SESSION_KEY);
    const loginForm = document.getElementById("loginForm");
    const adminControls = document.getElementById("adminControls");
    const panelContent = document.getElementById("adminPanelContent");
    const userInfo = document.getElementById("currentUserInfo");

    if (session) {
        const data = JSON.parse(session);
        if (loginForm) loginForm.style.display = "none";
        if (adminControls) adminControls.style.display = "block";
        if (panelContent) { panelContent.classList.remove("login-mode"); panelContent.classList.add("admin-mode"); }
        if (userInfo) userInfo.innerText = data.name;
    } else {
        if (loginForm) loginForm.style.display = "block";
        if (adminControls) adminControls.style.display = "none";
        if (panelContent) { panelContent.classList.remove("admin-mode"); panelContent.classList.add("login-mode"); }
    }
}

// 5. РАБОТА С ТАБЛИЦЕЙ АДМИНОВ
async function loadAdmins() {
    const tbody = document.getElementById("adminTableBody");
    if (!tbody) return;
    try {
        const snapshot = await db.collection("admins").where("город", "==", currentServer).get();
        allAdmins = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // РУЧНАЯ СОРТИРОВКА
        allAdmins.sort((a, b) => (Number(a["порядок"]) || 999) - (Number(b["порядок"]) || 999));
        
        tbody.innerHTML = "";
        allAdmins.forEach(admin => {
            tbody.innerHTML += `
                <tr>
                    <td class="nickname-cell">${admin.id}</td>
                    <td>${admin["уровень"] || 1}</td>
                    <td><span class="status-tag">${admin["статус"] || "-"}</span></td>
                    <td><a href="${admin["вк"]}" target="_blank" class="vk-btn">VK</a></td>
                </tr>`;
        });
    } catch (e) { console.error(e); }
}

// 6. ОБРАБОТЧИКИ СОБЫТИЙ
document.addEventListener("DOMContentLoaded", () => {
    loadAdmins();
    updatePanelUI();

    // ВХОД
    document.getElementById("loginBtn")?.addEventListener("click", async () => {
        const log = document.getElementById("adminLogin").value.trim();
        const pas = document.getElementById("adminPassword").value.trim();
        try {
            const doc = await db.collection("panel_users").doc(log).get();
            if (doc.exists && doc.data()["пароль"] === pas) {
                const userData = { name: doc.data()["имя"] || log, login: log };
                localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
                await addLoginLog(userData, "Вход в систему");
                updatePanelUI();
            } else { alert("Неверный логин или пароль"); }
        } catch (e) { alert("Ошибка базы"); }
    });

    // ВЫХОД
    document.getElementById("logoutBtn")?.addEventListener("click", async () => {
        const session = localStorage.getItem(SESSION_KEY);
        if (session) await addLoginLog(JSON.parse(session), "Выход из системы");
        localStorage.removeItem(SESSION_KEY);
        location.reload();
    });

    // ПЕРЕКЛЮЧЕНИЕ СЕРВЕРОВ (ГЛАВНОЕ)
    document.querySelectorAll(".server-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".server-tab").forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            currentServer = tab.dataset.server;
            loadAdmins();
        });
    });

    // ДОБАВЛЕНИЕ АДМИНА
    document.getElementById("addAdminBtn")?.addEventListener("click", async () => {
        const nick = document.getElementById("addNickname").value.trim();
        if (!nick) return alert("Введите ник");
        await db.collection("admins").doc(nick).set({
            "уровень": Number(document.getElementById("addLevel").value),
            "статус": document.getElementById("addStatus").value,
            "вк": document.getElementById("addVk").value,
            "город": document.getElementById("addServer").value,
            "порядок": Number(document.getElementById("addOrder").value) || 99
        });
        alert("Успешно добавлено!");
        loadAdmins();
    });

    // РЕДАКТИРОВАНИЕ: ПОИСК
    document.getElementById("loadAdminBtn")?.addEventListener("click", async () => {
        const nick = document.getElementById("editNicknameSearch").value.trim();
        const doc = await db.collection("admins").doc(nick).get();
        if (doc.exists) {
            const d = doc.data();
            originalNick = nick;
            document.getElementById("editFields").style.display = "block";
            document.getElementById("editNickname").value = nick;
            document.getElementById("editLevel").value = d["уровень"] || "";
            document.getElementById("editStatus").value = d["статус"] || "";
            document.getElementById("editVk").value = d["вк"] || "";
            document.getElementById("editServer").value = d["город"] || "Невский";
            document.getElementById("editOrder").value = d["порядок"] || "";
        } else { alert("Не найден"); }
    });

    // РЕДАКТИРОВАНИЕ: СОХРАНИТЬ
    document.getElementById("updateAdminBtn")?.addEventListener("click", async () => {
        const newNick = document.getElementById("editNickname").value.trim();
        const data = {
            "уровень": Number(document.getElementById("editLevel").value),
            "статус": document.getElementById("editStatus").value,
            "вк": document.getElementById("editVk").value,
            "город": document.getElementById("editServer").value,
            "порядок": Number(document.getElementById("editOrder").value) || 99
        };
        if (newNick !== originalNick) {
            await db.collection("admins").doc(newNick).set(data);
            await db.collection("admins").doc(originalNick).delete();
        } else {
            await db.collection("admins").doc(originalNick).set(data, { merge: true });
        }
        alert("Данные обновлены!");
        loadAdmins();
    });

    // УДАЛЕНИЕ
    document.getElementById("deleteAdminBtn")?.addEventListener("click", async () => {
        if (!originalNick) return;
        if (confirm(`Удалить ${originalNick}?`)) {
            await db.collection("admins").doc(originalNick).delete();
            document.getElementById("editFields").style.display = "none";
            loadAdmins();
        }
    });

    // ПОИСК (ГЛАВНЫЙ)
    document.getElementById("searchInput")?.addEventListener("input", (e) => {
        const val = e.target.value.toLowerCase();
        const filtered = allAdmins.filter(a => a.id.toLowerCase().includes(val));
        const tbody = document.getElementById("adminTableBody");
        tbody.innerHTML = "";
        filtered.forEach(admin => {
            tbody.innerHTML += `<tr><td class="nickname-cell">${admin.id}</td><td>${admin["уровень"] || 1}</td><td><span class="status-tag">${admin["статус"] || "-"}</span></td><td><a href="${admin["вк"]}" target="_blank" class="vk-btn">VK</a></td></tr>`;
        });
    });

    // ВКЛАДКИ ПАНЕЛИ
    document.getElementById("adminsTabBtn")?.addEventListener("click", () => {
        document.getElementById("adminsTab").style.display = "block";
        document.getElementById("logsTab").style.display = "none";
        document.getElementById("adminsTabBtn").classList.add("active");
        document.getElementById("logsTabBtn").classList.remove("active");
    });

    document.getElementById("logsTabBtn")?.addEventListener("click", () => {
        document.getElementById("adminsTab").style.display = "none";
        document.getElementById("logsTab").style.display = "block";
        document.getElementById("logsTabBtn").classList.add("active");
        document.getElementById("adminsTabBtn").classList.remove("active");
        loadLoginLogs();
    });

    // ТЕМА И ОТКРЫТИЕ ПАНЕЛИ
    document.getElementById("themeToggleBtn")?.addEventListener("click", () => {
        const body = document.body;
        const theme = body.getAttribute("data-theme") === "dark" ? "light" : "dark";
        body.setAttribute("data-theme", theme);
    });

    document.getElementById("openAdminPanelBtn")?.addEventListener("click", () => {
        updatePanelUI();
        document.getElementById("adminPanel").style.display = "flex";
    });

    document.getElementById("closeAdminPanel")?.addEventListener("click", () => {
        document.getElementById("adminPanel").style.display = "none";
    });
});
