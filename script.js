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

const SERVERS = {
    spb: "Невский",
    ekb: "Екатеринбург"
};

let currentServer = localStorage.getItem("currentServer") || "spb";
let allAdmins = [];

const serverBadgeBtn = document.getElementById("serverBadgeBtn");
const adminPanel = document.getElementById("adminPanel");

function updateServerBadge() {
    serverBadgeBtn.textContent = SERVERS[currentServer];
}

serverBadgeBtn.onclick = async () => {
    currentServer = currentServer === "spb" ? "ekb" : "spb";
    localStorage.setItem("currentServer", currentServer);
    updateServerBadge();
    await loadAdmins();
};

async function loadAdmins() {
    const snapshot = await db.collection("admins")
        .where("город", "==", currentServer)
        .get();

    allAdmins = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    renderAdmins();
}

function renderAdmins() {
    const tbody = document.getElementById("adminTableBody");
    tbody.innerHTML = "";

    if (!allAdmins.length) {
        tbody.innerHTML = "<tr><td colspan='4'>Нет администраторов</td></tr>";
        return;
    }

    allAdmins.forEach(admin => {
        tbody.innerHTML += `
            <tr>
                <td>${admin.id}</td>
                <td>${admin["уровень"]}</td>
                <td>${admin["статус"]}</td>
                <td>${admin["вк"] || "-"}</td>
            </tr>
        `;
    });
}

document.getElementById("openAdminPanelBtn").onclick = () => {
    adminPanel.style.display = "flex";
};

document.getElementById("closeAdminPanel").onclick = () => {
    adminPanel.style.display = "none";
};

document.getElementById("addAdminBtn").onclick = async () => {
    const nickname = document.getElementById("addNickname").value.trim();
    const level = document.getElementById("addLevel").value;
    const status = document.getElementById("addStatus").value.trim();
    const vk = document.getElementById("addVk").value.trim();

    if (!nickname || !level || !status) return;

    await db.collection("admins").doc(nickname).set({
        "уровень": Number(level),
        "статус": status,
        "вк": vk,
        "город": currentServer
    });

    await loadAdmins();
};

document.addEventListener("DOMContentLoaded", async () => {
    updateServerBadge();
    await loadAdmins();
});
