// --- CONFIGURATION ---
const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const MERCHANT = "0xbdc55a1296d065b7eb4363207d1a599e578712c5"; 
const ARC_CHAIN = "0x4cef52";
const INR_RATE = 83.50; 

let userAddress = "";
let provider, signer, currentType = "", selectedUsdc = 0;

const operators = {
    mobile: ["Jio Prepaid", "Airtel Prepaid", "Vi Prepaid", "BSNL"],
    electricity: ["Tata Power", "Adani Electricity", "Bescom", "MSEDCL"],
    dth: ["Tata Play", "Airtel DTH", "Dish TV"],
    broadband: ["JioFiber", "Airtel Xstream", "Hathway"],
    train: ["IRCTC"], bus: ["RedBus"], flight: ["IndiGo"], movie: ["PVR"]
};

const labels = {
    mobile: "Enter Mobile Number", electricity: "Enter Consumer ID",
    dth: "Enter Smart Card ID", broadband: "Enter Subscriber ID",
    train: "Enter PNR No", bus: "Travel Route", flight: "Destination", movie: "Cinema Name"
};

const mockPlans = [
    { name: "1.5GB/Day - 28 Days", inr: 299 },
    { name: "2GB/Day - 84 Days", inr: 749 },
    { name: "Unlimited 5G - 365 Days", inr: 2999 },
    { name: "Data Booster 6GB", inr: 61 }
];

// --- WALLET CONNECT ---
async function connectWallet() {
    if (!window.ethereum) return alert("Please install OKX or MetaMask Wallet!");
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        document.getElementById("loginScreen").classList.add("hidden");
        document.getElementById("dashboard").classList.remove("hidden");
        document.getElementById("walletAddr").innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-4).toUpperCase();
        
        fetchBalance();
        getHistory(5, "latestTxList");
    } catch (e) { alert("Connection Error!"); }
}

// --- UI LOGIC ---
function openPopup(type) {
    currentType = type;
    document.getElementById("bookingModal").classList.remove("hidden");
    document.getElementById("modalTitle").innerText = type.toUpperCase();
    document.getElementById("targetId").placeholder = labels[type];
    document.getElementById("targetId").value = "";
    
    const opSelect = document.getElementById("operatorSelect");
    opSelect.innerHTML = `<option disabled selected>Select Provider</option>`;
    operators[type].forEach(op => { opSelect.innerHTML += `<option value="${op}">${op}</option>`; });

    document.getElementById("customAmountBox").classList.add("hidden");
    document.getElementById("plansBox").classList.add("hidden");
    document.getElementById("finalPayBtn").classList.add("hidden");
}

function checkTypeAndShow() {
    if (currentType === 'mobile') {
        document.getElementById("customAmountBox").classList.add("hidden");
        document.getElementById("plansBox").classList.remove("hidden");
        loadPlans();
    } else {
        document.getElementById("plansBox").classList.add("hidden");
        document.getElementById("customAmountBox").classList.remove("hidden");
        document.getElementById("finalPayBtn").classList.remove("hidden");
    }
}

function convertToUsdc(val) {
    if(!val || val <= 0) {
        document.getElementById("convertedUsdc").innerText = "0.00";
        selectedUsdc = 0; return;
    }
    selectedUsdc = (val / INR_RATE).toFixed(2);
    document.getElementById("convertedUsdc").innerText = selectedUsdc;
}

function loadPlans() {
    const list = document.getElementById("plansList");
    list.innerHTML = "";
    mockPlans.forEach(plan => {
        const usdc = (plan.inr / INR_RATE).toFixed(2);
        list.innerHTML += `<div onclick="selectPlan(${plan.inr}, ${usdc})" class="plan-card mb-2 flex justify-between items-center text-[11px]">
            <span>${plan.name}</span><span class="text-blue-400 font-bold">₹${plan.inr} (${usdc} USDC)</span>
        </div>`;
    });
}

function selectPlan(inr, usdc) {
    selectedUsdc = usdc;
    const btn = document.getElementById("finalPayBtn");
    btn.classList.remove("hidden");
    btn.innerText = `PAY ₹${inr} (${usdc} USDC)`;
    // Add active class to selected card
    const cards = document.querySelectorAll('.plan-card');
    cards.forEach(c => c.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

// --- REAL TRANSACTION LOGIC ---
async function executeFinalPayment() {
    const btn = document.getElementById("finalPayBtn");
    const id = document.getElementById("targetId").value;

    if(!id || selectedUsdc <= 0) return alert("Fill all details!");

    try {
        btn.innerText = "WAITING FOR WALLET...";
        btn.disabled = true;

        const abi = ["function transfer(address to, uint256 amount) public returns (bool)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, signer);
        
        // USDC decimals = 6
        const amountUnits = ethers.utils.parseUnits(selectedUsdc.toString(), 6);

        const tx = await contract.transfer(MERCHANT, amountUnits, {
            gasLimit: 120000,
            type: 0 // Compatibility for all wallets
        });

        btn.innerText = "CONFIRMING...";
        await tx.wait();

        alert(`Payment Successful for ID: ${id}! ✅`);
        closeModal('bookingModal');
        fetchBalance();
        getHistory(5, "latestTxList");
    } catch (e) {
        console.error(e);
        alert("Payment Failed! Check Gas Fees or Balance.");
    } finally {
        btn.innerText = "Confirm Payment";
        btn.disabled = false;
    }
}

// --- HELPERS ---
async function fetchBalance() {
    try {
        const abi = ["function balanceOf(address) view returns (uint256)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const bal = await contract.balanceOf(userAddress);
        const f = ethers.utils.formatUnits(bal, 6);
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
    } catch (e) {}
}

async function getHistory(limit, targetId) {
    const list = document.getElementById(targetId);
    try {
        const abi = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
        const contract = new ethers.Contract(USDC_ADDR, abi, provider);
        const filter = contract.filters.Transfer(userAddress, null);
        const logs = await contract.queryFilter(filter, -5000, "latest");
        list.innerHTML = logs.slice(-limit).reverse().map(l => `
            <div class="flex justify-between border-b border-white/5 pb-3 text-[10px]">
                <div class="text-left"><p class="text-blue-300 font-bold">To: ${l.args.to.slice(0,12)}...</p><p class="opacity-30">Confirmed</p></div>
                <div class="text-right font-black italic">-${ethers.utils.formatUnits(l.args.value, 6)} USDC</div>
            </div>`).join('');
    } catch (e) { list.innerHTML = "History Syncing..."; }
}

function openReceive() {
    document.getElementById("receiveModal").classList.remove("hidden");
    document.getElementById("fullAddrDisplay").innerText = userAddress;
    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), { text: userAddress, width: 180, height: 180 });
}

function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
function copyAddr() { navigator.clipboard.writeText(userAddress); alert("Copied! ✅"); }
