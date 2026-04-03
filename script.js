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

const ADMIN_PASSWORD = "AdminPanel2025";
const SERVER_CITY = "spb";
const THEME_STORAGE_KEY = "siteTheme";

let allAdmins = [];
let currentEditingAdmin = null;

const adminPanel = document.getElementById("adminPanel");
const adminPanelContent = document.getElementById("adminPanelContent");
const openAdminPanelBtn = document.getElementById("openAdminPanelBtn");
const closeAdminPanelBtn = document.getElementById("closeAdminPanel");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const searchInput = document.getElementById("searchInput");
const serverBadgeBtn = document.getElementById("serverBadgeBtn");

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

async function loadAdmins() {
    try {
        const snapshot = await db.collection("admins")
            .where("city", "==", SERVER_CITY)
            .get();

        allAdmins = [];

        snapshot.forEach((doc) => {
            allAdmins.push({
                id: doc.id,
                ...doc.data()
            });
        });

        allAdmins = sortAdmins(allAdmins);
        renderAdmins(allAdmins);
    } catch (error) {
        console.error("Ошибка загрузки:", error);
        renderAdmins([]);
    }
}

async function normalizeSortOrders() {
    const snapshot = await db.collection("admins")
        .where("city", "==", SERVER_CITY)
        .get();

    const admins = [];
    snapshot.forEach((doc) => {
        admins.push({
            id: doc.id,
            ...doc.data()
        });
    });

    const sorted = sortAdmins(admins);
    const batch = db.batch();
    let changed = false;

    sorted.forEach((admin, index) => {
        const correctOrder = index + 1;
        if (Number(admin.sortOrder) !== correctOrder) {
            batch.update(db.collection("admins").doc(admin.id), {
                sortOrder: correctOrder
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
        .where("city", "==", SERVER_CITY)
        .get();

    const admins = [];
    snapshot.forEach((doc) => {
        admins.push({
            id: doc.id,
            ...doc.data()
        });
    });

    let sorted = sortAdmins(admins);
    const currentIndex = sorted.findIndex((admin) => admin.id === adminId);

    if (currentIndex === -1) return;

    const movedAdmin = sorted[currentIndex];
    sorted.splice(currentIndex, 1);

    let newIndex = targetPosition - 1;
    if (newIndex < 0) newIndex = 0;
    if (newIndex > sorted.length) newIndex = sorted.length;

    sorted.splice(newIndex, 0, movedAdmin);

    const batch = db.batch();

    sorted.forEach((admin, index) => {
        batch.update(db.collection("admins").doc(admin.id), {
            sortOrder: index + 1
        });
    });

    await batch.commit();
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

    localStorage.setItem("adminLoggedIn", "true");
}

function setLoggedOutState() {
    const loginForm = document.getElementById("loginForm");
    const adminControls = document.getElementById("adminControls");
    const passwordInput = document.getElementById("adminPassword");
    const loginError = document.getElementById("loginError");

    if (loginForm) loginForm.style.display = "block";
    if (adminControls) adminControls.style.display = "none";
    if (passwordInput) passwordInput.value = "";
    if (loginError) loginError.textContent = "";

    if (adminPanelContent) {
        adminPanelContent.classList.remove("admin-mode");
        adminPanelContent.classList.add("login-mode");
    }

    localStorage.removeItem("adminLoggedIn");
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

        const isLoggedIn = localStorage.getItem("adminLoggedIn") === "true";
        if (isLoggedIn) {
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
    loginBtn.addEventListener("click", () => {
        const passwordInput = document.getElementById("adminPassword");
        const loginError = document.getElementById("loginError");

        if (!passwordInput || !loginError) return;

        if (passwordInput.value === ADMIN_PASSWORD) {
            setLoggedInState();
        } else {
            loginError.textContent = "Неверный пароль";
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
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
        const level = parseInt(document.getElementById("addLevel").value, 10);
        const status = document.getElementById("addStatus").value.trim();
        const vk = document.getElementById("addVk").value.trim();

        if (!nickname || !level || !status) {
            showMessage("Заполните обязательные поля", "error");
            return;
        }

        try {
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
                        sortOrder: currentOrder + 1
                    });
                }
            });

            const newDocRef = db.collection("admins").doc();

            batch.set(newDocRef, {
                nickname,
                level,
                status,
                vk: vk || "",
                city: SERVER_CITY,
                sortOrder: finalSortOrder,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
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

        const lines = text.split("\n").map(line => line.trim()).filter(Boolean);

        try {
            const batch = db.batch();
            let count = 0;

            for (const line of lines) {
                const parts = line.split("\t").map(item => item.trim());
                if (parts.length < 3) continue;

                const nickname = parts[0];
                const level = parseInt(parts[1], 10) || 1;
                const status = parts[2];

                if (!nickname) continue;

                const docRef = db.collection("admins").doc();

                batch.set(docRef, {
                    nickname,
                    level,
                    status,
                    vk: "",
                    city: SERVER_CITY,
                    sortOrder: count + 1,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                count++;
            }

            await batch.commit();
            await normalizeSortOrders();
            await loadAdmins();
            filterAdmins();

            document.getElementById("bulkAdminText").value = "";
            showMessage(`Импортировано: ${count}`, "success");
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
                .where("city", "==", SERVER_CITY)
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

        if (!nickname) {
            showMessage("Введите ник", "error");
            return;
        }

        try {
            const snapshot = await db.collection("admins")
                .where("city", "==", SERVER_CITY)
                .where("nickname", "==", nickname)
                .get();

            if (snapshot.empty) {
                showMessage("Администратор не найден", "error");
                return;
            }

            const doc = snapshot.docs[0];
            currentEditingAdmin = {
                id: doc.id,
                ...doc.data()
            };

            document.getElementById("editNickname").value = currentEditingAdmin.nickname || "";
            document.getElementById("editSortOrder").value = currentEditingAdmin.sortOrder || "";
            document.getElementById("editLevel").value = currentEditingAdmin.level || "";
            document.getElementById("editStatus").value = currentEditingAdmin.status || "";
            document.getElementById("editVk").value = currentEditingAdmin.vk || "";
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

        const nickname = document.getElementById("editNickname").value.trim();
        const sortOrder = parseInt(document.getElementById("editSortOrder").value, 10);
        const level = parseInt(document.getElementById("editLevel").value, 10);
        const status = document.getElementById("editStatus").value.trim();
        const vk = document.getElementById("editVk").value.trim();

        if (!nickname || !level || !status) {
            showMessage("Заполните обязательные поля", "error");
            return;
        }

        try {
            await db.collection("admins").doc(currentEditingAdmin.id).update({
                nickname,
                level,
                status,
                vk: vk || "",
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

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

    const isLoggedIn = localStorage.getItem("adminLoggedIn") === "true";
    if (isLoggedIn && adminPanelContent) {
        adminPanelContent.classList.remove("login-mode");
        adminPanelContent.classList.add("admin-mode");
    }
});
