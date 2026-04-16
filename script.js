const firebaseConfig = {
apiKey: "AIzaSyC3uqEIX7Zee5_T9NAp5impPdK2nCPYIFo",
authDomain: "admin-panel-site-c6658.firebaseapp.com",
projectId: "admin-panel-site-c6658"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const SERVER_STORAGE_KEY = "selectedServer";

let currentCity = localStorage.getItem(SERVER_STORAGE_KEY) || "spb";
let allAdmins = [];

function makeSafeDocId(value){
return value.trim().replace(/\s+/g,"_");
}

function setActiveServerButton(){
document.querySelectorAll(".server-btn").forEach(btn=>{
btn.classList.remove("active");
if(btn.dataset.city===currentCity){
btn.classList.add("active");
}
});
}

function syncSelects(){
document.getElementById("addCity").value=currentCity;
document.getElementById("bulkCity").value=currentCity;
}

async function loadAdmins(){
const snapshot = await db.collection("admins")
.where("город","==",currentCity)
.get();

allAdmins = snapshot.docs.map(doc=>{
const d = doc.data();
return{
nickname:doc.id,
level:d["уровень"]||"",
status:d["статус"]||"",
vk:d["вк"]||""
};
});

renderAdmins(allAdmins);
}

function renderAdmins(admins){
const tbody=document.getElementById("adminTableBody");
tbody.innerHTML="";

if(!admins.length){
tbody.innerHTML=`<tr class="empty-row">
<td colspan="4">Нет администраторов</td>
</tr>`;
return;
}

admins.forEach(a=>{
tbody.innerHTML+=`
<tr>
<td class="nickname-cell">${a.nickname}</td>
<td class="level-cell">${a.level}</td>
<td><span class="status-tag">${a.status}</span></td>
<td>${a.vk?`<a class="vk-btn" href="${a.vk}" target="_blank">VK</a>`:"—"}</td>
</tr>`;
});
}

document.querySelectorAll(".server-btn").forEach(btn=>{
btn.addEventListener("click",async()=>{
currentCity=btn.dataset.city;
localStorage.setItem(SERVER_STORAGE_KEY,currentCity);
setActiveServerButton();
syncSelects();
await loadAdmins();
});
});

document.getElementById("addAdminBtn").addEventListener("click",async()=>{
const nickname=document.getElementById("addNickname").value.trim();
const level=document.getElementById("addLevel").value;
const status=document.getElementById("addStatus").value.trim();
const vk=document.getElementById("addVk").value.trim();
if(!nickname||!level||!status)return;

await db.collection("admins").doc(makeSafeDocId(nickname)).set({
"уровень":Number(level),
"статус":status,
"вк":vk||"",
"город":currentCity
});

await loadAdmins();
});

document.getElementById("bulkImportBtn").addEventListener("click",async()=>{
const text=document.getElementById("bulkAdminText").value.trim();
if(!text)return;

const lines=text.split("\n").filter(Boolean);

for(const line of lines){
const parts=line.split("\t");
if(parts.length<4)continue;

await db.collection("admins").doc(makeSafeDocId(parts[0])).set({
"уровень":Number(parts[1]),
"статус":parts[2],
"вк":parts[3],
"город":currentCity
});
}

await loadAdmins();
});

document.getElementById("openAdminPanelBtn").onclick=()=>{
document.getElementById("adminPanel").style.display="flex";
};

document.getElementById("closeAdminPanel").onclick=()=>{
document.getElementById("adminPanel").style.display="none";
};

document.addEventListener("DOMContentLoaded",async()=>{
setActiveServerButton();
syncSelects();
await loadAdmins();
});
