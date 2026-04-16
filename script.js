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

let currentCity = "spb";
let allAdmins = [];

function makeSafeDocId(value){
return value.trim().replace(/\s+/g,"_");
}

async function loadAdmins(){
const snapshot = await db.collection("admins")
.where("город","==",currentCity)
.get();

allAdmins = snapshot.docs.map(doc=>{
const d = doc.data();
return{
id:doc.id,
nickname:doc.id,
level:d["уровень"]||"",
status:d["статус"]||"",
vk:d["вк"]||"",
city:d["город"]||""
};
});

renderAdmins(allAdmins);
}

function renderAdmins(admins){
const tbody=document.getElementById("adminTableBody");
tbody.innerHTML="";
if(!admins.length){
tbody.innerHTML="<tr><td colspan='4'>Нет администраторов</td></tr>";
return;
}
admins.forEach(a=>{
tbody.innerHTML+=`
<tr>
<td>${a.nickname}</td>
<td>${a.level}</td>
<td>${a.status}</td>
<td>${a.vk?`<a href="${a.vk}" target="_blank">VK</a>`:"—"}</td>
</tr>`;
});
}

document.querySelectorAll(".server-btn").forEach(btn=>{
btn.addEventListener("click",async()=>{
document.querySelectorAll(".server-btn").forEach(b=>b.classList.remove("active"));
btn.classList.add("active");
currentCity=btn.dataset.city;
await loadAdmins();
});
});

document.getElementById("addAdminBtn").addEventListener("click",async()=>{
const city=document.getElementById("addCity").value;
const nickname=document.getElementById("addNickname").value.trim();
const level=document.getElementById("addLevel").value;
const status=document.getElementById("addStatus").value.trim();
const vk=document.getElementById("addVk").value.trim();

if(!nickname||!level||!status)return;

await db.collection("admins").doc(makeSafeDocId(nickname)).set({
"уровень":Number(level),
"статус":status,
"вк":vk||"",
"город":city
});

await loadAdmins();
});

document.getElementById("bulkImportBtn").addEventListener("click",async()=>{
const city=document.getElementById("bulkCity").value;
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
"город":city
});
}

await loadAdmins();
});

document.getElementById("loadAdminBtn").addEventListener("click",async()=>{
const nick=document.getElementById("editNicknameSearch").value.trim();
if(!nick)return;

const doc=await db.collection("admins").doc(makeSafeDocId(nick)).get();
if(!doc.exists)return;

const d=doc.data();
document.getElementById("editFields").style.display="block";
document.getElementById("editNickname").value=doc.id;
document.getElementById("editLevel").value=d["уровень"];
document.getElementById("editStatus").value=d["статус"];
document.getElementById("editVk").value=d["вк"];
document.getElementById("editCity").value=d["город"];
});

document.getElementById("updateAdminBtn").addEventListener("click",async()=>{
const nickname=document.getElementById("editNickname").value.trim();
const level=document.getElementById("editLevel").value;
const status=document.getElementById("editStatus").value.trim();
const vk=document.getElementById("editVk").value.trim();
const city=document.getElementById("editCity").value;

await db.collection("admins").doc(makeSafeDocId(nickname)).set({
"уровень":Number(level),
"статус":status,
"вк":vk,
"город":city
});

await loadAdmins();
});

document.getElementById("deleteAdminBtn").addEventListener("click",async()=>{
const nickname=document.getElementById("editNickname").value.trim();
await db.collection("admins").doc(makeSafeDocId(nickname)).delete();
document.getElementById("editFields").style.display="none";
await loadAdmins();
});

document.getElementById("openAdminPanelBtn").onclick=()=>{
document.getElementById("adminPanel").style.display="flex";
};

document.getElementById("closeAdminPanel").onclick=()=>{
document.getElementById("adminPanel").style.display="none";
};

document.addEventListener("DOMContentLoaded",loadAdmins);
