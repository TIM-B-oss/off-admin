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

let currentServer = "spb"; // По умолчанию Невский
let allAdmins = [];
let currentPanelUser = null;

// 1. ЗАГРУЗКА ДАННЫХ
async function loadAdmins() {
    try {
        const snapshot = await db.collection("admins").get();
        allAdmins = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        filterAndRender();
    } catch (e) { console.error("Ошибка загрузки:", e); }
}

function filterAndRender() {
    const tbody = document.getElementById("adminTableBody");
    const search = document.getElementById("searchInput").value.toLowerCase();
    
    tbody.innerHTML = "";

    // Фильтруем: сервер должен совпадать, либо (если сервера нет в базе) считаем его за spb
    const filtered = allAdmins.filter(a => {
        const adminCity = a.город || "spb"; // Важно: старые админы без города станут spb
        return adminCity === currentServer && a.id.toLowerCase().includes(search);
    });

    // Сортировка по полю "порядок"
    filtered.sort((a, b) => (a.порядок || 99) - (b.порядок || 99));

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#9ca3af;">Нет администраторов</td></tr>';
        return;
    }

    filtered.forEach(admin => {
        tbody.innerHTML += `
            <tr>
                <td class="nickname-cell">${admin.id}</td>
                <td class="level-cell">${admin.уровень || 0} LVL</td>
                <td><span class="status-tag">${admin.статус || '—'}</span></td>
                <td><a href="${admin.вк || '#'}" target="_blank" class="vk-btn">VK</a></td>
            </tr>
        `;
    });
}

// 2. ПЕРЕКЛЮЧЕНИЕ СЕРВЕРОВ
document.getElementById("btnSpb").onclick = () => {
    currentServer = "spb";
    document.getElementById("btnSpb").classList.add("active");
    document.getElementById("btnEkb").classList.remove("active");
    filterAndRender();
};

document.getElementById("btnEkb").onclick = () => {
    currentServer = "ekb";
    document.getElementById("btnEkb").classList.add("active");
    document.getElementById("btnSpb").classList.remove("active");
    filterAndRender();
};

// 3. ПОИСК И ТЕМА
document.getElementById("searchInput").oninput = filterAndRender;
document.getElementById("themeToggleBtn").onclick = () => {
    const theme = document.body.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", theme);
};

// 4. АДМИН-ПАНЕЛЬ
const adminPanel = document.getElementById("adminPanel");
document.getElementById("openAdminPanelBtn").onclick = () => adminPanel.style.display = "flex";
document.getElementById("closeAdminPanel").onclick = () => adminPanel.style.display = "none";

// Вход
document.getElementById("loginBtn").onclick = async () => {
    const log = document.getElementById("adminLogin").value;
    const pas = document.getElementById("adminPassword").value;
    const doc = await db.collection("panel_users").doc(log).get();

    if (doc.exists && doc.data().пароль === pas) {
        currentPanelUser = doc.data();
        document.getElementById("loginForm").style.display = "none";
        document.getElementById("adminControls").style.display = "block";
        document.getElementById("adminPanelContent").classList.add("admin-mode");
        document.getElementById("currentUserInfo").innerText = "Привет, " + currentPanelUser.имя;
    } else {
        document.getElementById("loginError").style.display = "block";
    }
};

// Выход
document.getElementById("logoutBtn").onclick = () => location.reload();

// Добавление
document.getElementById("addAdminBtn").onclick = async () => {
    const nick = document.getElementById("addNickname").value.trim();
    const city = document.getElementById("addAdminServer").value;
    if(!nick) return alert("Введите ник");

    await db.collection("admins").doc(nick).set({
        уровень: document.getElementById("addLevel").value,
        статус: document.getElementById("addStatus").value,
        вк: document.getElementById("addVk").value,
        город: city,
        порядок: 99
    });
    alert("Администратор добавлен!");
    loadAdmins();
};

// Редактирование
let currentEditId = "";
document.getElementById("loadAdminBtn").onclick = async () => {
    const nick = document.getElementById("editSearch").value.trim();
    const doc = await db.collection("admins").doc(nick).get();
    if(doc.exists) {
        currentEditId = doc.id;
        const d = doc.data();
        document.getElementById("editNickname").value = doc.id;
        document.getElementById("editLevel").value = d.уровень;
        document.getElementById("editStatus").value = d.статус;
        document.getElementById("editVk").value = d.вк;
        document.getElementById("editAdminServer").value = d.город || "spb";
        document.getElementById("editSortOrder").value = d.порядок || 99;
        document.getElementById("editFields").style.display = "block";
    } else { alert("Не найден!"); }
};

document.getElementById("updateAdminBtn").onclick = async () => {
    const newNick = document.getElementById("editNickname").value.trim();
    const data = {
        уровень: document.getElementById("editLevel").value,
        статус: document.getElementById("editStatus").value,
        вк: document.getElementById("editVk").value,
        город: document.getElementById("editAdminServer").value,
        порядок: parseInt(document.getElementById("editSortOrder").value)
    };
    if(newNick !== currentEditId) await db.collection("admins").doc(currentEditId).delete();
    await db.collection("admins").doc(newNick).set(data);
    alert("Обновлено!");
    loadAdmins();
};

document.getElementById("deleteAdminBtn").onclick = async () => {
    if(confirm("Удалить?")) {
        await db.collection("admins").doc(currentEditId).delete();
        loadAdmins();
        document.getElementById("editFields").style.display = "none";
    }
};

// СТАРТ
loadAdmins();
