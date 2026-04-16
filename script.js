// ВСТАВЬ СЮДА СВОЙ firebaseConfig
const firebaseConfig = {
    apiKey: "твой_ключ",
    authDomain: "твой_домен",
    projectId: "твой_ид",
    storageBucket: "твой_бакет",
    messagingSenderId: "твой_сендер",
    appId: "твой_апп_ид"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Переменная текущего сервера
let currentServer = "spb"; 

const THEME_STORAGE_KEY = "siteTheme";
const ADMIN_SESSION_KEY = "panelCurrentUser";

let allAdmins = [];
let currentEditingAdmin = null;

// Элементы
const adminTableBody = document.getElementById("adminTableBody");
const searchInput = document.getElementById("searchInput");

// Загрузка админов с фильтром по серверу
async function loadAdmins() {
    try {
        const snapshot = await db.collection("admins")
            .where("город", "==", currentServer) // Фильтр по текущему серверу
            .get();

        allAdmins = snapshot.docs.map(doc => {
            const data = doc.data();
            return { id: doc.id, nickname: doc.id, ...data };
        });

        // Сортировка по полю "порядок"
        allAdmins.sort((a, b) => (a.порядок || 99) - (b.порядок || 99));
        
        renderAdmins(allAdmins);
    } catch (error) {
        console.error("Ошибка загрузки:", error);
    }
}

function renderAdmins(admins) {
    adminTableBody.innerHTML = "";
    if (admins.length === 0) {
        adminTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Нет данных</td></tr>';
        return;
    }

    admins.forEach(admin => {
        const row = `
            <tr>
                <td class="nickname-cell">${admin.nickname}</td>
                <td class="level-cell">${admin.уровень} LVL</td>
                <td><span class="status-tag">${admin.статус}</span></td>
                <td><a href="${admin.вк}" target="_blank" class="vk-btn">VK</a></td>
            </tr>
        `;
        adminTableBody.insertAdjacentHTML("beforeend", row);
    });
}

// Переключение серверов на главной
document.querySelectorAll('.server-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.server-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentServer = btn.dataset.server;
        loadAdmins();
    });
});

// Добавление админа
document.getElementById("addAdminBtn").addEventListener("click", async () => {
    const server = document.getElementById("addServer").value;
    const nick = document.getElementById("addNickname").value.trim();
    const lvl = parseInt(document.getElementById("addLevel").value);
    const status = document.getElementById("addStatus").value.trim();
    const vk = document.getElementById("addVk").value.trim();

    if (!nick || !lvl || !status) return alert("Заполните поля!");

    try {
        await db.collection("admins").doc(nick).set({
            "уровень": lvl,
            "статус": status,
            "вк": vk,
            "город": server,
            "порядок": 99
        });
        alert("Добавлен!");
        loadAdmins();
    } catch (e) { alert("Ошибка!"); }
});

// Загрузка для редактирования
document.getElementById("loadAdminBtn").addEventListener("click", async () => {
    const nick = document.getElementById("editNicknameSearch").value.trim();
    const doc = await db.collection("admins").doc(nick).get();

    if (doc.exists) {
        const data = doc.data();
        currentEditingAdmin = { id: doc.id, ...data };
        document.getElementById("editNickname").value = doc.id;
        document.getElementById("editServer").value = data.город || "spb";
        document.getElementById("editLevel").value = data.уровень;
        document.getElementById("editStatus").value = data.статус;
        document.getElementById("editVk").value = data.вк;
        document.getElementById("editSortOrder").value = data.порядок || 99;
        document.getElementById("editFields").style.display = "block";
    } else {
        alert("Не найден!");
    }
});

// Обновление
document.getElementById("updateAdminBtn").addEventListener("click", async () => {
    if (!currentEditingAdmin) return;
    const nick = document.getElementById("editNickname").value.trim();
    const server = document.getElementById("editServer").value;
    
    const data = {
        "уровень": parseInt(document.getElementById("editLevel").value),
        "статус": document.getElementById("editStatus").value.trim(),
        "вк": document.getElementById("editVk").value.trim(),
        "город": server,
        "порядок": parseInt(document.getElementById("editSortOrder").value)
    };

    try {
        // Если ник изменился, удаляем старый и создаем новый
        if (nick !== currentEditingAdmin.id) {
            await db.collection("admins").doc(currentEditingAdmin.id).delete();
        }
        await db.collection("admins").doc(nick).set(data);
        alert("Обновлено!");
        document.getElementById("editFields").style.display = "none";
        loadAdmins();
    } catch (e) { alert("Ошибка!"); }
});

// Удаление
document.getElementById("deleteAdminBtn").addEventListener("click", async () => {
    if (!confirm("Удалить?")) return;
    await db.collection("admins").doc(currentEditingAdmin.id).delete();
    document.getElementById("editFields").style.display = "none";
    loadAdmins();
});

// Поиск
searchInput.addEventListener("input", () => {
    const val = searchInput.value.toLowerCase();
    const filtered = allAdmins.filter(a => a.nickname.toLowerCase().includes(val));
    renderAdmins(filtered);
});

// Остальные функции (тема, вход, логи) оставь из своего старого скрипта.
// Не забудь вызвать loadAdmins() при старте.
document.addEventListener("DOMContentLoaded", loadAdmins);
