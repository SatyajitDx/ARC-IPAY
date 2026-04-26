const USDC_ADDR = "0x3600000000000000000000000000000000000000"; 
const MERCHANT = "0xbdc55a1296d065b7eb4363207d1a599e578712c5"; 
const ARC_CHAIN = '0x4cef52'; 
const INR_RATE = 83.50;

let userAddress = "", provider, signer, selectedPrice = 0, selectedItem = "";

async function autoConnect() {
    if (!window.ethereum) return;
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
        document.getElementById("dot").classList.remove("animate-pulse");
        document.getElementById("walletLabel").innerText = userAddress.slice(0, 10) + "...";
        fetchBalance();
    } catch (e) { console.error(e); }
}

function toggleProfile() { userAddress ? document.getElementById("profileMenu").classList.toggle("show") : autoConnect(); }

// --- WALLET TOOLS ---
function openSendModal() { if(!userAddress) return autoConnect(); document.getElementById("sendModal").classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }

async function processSend() {
    const to = document.getElementById("sendTo").value;
    const val = document.getElementById("sendAmt").value;
    const btn = document.getElementById("sendS");
    try {
        btn.innerText = "WAITING..."; btn.disabled = true;
        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
        const tx = await contract.transfer(to, ethers.utils.parseUnits(val, 6));
        await tx.wait();
        alert("Sent!"); location.reload();
    } catch (e) { alert("Fail!"); btn.disabled = false; btn.innerText = "Send"; }
}

function openReceiveModal() {
    if(!userAddress) return autoConnect();
    document.getElementById("receiveModal").classList.remove("hidden");
    document.getElementById("myFullAddr").innerText = userAddress;
    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), { text: userAddress, width: 150, height: 150 });
}

// --- BOOKING ENGINE ---
const mockDb = {
    flight: [{op: "IndiGo", inr: 7421, time: "23:00-01:55"}],
    bus: [{op: "Zing Bus", inr: 850, time: "22:00-06:00"}],
    train: [{op: "Rajdhani", inr: 2450, time: "16:30-10:00"}],
    hotel: [{op: "Taj Stay", inr: 12000, time: "Check-in 12PM"}],
    mobile: [{op: "Jio Recharge", inr: 299, time: "28 Days Plan"}],
    electric: [{op: "Adani Power", inr: 1500, time: "Monthly Bill"}],
    dth: [{op: "Tata Play", inr: 450, time: "Monthly Pack"}],
    wifi: [{op: "Airtel Fiber", inr: 999, time: "Unlimited"}]
};

function startFlow(type) {
    if(!userAddress) return autoConnect();
    document.getElementById("bookingOverlay").classList.remove("hidden");
    document.getElementById("flowTitle").innerText = type.toUpperCase() + " SERVICE";
    document.getElementById("flowContent").innerHTML = `
        <input type="text" id="src" placeholder="Source / ID Number">
        <button onclick="runSearch('${type}')" class="w-full bg-[#000080] text-white py-4 rounded-xl">Next Step</button>`;
}

function runSearch(type) {
    const inject = document.getElementById("resultsInject");
    inject.innerHTML = `<p class="text-center italic opacity-40">Fetching from Arc Network...</p>`;
    setTimeout(() => {
        const item = mockDb[type][0];
        const usdc = (item.inr / INR_RATE).toFixed(2);
        inject.innerHTML = `
            <div onclick="selectItem('${item.op}', ${item.inr}, ${usdc})" class="glass p-5 flex justify-between items-center border">
                <div><p class="font-black text-[#000080]">${item.op}</p><p class="text-[10px] opacity-60">${item.time}</p></div>
                <div class="text-right"><p class="font-black">₹${item.inr}</p><p class="text-[10px] text-green-600">${usdc} USDC</p></div>
            </div>`;
    }, 1000);
}

function selectItem(name, inr, usdc) {
    selectedPrice = usdc; selectedItem = name;
    document.getElementById("totalPrice").innerText = `Paying: ${name} | Total: ${usdc} USDC`;
    document.getElementById("bottomBar").style.display = "block";
}

async function finalPay() {
    const btn = document.getElementById("payBtn");
    try {
        btn.innerText = "WAITING FOR ARC..."; btn.disabled = true;
        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(selectedPrice.toString(), 6));
        await tx.wait();
        alert("Transaction Successful!"); location.reload();
    } catch (e) { alert("Fail!"); btn.disabled = false; btn.innerText = "Confirm & Pay"; }
}

// --- SYSTEM UTILS ---
async function fetchBalance() {
    const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
    const bal = await contract.balanceOf(userAddress);
    const f = ethers.utils.formatUnits(bal, 6);
    document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
    document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
}

async function getTxLogs() {
    const contract = new ethers.Contract(USDC_ADDR, ["event Transfer(address indexed from, address indexed to, uint256 value)"], provider);
    const logs = await contract.queryFilter(contract.filters.Transfer(userAddress), -100, "latest");
    document.getElementById("txList").innerHTML = logs.slice(-3).reverse().map(l => `
        <div class="flex justify-between border-b border-black/5 pb-1">
            <span>To: ${l.args.to.slice(0,6)}...</span>
            <span class="text-red-500">-${ethers.utils.formatUnits(l.args.value, 6)} USDC</span>
        </div>`).join('');
}

function disconnectWallet() { userAddress = ""; location.reload(); }
function closeFlow() { document.getElementById("bookingOverlay").classList.add("hidden"); }
function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied!"); }
