const USDC_ADDR = "0x3600000000000000000000000000000000000000"; 
const MERCHANT = "0xbdc55a1296d065b7eb4363207d1a599e578712c5"; 
const ARC_CHAIN_ID = '0x4cef52'; 
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
        document.getElementById("walletLabel").innerText = userAddress.slice(0, 10) + "...";
        
        fetchBalance();
        getTxLogs();
    } catch (e) { console.error(e); }
}

function toggleProfile() {
    userAddress ? document.getElementById("profileMenu").classList.toggle("show") : autoConnect();
}

async function fetchBalance() {
    if(!userAddress) return;
    const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
    const bal = await contract.balanceOf(userAddress);
    const f = ethers.utils.formatUnits(bal, 6);
    document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
    document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
}

// --- MODAL CONTROLS ---
function openSendModal() { if(!userAddress) return autoConnect(); document.getElementById("sendModal").classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }

function openReceiveModal() {
    if(!userAddress) return autoConnect();
    document.getElementById("receiveModal").classList.remove("hidden");
    document.getElementById("myAddrLabel").innerText = userAddress;
    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), { text: userAddress, width: 180, height: 180 });
}

async function processSend() {
    const to = document.getElementById("sendTo").value;
    const val = document.getElementById("sendAmount").value;
    if(!to || !val) return alert("Bhai detail bhariye!");
    
    try {
        const btn = document.getElementById("confirmSendBtn");
        btn.innerText = "WAITING FOR ARC..."; btn.disabled = true;
        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
        const tx = await contract.transfer(to, ethers.utils.parseUnits(val, 6));
        await tx.wait();
        alert("Paisa Gaya!"); location.reload();
    } catch (e) { alert("Fail!"); location.reload(); }
}

// --- BOOKING ENGINE ---
function startFlow(type) {
    document.getElementById("bookingOverlay").classList.remove("hidden");
    document.getElementById("flowTitle").innerText = type.toUpperCase() + " BOOKING";
    document.getElementById("flowContent").innerHTML = `
        <input type="text" id="src" placeholder="Source / Mobile Number">
        <button onclick="runSearch('${type}')" class="w-full bg-blue-600 text-white py-4 rounded-xl font-bold">SEARCH</button>
    `;
}

function runSearch(type) {
    const inject = document.getElementById("resultsInject");
    inject.innerHTML = `<p class="text-center opacity-40 italic">Searching Arc Network...</p>`;
    setTimeout(() => {
        const price = (Math.random() * 50 + 10).toFixed(2);
        inject.innerHTML = `
            <div onclick="selectItem('Arc ${type}', ${price})" class="glass p-5 flex justify-between items-center border-white/10">
                <div><p class="font-black text-blue-400 uppercase">Premium ${type}</p><p class="text-[10px] opacity-60">Instant Confirmation</p></div>
                <div class="text-right"><p class="font-black text-lg">${price} USDC</p></div>
            </div>`;
    }, 1200);
}

function selectItem(name, price) {
    selectedPrice = price; selectedItem = name;
    document.getElementById("totalPrice").innerText = `BOOKING: ${name} | TOTAL: ${price} USDC`;
    document.getElementById("bottomBar").classList.remove("hidden");
}

async function finalPay() {
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
        const tx = await contract.transfer(MERCHANT, ethers.utils.parseUnits(selectedPrice.toString(), 6));
        await tx.wait();
        alert("Booking Successful!"); location.reload();
    } catch (e) { alert("Payment Failed!"); }
}

async function getTxLogs() {
    if(!userAddress) return;
    const contract = new ethers.Contract(USDC_ADDR, ["event Transfer(address indexed from, address indexed to, uint256 value)"], provider);
    const logs = await contract.queryFilter(contract.filters.Transfer(userAddress), -100, "latest");
    document.getElementById("txList").innerHTML = logs.slice(-3).reverse().map(l => `
        <div class="flex justify-between border-b border-white/5 pb-2">
            <span class="opacity-60 text-[8px]">To: ${l.args.to.slice(0,10)}...</span>
            <span class="text-red-400">-${ethers.utils.formatUnits(l.args.value, 6)} USDC</span>
        </div>`).join('');
}

function disconnectWallet() { userAddress = ""; location.reload(); }
function closeFlow() { document.getElementById("bookingOverlay").classList.add("hidden"); }
function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied!"); }
