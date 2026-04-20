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

let currentServer = "Невский";
let allAdmins = [];
let originalNick = ""; // Переменная для хранения ника до изменения
const SESSION_KEY = "admin_panel_session";

// ПРОВЕРКА СЕССИИ
function checkSession() {
    const savedUser = localStorage.getItem(SESSION_KEY);
    if (savedUser) {
        const userData = JSON.parse(savedUser);
        showAdminMode(userData.name);
    }
}

function showAdminMode(userName) {
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("adminControls").style.display = "block";
    document.getElementById("adminPanelContent").classList.add("admin-mode");
    document.getElementById("currentUserInfo").innerText = userName;
}

// ЗАГРУЗКА
async function loadAdmins() {
    const tbody = document.getElementById("adminTableBody");
    if (!tbody) return;
    try {
        const snapshot = await db.collection("admins").where("город", "==", currentServer).get();
        allAdmins = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allAdmins.sort((a, b) => (Number(a["порядок"]) || 99) - (Number(b["порядок"]) || 99));
        renderTable(allAdmins);
    } catch (err) { console.error(err); }
}

function renderTable(data) {
    const tbody = document.getElementById("adminTableBody");
    tbody.innerHTML = "";
    data.forEach(admin => {
        tbody.innerHTML += `
            <tr>
                <td class="nickname-cell">${admin.id}</td>
                <td>${admin["уровень"] || 1}</td>
                <td><span class="status-tag">${admin["статус"] || "-"}</span></td>
                <td><a href="${admin["вк"]}" target="_blank" class="vk-btn">VK</a></td>
            </tr>`;
    });
}

document.addEventListener("DOMContentLoaded", () => {
    loadAdmins();
    checkSession();

    // ВХОД
    document.getElementById("loginBtn")?.addEventListener("click", async () => {
        const log = document.getElementById("adminLogin").value.trim();
        const pas = document.getElementById("adminPassword").value.trim();
        const doc = await db.collection("panel_users").doc(log).get();
        if (doc.exists && doc.data()["пароль"] === pas) {
            const name = doc.data()["имя"] || log;
            localStorage.setItem(SESSION_KEY, JSON.stringify({ name: name }));
            showAdminMode(name);
        } else { alert("Ошибка входа"); }
    });

    // ВЫХОД
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        localStorage.removeItem(SESSION_KEY);
        location.reload();
    });

    // ДОБАВЛЕНИЕ (используем set вместо update для стабильности)
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
        alert("Добавлен!");
        loadAdmins();
    });

    // РЕДАКТИРОВАНИЕ: ЗАГРУЗКА ДАННЫХ
    document.getElementById("loadAdminBtn")?.addEventListener("click", async () => {
        const nick = document.getElementById("editNicknameSearch").value.trim();
        const doc = await db.collection("admins").doc(nick).get();
        if (doc.exists) {
            const data = doc.data();
            originalNick = nick; // Запоминаем старый ник
            document.getElementById("editFields").style.display = "block";
            document.getElementById("editNickname").value = nick;
            document.getElementById("editLevel").value = data["уровень"] || "";
            document.getElementById("editStatus").value = data["статус"] || "";
            document.getElementById("editVk").value = data["вк"] || "";
            document.getElementById("editServer").value = data["город"] || "Невский";
            document.getElementById("editOrder").value = data["порядок"] || "";
        } else { alert("Администратор не найден"); }
    });

    // РЕДАКТИРОВАНИЕ: СОХРАНЕНИЕ
    document.getElementById("updateAdminBtn")?.addEventListener("click", async () => {
        const newNick = document.getElementById("editNickname").value.trim();
        if (!newNick) return alert("Ник не может быть пустым");

        const updatedData = {
            "уровень": Number(document.getElementById("editLevel").value),
            "статус": document.getElementById("editStatus").value,
            "вк": document.getElementById("editVk").value,
            "город": document.getElementById("editServer").value,
            "порядок": Number(document.getElementById("editOrder").value) || 99
        };

        try {
            // Если ник изменился, нужно создать новый документ и удалить старый
            if (newNick !== originalNick) {
                await db.collection("admins").doc(newNick).set(updatedData);
                await db.collection("admins").doc(originalNick).delete();
                originalNick = newNick;
            } else {
                // Если ник тот же, просто обновляем (используем set с merge для надежности)
                await db.collection("admins").doc(originalNick).set(updatedData, { merge: true });
            }
            alert("Данные успешно обновлены!");
            loadAdmins();
        } catch (e) {
            console.error(e);
            alert("Ошибка при сохранении");
        }
    });

    // УДАЛЕНИЕ
    document.getElementById("deleteAdminBtn")?.addEventListener("click", async () => {
        if (!originalNick) return;
        if (confirm(`Вы уверены, что хотите удалить ${originalNick}?`)) {
            await db.collection("admins").doc(originalNick).delete();
            document.getElementById("editFields").style.display = "none";
            loadAdmins();
        }
    });

    // ПОИСК
    document.getElementById("searchInput")?.addEventListener("input", (e) => {
        const val = e.target.value.toLowerCase();
        const filtered = allAdmins.filter(a => a.id.toLowerCase().includes(val));
        renderTable(filtered);
    });

    // СЕРВЕРЫ
    document.querySelectorAll(".server-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".server-tab").forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            currentServer = tab.dataset.server;
            loadAdmins();
        });
    });

    // ТЕМА И ПАНЕЛЬ
    document.getElementById("themeToggleBtn")?.addEventListener("click", () => {
        const body = document.body;
        const theme = body.getAttribute("data-theme") === "dark" ? "light" : "dark";
        body.setAttribute("data-theme", theme);
    });

    document.getElementById("openAdminPanelBtn")?.addEventListener("click", () => document.getElementById("adminPanel").style.display = "flex");
    document.getElementById("closeAdminPanel")?.addEventListener("click", () => document.getElementById("adminPanel").style.display = "none");
});
