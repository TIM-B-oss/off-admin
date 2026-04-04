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

const SERVER_CITY = "spb";
const THEME_STORAGE_KEY = "siteTheme";
const ADMIN_SESSION_KEY = "panelCurrentUser";
const MIN_LEVEL = 1;
const MAX_LEVEL = 8;

let allAdmins = [];
let currentEditingAdmin = null;
let currentPanelUser = null;

const adminPanel = document.getElementById("adminPanel");
const adminPanelContent = document.getElementById("adminPanelContent");
const openAdminPanelBtn = document.getElementById("openAdminPanelBtn");
const closeAdminPanelBtn = document.getElementById("closeAdminPanel");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const searchInput = document.getElementById("searchInput");
const serverBadgeBtn = document.getElementById("serverBadgeBtn");
const adminsTabBtn = document.getElementById("adminsTabBtn");
const logsTabBtn = document.getElementById("logsTabBtn");
const adminsTab = document.getElementById("adminsTab");
const logsTab = document.getElementById("logsTab");
const clearLoginLogsBtn = document.getElementById("clearLoginLogsBtn");

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

function sortAdmins(admins) {
    return [...admins].sort((a, b) => {
        const orderA = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : 999999;
        const orderB = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 999999;

        if (orderA !== orderB) {
            return orderA - orderB;
        }

        return (a.nickname || "").localeCompare((b.nickname || ""), "ru");
    });
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

        const nicknameCell = document.createElement("td");
        nicknameCell.className = "nickname-cell";
        nicknameCell.textContent = admin.nickname || "-";

        const levelCell = document.createElement("td");
        levelCell.className = "level-cell";
        levelCell.textContent = admin.level ?? "-";

        const statusCell = document.createElement("td");
        const statusTag = document.createElement("span");
        statusTag.className = "status-tag";
        statusTag.textContent = admin.status || "-";
        statusCell.appendChild(statusTag);

        const vkCell = document.createElement("td");
        if (admin.vk) {
            const link = document.createElement("a");
            link.href = admin.vk;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.className = "vk-btn";
            link.textContent = "VK";
            vkCell.appendChild(link);
        } else {
            vkCell.textContent = "—";
            vkCell.className = "muted-cell";
        }

        row.appendChild(nicknameCell);
        row.appendChild(levelCell);
        row.appendChild(statusCell);
        row.appendChild(vkCell);

        tbody.appendChild(row);
    });
}

function applyTheme(theme) {
    const finalTheme = theme === "dark" ? "dark" : "light";
    document.body.setAttribute("data-theme", finalTheme);
    localStorage.setItem(THEME_STORAGE_KEY, finalTheme);
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute("data-theme") || "light";
    applyTheme(currentTheme === "dark" ? "light" : "dark");
}

function formatDateTime(value) {
    if (!value) return "—";

    let date;
    if (value.toDate) {
        date = value.toDate();
    } else {
        date = new Date(value);
    }

    if (isNaN(date.getTime())) return "—";
    return date.toLocaleString("ru-RU");
}

function renderLoginLogs(logs) {
    const tbody = document.getElementById("loginLogsTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!logs.length) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">Нет логов входа</td>
            </tr>
        `;
        return;
    }

    logs.forEach((log) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${log["имя"] || "—"}</td>
            <td>${log["логин"] || "—"}</td>
            <td>${log["роль"] || "—"}</td>
            <td>${log["действие"] || "—"}</td>
            <td>${formatDateTime(log["дата"])}</td>
        `;
        tbody.appendChild(row);
    });
}

async function loadLoginLogs() {
    try {
        const snapshot = await db.collection("login_logs")
            .orderBy("дата", "desc")
            .limit(50)
            .get();

        const logs = snapshot.docs.map(doc => doc.data());
        renderLoginLogs(logs);
    } catch (error) {
        console.error("Ошибка загрузки логов:", error);
        renderLoginLogs([]);
    }
}

async function addLoginLog(userData, action = "Вход в админ-панель") {
    try {
        const login = makeSafeDocId(userData["логин"] || "user");
        const now = new Date();

        const day = String(now.getDate()).padStart(2, "0");
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");

        const logId = `${login}_${day}-${month}-${year}_${hours}-${minutes}-${seconds}`;

        await db.collection("login_logs").doc(logId).set({
            "имя": userData["имя"] || "",
            "логин": userData["логин"] || "",
            "роль": userData["роль"] || "",
            "действие": action,
            "дата": firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Ошибка записи лога:", error);
    }
}

async function loadAdmins() {
    try {
        const snapshot = await db.collection("admins")
            .where("город", "==", SERVER_CITY)
            .get();

        allAdmins = snapshot.docs.map(mapAdminFromDoc);
        allAdmins = sortAdmins(allAdmins);
        renderAdmins(allAdmins);
    } catch (error) {
        console.error("Ошибка загрузки:", error);
        renderAdmins([]);
    }
}

async function normalizeSortOrders() {
    const snapshot = await db.collection("admins")
        .where("город", "==", SERVER_CITY)
        .get();

    const admins = snapshot.docs.map(mapAdminFromDoc);
    const sorted = sortAdmins(admins);
    const batch = db.batch();
    let changed = false;

    sorted.forEach((admin, index) => {
        const correctOrder = index + 1;
        if (Number(admin.sortOrder) !== correctOrder) {
            batch.update(db.collection("admins").doc(admin.id), {
                "порядок": correctOrder
            });
            changed = true;
        }
    });

    if (changed) {
        await batch.commit();
    }
}

async function moveAdminToPosition(adminId, targetPosition) {
    const snapshot = await db.collection("admins")
        .where("город", "==", SERVER_CITY)
        .get();

    let admins = snapshot.docs.map(mapAdminFromDoc);
    admins = sortAdmins(admins);

    const currentIndex = admins.findIndex((admin) => admin.id === adminId);
    if (currentIndex === -1) return;

    const movedAdmin = admins[currentIndex];
    admins.splice(currentIndex, 1);

    let newIndex = targetPosition - 1;
    if (newIndex < 0) newIndex = 0;
    if (newIndex > admins.length) newIndex = admins.length;

    admins.splice(newIndex, 0, movedAdmin);

    const batch = db.batch();

    admins.forEach((admin, index) => {
        batch.update(db.collection("admins").doc(admin.id), {
            "порядок": index + 1
        });
    });

    await batch.commit();
}

function updateCurrentUserInfo() {
    const currentUserInfo = document.getElementById("currentUserInfo");
    if (!currentUserInfo) return;

    if (!currentPanelUser) {
        currentUserInfo.textContent = "";
        return;
    }

    currentUserInfo.textContent = `${currentPanelUser["имя"] || "Без имени"} (${currentPanelUser["логин"] || ""}) — ${currentPanelUser["роль"] || "Без роли"}`;
}

function setLoggedInState() {
    const loginForm = document.getElementById("loginForm");
    const adminControls = document.getElementById("adminControls");
    const loginError = document.getElementById("loginError");

    if (loginForm) loginForm.style.display = "none";
    if (adminControls) adminControls.style.display = "block";
    if (loginError) loginError.textContent = "";

    if (adminPanelContent) {
        adminPanelContent.classList.remove("login-mode");
        adminPanelContent.classList.add("admin-mode");
    }

    updateCurrentUserInfo();
}

function setLoggedOutState() {
    const loginForm = document.getElementById("loginForm");
    const adminControls = document.getElementById("adminControls");
    const loginInput = document.getElementById("adminLogin");
    const passwordInput = document.getElementById("adminPassword");
    const loginError = document.getElementById("loginError");

    if (loginForm) loginForm.style.display = "block";
    if (adminControls) adminControls.style.display = "none";
    if (loginInput) loginInput.value = "";
    if (passwordInput) passwordInput.value = "";
    if (loginError) loginError.textContent = "";

    if (adminPanelContent) {
        adminPanelContent.classList.remove("admin-mode");
        adminPanelContent.classList.add("login-mode");
    }

    currentPanelUser = null;
    localStorage.removeItem(ADMIN_SESSION_KEY);
}

function filterAdmins() {
    const value = (searchInput?.value || "").trim().toLowerCase();

    if (!value) {
        renderAdmins(sortAdmins(allAdmins));
        return;
    }

    const filtered = allAdmins.filter((admin) =>
        (admin.nickname || "").toLowerCase().includes(value)
    );

    renderAdmins(sortAdmins(filtered));
}

function activateTab(tabName) {
    if (tabName === "logs") {
        adminsTabBtn?.classList.remove("active");
        logsTabBtn?.classList.add("active");
        if (adminsTab) adminsTab.style.display = "none";
        if (logsTab) logsTab.style.display = "block";
        loadLoginLogs();
    } else {
        logsTabBtn?.classList.remove("active");
        adminsTabBtn?.classList.add("active");
        if (logsTab) logsTab.style.display = "none";
        if (adminsTab) adminsTab.style.display = "block";
    }
}

if (adminsTabBtn) {
    adminsTabBtn.addEventListener("click", () => activateTab("admins"));
}

if (logsTabBtn) {
    logsTabBtn.addEventListener("click", () => activateTab("logs"));
}

if (clearLoginLogsBtn) {
    clearLoginLogsBtn.addEventListener("click", async () => {
        if (!confirm("Удалить все логи входа из базы данных?")) return;

        try {
            const snapshot = await db.collection("login_logs").get();
            const batch = db.batch();

            snapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            await loadLoginLogs();
            showMessage("Логи входа удалены из базы данных", "success");
        } catch (error) {
            console.error("Ошибка очистки логов:", error);
            showMessage("Ошибка очистки логов", "error");
        }
    });
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
}

if (serverBadgeBtn) {
    serverBadgeBtn.addEventListener("click", () => {
        showMessage("Сейчас доступен только сервер Санкт-Петербург", "success");
    });
}

if (openAdminPanelBtn) {
    openAdminPanelBtn.addEventListener("click", () => {
        adminPanel.style.display = "flex";

        const savedUser = localStorage.getItem(ADMIN_SESSION_KEY);
        if (savedUser) {
            currentPanelUser = JSON.parse(savedUser);
            setLoggedInState();
        } else {
            setLoggedOutState();
        }
    });
}

if (closeAdminPanelBtn) {
    closeAdminPanelBtn.addEventListener("click", () => {
        adminPanel.style.display = "none";
    });
}

if (adminPanel) {
    adminPanel.addEventListener("click", (e) => {
        if (e.target === adminPanel) {
            adminPanel.style.display = "none";
        }
    });
}

if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
        const loginInput = document.getElementById("adminLogin");
        const passwordInput = document.getElementById("adminPassword");
        const loginError = document.getElementById("loginError");

        const login = loginInput?.value.trim();
        const password = passwordInput?.value.trim();

        if (!login || !password) {
            loginError.textContent = "Введите логин и пароль";
            return;
        }

        try {
            const doc = await db.collection("panel_users").doc(login).get();

            if (!doc.exists) {
                loginError.textContent = "Пользователь не найден";
                return;
            }

            const userData = doc.data() || {};

            if (userData["активен"] === false) {
                loginError.textContent = "Этот аккаунт отключён";
                return;
            }

            if ((userData["пароль"] || "") !== password) {
                loginError.textContent = "Неверный пароль";
                return;
            }

            currentPanelUser = {
                "логин": userData["логин"] || login,
                "имя": userData["имя"] || login,
                "роль": userData["роль"] || "Пользователь"
            };

            localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(currentPanelUser));
            setLoggedInState();
            activateTab("admins");
            await addLoginLog(currentPanelUser, "Вход в админ-панель");
        } catch (error) {
            console.error("Ошибка входа:", error);
            loginError.textContent = "Ошибка входа";
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        if (currentPanelUser) {
            await addLoginLog(currentPanelUser, "Выход из админ-панели");
        }
        setLoggedOutState();
    });
}

const adminPasswordInput = document.getElementById("adminPassword");
if (adminPasswordInput) {
    adminPasswordInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && loginBtn) {
            loginBtn.click();
        }
    });
}

if (searchInput) {
    searchInput.addEventListener("input", filterAdmins);
}

const addAdminBtn = document.getElementById("addAdminBtn");
if (addAdminBtn) {
    addAdminBtn.addEventListener("click", async () => {
        const sortOrderInput = parseInt(document.getElementById("addSortOrder").value, 10);
        const nickname = document.getElementById("addNickname").value.trim();
        const level = normalizeLevel(document.getElementById("addLevel").value);
        const status = document.getElementById("addStatus").value.trim();
        const vk = document.getElementById("addVk").value.trim();

        if (!nickname || !level || !status) {
            showMessage("Заполните обязательные поля. Уровень должен быть от 1 до 8", "error");
            return;
        }

        const docId = makeSafeDocId(nickname);

        try {
            const checkDoc = await db.collection("admins").doc(docId).get();
            if (checkDoc.exists) {
                showMessage("Администратор с таким ником уже существует", "error");
                return;
            }

            let finalSortOrder = Number.isFinite(sortOrderInput) && sortOrderInput >= 1
                ? sortOrderInput
                : allAdmins.length + 1;

            const currentList = sortAdmins(allAdmins);
            if (finalSortOrder > currentList.length + 1) {
                finalSortOrder = currentList.length + 1;
            }

            const batch = db.batch();

            currentList.forEach((admin) => {
                const currentOrder = Number(admin.sortOrder) || 999999;
                if (currentOrder >= finalSortOrder) {
                    batch.update(db.collection("admins").doc(admin.id), {
                        "порядок": currentOrder + 1
                    });
                }
            });

            batch.set(db.collection("admins").doc(docId), {
                "уровень": level,
                "статус": status,
                "вк": vk || "",
                "город": SERVER_CITY,
                "порядок": finalSortOrder,
                "создан": firebase.firestore.FieldValue.serverTimestamp()
            });

            await batch.commit();
            await normalizeSortOrders();
            await loadAdmins();
            filterAdmins();

            document.getElementById("addSortOrder").value = "";
            document.getElementById("addNickname").value = "";
            document.getElementById("addLevel").value = "";
            document.getElementById("addStatus").value = "";
            document.getElementById("addVk").value = "";

            showMessage("Администратор добавлен", "success");
        } catch (error) {
            console.error("Ошибка добавления:", error);
            showMessage("Ошибка при добавлении", "error");
        }
    });
}

const bulkImportBtn = document.getElementById("bulkImportBtn");
if (bulkImportBtn) {
    bulkImportBtn.addEventListener("click", async () => {
        const text = document.getElementById("bulkAdminText").value.trim();

        if (!text) {
            showMessage("Вставьте данные для импорта", "error");
            return;
        }

        const lines = text
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean);

        try {
            const existingSnapshot = await db.collection("admins")
                .where("город", "==", SERVER_CITY)
                .get();

            let existingAdmins = existingSnapshot.docs.map(mapAdminFromDoc);
            existingAdmins = sortAdmins(existingAdmins);

            let nextOrder = existingAdmins.length + 1;
            let importedCount = 0;

            for (const line of lines) {
                const parts = line.split("\t").map(item => item.trim());

                if (parts.length < 4) continue;

                const nickname = parts[0];
                const level = normalizeLevel(parts[1]);
                const status = parts[2];
                const vk = parts[3];

                if (!nickname || !status || !level) continue;

                const docId = makeSafeDocId(nickname);
                const docRef = db.collection("admins").doc(docId);
                const existingDoc = await docRef.get();

                if (existingDoc.exists) {
                    await docRef.update({
                        "уровень": level,
                        "статус": status,
                        "вк": vk || "",
                        "город": SERVER_CITY,
                        "обновлен": firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    await docRef.set({
                        "уровень": level,
                        "статус": status,
                        "вк": vk || "",
                        "город": SERVER_CITY,
                        "порядок": nextOrder,
                        "создан": firebase.firestore.FieldValue.serverTimestamp()
                    });

                    nextOrder++;
                }

                importedCount++;
            }

            await normalizeSortOrders();
            await loadAdmins();
            filterAdmins();

            document.getElementById("bulkAdminText").value = "";
            showMessage(`Импортировано: ${importedCount}`, "success");
        } catch (error) {
            console.error("Ошибка импорта:", error);
            showMessage("Ошибка импорта", "error");
        }
    });
}

const clearAllAdminsBtn = document.getElementById("clearAllAdminsBtn");
if (clearAllAdminsBtn) {
    clearAllAdminsBtn.addEventListener("click", async () => {
        if (!confirm("Удалить всех администраторов Санкт-Петербурга?")) return;

        try {
            const snapshot = await db.collection("admins")
                .where("город", "==", SERVER_CITY)
                .get();

            const batch = db.batch();
            snapshot.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();

            await loadAdmins();
            filterAdmins();
            showMessage("Список очищен", "success");
        } catch (error) {
            console.error("Ошибка очистки:", error);
            showMessage("Ошибка очистки", "error");
        }
    });
}

const loadAdminBtn = document.getElementById("loadAdminBtn");
if (loadAdminBtn) {
    loadAdminBtn.addEventListener("click", async () => {
        const nickname = document.getElementById("editNicknameSearch").value.trim();
        const docId = makeSafeDocId(nickname);

        if (!nickname) {
            showMessage("Введите ник", "error");
            return;
        }

        try {
            const doc = await db.collection("admins").doc(docId).get();

            if (!doc.exists) {
                showMessage("Администратор не найден", "error");
                return;
            }

            const admin = mapAdminFromDoc(doc);

            if (admin.city !== SERVER_CITY) {
                showMessage("Администратор не найден на этом сервере", "error");
                return;
            }

            currentEditingAdmin = admin;

            document.getElementById("editNickname").value = admin.nickname || "";
            document.getElementById("editSortOrder").value = admin.sortOrder || "";
            document.getElementById("editLevel").value = admin.level || "";
            document.getElementById("editStatus").value = admin.status || "";
            document.getElementById("editVk").value = admin.vk || "";
            document.getElementById("editFields").style.display = "block";
        } catch (error) {
            console.error("Ошибка загрузки:", error);
            showMessage("Ошибка загрузки", "error");
        }
    });
}

const updateAdminBtn = document.getElementById("updateAdminBtn");
if (updateAdminBtn) {
    updateAdminBtn.addEventListener("click", async () => {
        if (!currentEditingAdmin) return;

        const newNickname = document.getElementById("editNickname").value.trim();
        const sortOrder = parseInt(document.getElementById("editSortOrder").value, 10);
        const level = normalizeLevel(document.getElementById("editLevel").value);
        const status = document.getElementById("editStatus").value.trim();
        const vk = document.getElementById("editVk").value.trim();

        if (!newNickname || !level || !status) {
            showMessage("Заполните обязательные поля. Уровень должен быть от 1 до 8", "error");
            return;
        }

        const newDocId = makeSafeDocId(newNickname);
        const oldDocId = currentEditingAdmin.id;

        try {
            if (newDocId !== oldDocId) {
                const newDocCheck = await db.collection("admins").doc(newDocId).get();
                if (newDocCheck.exists) {
                    showMessage("Администратор с таким ником уже существует", "error");
                    return;
                }

                const oldDocSnapshot = await db.collection("admins").doc(oldDocId).get();
                const oldData = oldDocSnapshot.data() || {};

                await db.collection("admins").doc(newDocId).set({
                    ...oldData,
                    "уровень": level,
                    "статус": status,
                    "вк": vk || "",
                    "город": SERVER_CITY,
                    "обновлен": firebase.firestore.FieldValue.serverTimestamp()
                });

                await db.collection("admins").doc(oldDocId).delete();
                currentEditingAdmin.id = newDocId;
                currentEditingAdmin.nickname = newDocId;
            } else {
                await db.collection("admins").doc(oldDocId).update({
                    "уровень": level,
                    "статус": status,
                    "вк": vk || "",
                    "город": SERVER_CITY,
                    "обновлен": firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            if (Number.isFinite(sortOrder) && sortOrder >= 1) {
                await moveAdminToPosition(currentEditingAdmin.id, sortOrder);
            }

            await normalizeSortOrders();
            await loadAdmins();
            filterAdmins();

            document.getElementById("editFields").style.display = "none";
            currentEditingAdmin = null;

            showMessage("Данные обновлены", "success");
        } catch (error) {
            console.error("Ошибка обновления:", error);
            showMessage("Ошибка обновления", "error");
        }
    });
}

const deleteAdminBtn = document.getElementById("deleteAdminBtn");
if (deleteAdminBtn) {
    deleteAdminBtn.addEventListener("click", async () => {
        if (!currentEditingAdmin) return;

        if (!confirm(`Удалить ${currentEditingAdmin.nickname}?`)) return;

        try {
            await db.collection("admins").doc(currentEditingAdmin.id).delete();
            await normalizeSortOrders();
            await loadAdmins();
            filterAdmins();

            document.getElementById("editFields").style.display = "none";
            currentEditingAdmin = null;

            showMessage("Администратор удалён", "success");
        } catch (error) {
            console.error("Ошибка удаления:", error);
            showMessage("Ошибка удаления", "error");
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "light";
    applyTheme(savedTheme);

    try {
        await normalizeSortOrders();
    } catch (error) {
        console.error("Ошибка нормализации порядка:", error);
    }

    await loadAdmins();

    const savedUser = localStorage.getItem(ADMIN_SESSION_KEY);
    if (savedUser && adminPanelContent) {
        currentPanelUser = JSON.parse(savedUser);
        adminPanelContent.classList.remove("login-mode");
        adminPanelContent.classList.add("admin-mode");
    }
});
