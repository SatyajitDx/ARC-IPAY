// --- ARC NETWORK CONFIG ---
const USDC_ADDR = "0x3600000000000000000000000000000000000000"; 
const ARC_CHAIN = '0x4cef52';
const INR_RATE = 83.50;

let userAddress = "", provider, signer;

// 1. WALLET CONNECTION
async function autoConnect() {
    if (!window.ethereum) return;
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // UI Update: Green Dot & Address
        document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
        document.getElementById("dot").classList.remove("animate-pulse");
        document.getElementById("walletLabel").innerText = userAddress.slice(0, 10) + "...";
        
        fetchBalance();
    } catch (e) { console.error("Connection error", e); }
}

// 2. TOGGLE PROFILE (Connect or Open Menu)
function toggleProfile() {
    if (!userAddress || userAddress === "") {
        autoConnect();
    } else {
        document.getElementById("profileMenu").classList.toggle("show");
    }
}

// 3. FETCH BALANCE & HISTORY
async function fetchBalance() {
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
        const bal = await contract.balanceOf(userAddress);
        const f = ethers.utils.formatUnits(bal, 6);
        
        // Dashboard pe balance dikhana
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
        
        getTxLogs(); // History bhi sath mein load hogi
    } catch (e) { console.log("Balance fetch failed"); }
}

// 4. TRANSACTION HISTORY (Blockchain Logs)
async function getTxLogs() {
    if(!userAddress) return;
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["event Transfer(address indexed from, address indexed to, uint256 value)"], provider);
        const filter = contract.filters.Transfer(userAddress, null);
        const logs = await contract.queryFilter(filter, -500, "latest");
        
        const list = document.getElementById("txList");
        if(logs.length === 0) return;

        list.innerHTML = logs.slice(-3).reverse().map(l => `
            <div class="flex justify-between items-center bg-white/40 p-3 rounded-xl border border-black/5 shadow-sm">
                <div>
                    <p class="text-[7px] font-black text-[#121271]">SENT</p>
                    <p class="text-[8px] font-mono opacity-60">${l.args.to.slice(0,18)}...</p>
                </div>
                <div class="text-right">
                    <p class="text-[10px] font-black text-red-600">-${ethers.utils.formatUnits(l.args.value, 6)}</p>
                </div>
            </div>
        `).join('');
    } catch (e) { console.log("Logs error"); }
}

// 5. DISCONNECT WALLET
function disconnectWallet() {
    userAddress = "";
    signer = null;
    // Pura page refresh karke state reset kar dega
    location.reload();
}

// 6. TOOLS & UTILS
function copyAddr() {
    if (userAddress) {
        navigator.clipboard.writeText(userAddress);
        alert("Wallet Address Copied!");
        document.getElementById("profileMenu").classList.remove("show");
    }
}

function openSend() {
    if(!userAddress) return autoConnect();
    const to = prompt("Recipient Wallet Address:");
    const amt = prompt("Amount of USDC to send:");
    if(to && amt) alert("Processing your Arc Network transfer...");
}

function openReceive() {
    if(!userAddress) return autoConnect();
    document.getElementById("receiveModal").classList.remove("hidden");
    document.getElementById("myAddr").innerText = userAddress;
    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), { text: userAddress, width: 150, height: 150 });
}

function closeModal(id) {
    document.getElementById(id).classList.add("hidden");
}

// Global click check: dropdown band karne ke liye
window.onclick = function(e) {
    if (!e.target.matches('#walletBtn, #walletBtn *')) {
        const menu = document.getElementById("profileMenu");
        if (menu && menu.classList.contains('show')) menu.classList.remove('show');
    }
}
