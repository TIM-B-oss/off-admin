const firebaseConfig = {
    apiKey: "AIzaSyCzKjyU6wHwlB_0_H0IX5B8eVaRd2h3kNk",
    authDomain: "admin-8f04f.firebaseapp.com",
    projectId: "admin-8f04f",
    storageBucket: "admin-8f04f.firebasestorage.app",
    messagingSenderId: "177591936873",
    appId: "1:177591936873:web:1000d32477f2ff318c3ff8",
    measurementId: "G-00PVDLGFC9"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const ADMIN_PASSWORD = "AdminPanel2025";
const SERVER_CITY = "spb";

let allAdmins = [];
let currentEditingAdmin = null;

// ==========================
// UI
// ==========================
const adminPanel = document.getElementById("adminPanel");
const adminPanelContent = document.getElementById("adminPanelContent");
const openAdminPanelBtn = document.getElementById("openAdminPanelBtn");
const closeAdminPanelBtn = document.getElementById("closeAdminPanel");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

// ==========================
// HELPERS
// ==========================
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

    admins.forEach(admin => {
        const row = document.createElement("tr");

        const nicknameCell = document.createElement("td");
        nicknameCell.textContent = admin.nickname || "-";
        nicknameCell.className = "nickname-cell";

        const levelCell = document.createElement("td");
        levelCell.textContent = admin.level ?? "-";
        levelCell.className = "level-cell";

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
            vkCell.style.color = "#c0cad7";
        }

        row.appendChild(nicknameCell);
        row.appendChild(levelCell);
        row.appendChild(statusCell);
        row.appendChild(vkCell);

        tbody.appendChild(row);
    });
}

async function loadAdmins() {
    try {
        const snapshot = await db.collection("admins")
            .where("city", "==", SERVER_CITY)
            .get();

        allAdmins = [];

        snapshot.forEach(doc => {
            allAdmins.push({
                id: doc.id,
                ...doc.data()
            });
        });

        allAdmins.sort((a, b) => (Number(b.level) || 0) - (Number(a.level) || 0));
        renderAdmins(allAdmins);
    } catch (error) {
        console.error("Ошибка загрузки:", error);
        renderAdmins([]);
    }
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

// ==========================
// OPEN/CLOSE PANEL
// ==========================
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

// ==========================
// LOGIN / LOGOUT
// ==========================
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
        if (e.key === "Enter") {
            loginBtn.click();
        }
    });
}

// ==========================
// SEARCH
// ==========================
const searchInput = document.getElementById("searchInput");
if (searchInput) {
    searchInput.addEventListener("input", () => {
        const value = searchInput.value.trim().toLowerCase();

        if (!value) {
            renderAdmins(allAdmins);
            return;
        }

        const filtered = allAdmins.filter(admin =>
            (admin.nickname || "").toLowerCase().includes(value)
        );

        renderAdmins(filtered);
    });
}

// ==========================
// ADD ADMIN
// ==========================
const addAdminBtn = document.getElementById("addAdminBtn");
if (addAdminBtn) {
    addAdminBtn.addEventListener("click", async () => {
        console.log("Кнопка добавления нажата");

        const nickname = document.getElementById("addNickname").value.trim();
        const level = parseInt(document.getElementById("addLevel").value, 10);
        const status = document.getElementById("addStatus").value.trim();
        const vk = document.getElementById("addVk").value.trim();

        if (!nickname || !level || !status) {
            showMessage("Заполните обязательные поля", "error");
            return;
        }

        try {
            await db.collection("admins").add({
                nickname: nickname,
                level: level,
                status: status,
                vk: vk || "",
                city: SERVER_CITY,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            showMessage("Администратор добавлен", "success");

            document.getElementById("addId").value = "";
            document.getElementById("addNickname").value = "";
            document.getElementById("addLevel").value = "";
            document.getElementById("addStatus").value = "";
            document.getElementById("addVk").value = "";

            await loadAdmins();
        } catch (error) {
            console.error("Ошибка добавления администратора:", error);
            showMessage("Ошибка при добавлении", "error");
        }
    });
}

// ==========================
// BULK IMPORT
// ==========================
const bulkImportBtn = document.getElementById("bulkImportBtn");
if (bulkImportBtn) {
    bulkImportBtn.addEventListener("click", async () => {
        const text = document.getElementById("bulkAdminText").value.trim();

        if (!text) {
            showMessage("Вставьте данные для импорта", "error");
            return;
        }

        const lines = text.split("\n");
        const batch = db.batch();
        let count = 0;

        lines.forEach(line => {
            const parts = line.split("\t");
            if (parts.length < 4) return;

            const id = parts[0];
            const nickname = parts[1];
            const level = parts[2];
            const status = parts[3];

            if (!nickname) return;

            const ref = db.collection("admins").doc();
            batch.set(ref, {
                nickname: nickname.trim(),
                level: parseInt(level, 10) || 1,
                status: status.trim(),
                vk: "",
                city: SERVER_CITY,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            count++;
        });

        try {
            await batch.commit();
            showMessage(`Импортировано: ${count}`, "success");
            document.getElementById("bulkAdminText").value = "";
            await loadAdmins();
        } catch (error) {
            console.error("Ошибка импорта:", error);
            showMessage("Ошибка импорта", "error");
        }
    });
}

// ==========================
// CLEAR ALL
// ==========================
const clearAllAdminsBtn = document.getElementById("clearAllAdminsBtn");
if (clearAllAdminsBtn) {
    clearAllAdminsBtn.addEventListener("click", async () => {
        if (!confirm("Удалить всех администраторов Санкт-Петербурга?")) return;

        try {
            const snapshot = await db.collection("admins")
                .where("city", "==", SERVER_CITY)
                .get();

            const batch = db.batch();
            snapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();

            showMessage("Список очищен", "success");
            await loadAdmins();
        } catch (error) {
            console.error("Ошибка очистки:", error);
            showMessage("Ошибка очистки", "error");
        }
    });
}

// ==========================
// LOAD ADMIN FOR EDIT
// ==========================
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
            document.getElementById("editLevel").value = currentEditingAdmin.level || "";
            document.getElementById("editStatus").value = currentEditingAdmin.status || "";
            document.getElementById("editVk").value = currentEditingAdmin.vk || "";

            document.getElementById("editFields").style.display = "block";
        } catch (error) {
            console.error("Ошибка загрузки администратора:", error);
            showMessage("Ошибка загрузки", "error");
        }
    });
}

// ==========================
// UPDATE ADMIN
// ==========================
const updateAdminBtn = document.getElementById("updateAdminBtn");
if (updateAdminBtn) {
    updateAdminBtn.addEventListener("click", async () => {
        if (!currentEditingAdmin) return;

        const nickname = document.getElementById("editNickname").value.trim();
        const level = parseInt(document.getElementById("editLevel").value, 10);
        const status = document.getElementById("editStatus").value.trim();
        const vk = document.getElementById("editVk").value.trim();

        if (!nickname || !level || !status) {
            showMessage("Заполните обязательные поля", "error");
            return;
        }

        try {
            await db.collection("admins").doc(currentEditingAdmin.id).update({
                nickname: nickname,
                level: level,
                status: status,
                vk: vk || "",
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            showMessage("Данные обновлены", "success");
            document.getElementById("editFields").style.display = "none";
            currentEditingAdmin = null;
            await loadAdmins();
        } catch (error) {
            console.error("Ошибка обновления:", error);
            showMessage("Ошибка обновления", "error");
        }
    });
}

// ==========================
// DELETE ADMIN
// ==========================
const deleteAdminBtn = document.getElementById("deleteAdminBtn");
if (deleteAdminBtn) {
    deleteAdminBtn.addEventListener("click", async () => {
        if (!currentEditingAdmin) return;

        if (!confirm(`Удалить ${currentEditingAdmin.nickname}?`)) return;

        try {
            await db.collection("admins").doc(currentEditingAdmin.id).delete();
            showMessage("Администратор удалён", "success");
            document.getElementById("editFields").style.display = "none";
            currentEditingAdmin = null;
            await loadAdmins();
        } catch (error) {
            console.error("Ошибка удаления:", error);
            showMessage("Ошибка удаления", "error");
        }
    });
}

// ==========================
// INIT
// ==========================
document.addEventListener("DOMContentLoaded", () => {
    loadAdmins();

    const isLoggedIn = localStorage.getItem("adminLoggedIn") === "true";
    if (isLoggedIn && adminPanelContent) {
        adminPanelContent.classList.remove("login-mode");
        adminPanelContent.classList.add("admin-mode");
    }
});