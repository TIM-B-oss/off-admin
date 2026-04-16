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

// ЗАГРУЗКА ДАННЫХ
async function loadAdmins() {
    const snapshot = await db.collection("admins").get();
    allAdmins = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById("adminTableBody");
    const search = document.getElementById("searchInput").value.toLowerCase();
    
    tbody.innerHTML = "";
    
    const filtered = allAdmins.filter(a => {
        // Если у админа нет поля город, считаем его за Невский (spb)
        const city = a.город || "spb";
        return city === currentServer && a.id.toLowerCase().includes(search);
    });

    filtered.sort((a, b) => (a.порядок || 99) - (b.порядок || 99));

    filtered.forEach(admin => {
        tbody.innerHTML += `
            <tr>
                <td class="nickname-cell">${admin.id}</td>
                <td class="level-cell">${admin.уровень} LVL</td>
                <td><span class="status-tag">${admin.статус}</span></td>
                <td><a href="${admin.вк}" target="_blank" class="vk-btn">VK</a></td>
            </tr>
        `;
    });
}

// ПЕРЕКЛЮЧЕНИЕ СЕРВЕРА
document.getElementById("btnSpb").onclick = () => {
    currentServer = "spb";
    document.getElementById("btnSpb").classList.add("active");
    document.getElementById("btnEkb").classList.remove("active");
    renderTable();
};

document.getElementById("btnEkb").onclick = () => {
    currentServer = "ekb";
    document.getElementById("btnEkb").classList.add("active");
    document.getElementById("btnSpb").classList.remove("active");
    renderTable();
};

// ПОИСК
document.getElementById("searchInput").oninput = renderTable;

// ТЕМА
document.getElementById("themeToggleBtn").onclick = () => {
    const theme = document.body.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", theme);
};

// АДМИН ПАНЕЛЬ (Вход)
document.getElementById("openAdminPanelBtn").onclick = () => {
    document.getElementById("adminPanel").style.display = "flex";
};
document.getElementById("closeAdminPanel").onclick = () => {
    document.getElementById("adminPanel").style.display = "none";
};

document.getElementById("loginBtn").onclick = async () => {
    const login = document.getElementById("adminLogin").value;
    const pass = document.getElementById("adminPassword").value;
    const doc = await db.collection("panel_users").doc(login).get();

    if (doc.exists && doc.data().пароль === pass) {
        document.getElementById("loginForm").style.display = "none";
        document.getElementById("adminControls").style.display = "block";
        document.getElementById("adminPanelContent").className = "admin-panel-content admin-mode";
        document.getElementById("currentUserInfo").innerText = "Админ: " + doc.data().имя;
    } else {
        alert("Ошибка входа!");
    }
};

// ДОБАВЛЕНИЕ
document.getElementById("addAdminBtn").onclick = async () => {
    const nick = document.getElementById("addNickname").value;
    const city = document.getElementById("actionServer").value;
    await db.collection("admins").doc(nick).set({
        уровень: document.getElementById("addLevel").value,
        статус: document.getElementById("addStatus").value,
        вк: document.getElementById("addVk").value,
        город: city,
        порядок: 99
    });
    alert("Добавлен!");
    loadAdmins();
};

// ИМПОРТ
document.getElementById("bulkImportBtn").onclick = async () => {
    const text = document.getElementById("bulkAdminText").value;
    const city = document.getElementById("actionServer").value;
    const lines = text.split("\n");
    for (let line of lines) {
        const [n, l, s, v] = line.split("\t");
        if (n) {
            await db.collection("admins").doc(n.trim()).set({
                уровень: l, статус: s, вк: v, город: city, порядок: 99
            });
        }
    }
    alert("Готово!");
    loadAdmins();
};

// РЕДАКТИРОВАНИЕ
let currentEditId = "";
document.getElementById("loadAdminBtn").onclick = async () => {
    const nick = document.getElementById("editNicknameSearch").value;
    const doc = await db.collection("admins").doc(nick).get();
    if (doc.exists) {
        const d = doc.data();
        currentEditId = doc.id;
        document.getElementById("editNickname").value = doc.id;
        document.getElementById("editLevel").value = d.уровень;
        document.getElementById("editStatus").value = d.статус;
        document.getElementById("editVk").value = d.вк;
        document.getElementById("editServer").value = d.город || "spb";
        document.getElementById("editSortOrder").value = d.порядок || 99;
        document.getElementById("editFields").style.display = "block";
    }
};

document.getElementById("updateAdminBtn").onclick = async () => {
    const newNick = document.getElementById("editNickname").value;
    const data = {
        уровень: document.getElementById("editLevel").value,
        статус: document.getElementById("editStatus").value,
        вк: document.getElementById("editVk").value,
        город: document.getElementById("editServer").value,
        порядок: parseInt(document.getElementById("editSortOrder").value)
    };
    if (newNick !== currentEditId) await db.collection("admins").doc(currentEditId).delete();
    await db.collection("admins").doc(newNick).set(data);
    alert("Обновлено!");
    loadAdmins();
};

document.getElementById("deleteAdminBtn").onclick = async () => {
    await db.collection("admins").doc(currentEditId).delete();
    loadAdmins();
    document.getElementById("editFields").style.display = "none";
};

loadAdmins();
