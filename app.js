// --- ARC NETWORK CONFIG ---
const USDC_ADDR = "0x3600000000000000000000000000000000000000"; 
const ARC_CHAIN_ID = '0x4cef52'; 
const INR_RATE = 83.50;

let userAddress = "", provider, signer;

// 1. AUTO-CONNECT (Page reload hone par bhi wallet connected rakhega)
async function autoConnect() {
    if (window.ethereum && localStorage.getItem("isWalletConnected") === "true") {
        try {
            const accounts = await window.ethereum.request({ method: "eth_accounts" });
            if (accounts.length > 0) {
                setupWallet(accounts[0]);
            }
        } catch (e) {
            console.error("Auto-reconnect failed", e);
        }
    }
}

// 2. SETUP WALLET (UI aur State ek sath update karne ke liye)
async function setupWallet(addr) {
    userAddress = addr;
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();

    // UI Updates
    const dot = document.getElementById("dot");
    dot.classList.replace("bg-red-500", "bg-green-500");
    dot.classList.remove("animate-pulse");
    document.getElementById("walletLabel").innerText = userAddress.slice(0, 10) + "...";

    // Data Load
    fetchBalance();
    
    // Save status in browser memory
    localStorage.setItem("isWalletConnected", "true");
}

// 3. MANUAL CONNECT + NETWORK SWITCH
async function connectWallet() {
    if (!window.ethereum) return alert("Bhai, MetaMask install karlo!");

    try {
        // Auto-Switch to Arc Testnet
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: ARC_CHAIN_ID }],
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: ARC_CHAIN_ID,
                        chainName: 'Arc Network Testnet',
                        rpcUrls: ['https://rpc-testnet.arcnetwork.io'],
                        nativeCurrency: { name: 'ARC', symbol: 'ARC', decimals: 18 },
                        blockExplorerUrls: ['https://explorer-testnet.arcnetwork.io']
                    }]
                });
            }
        }

        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setupWallet(accounts[0]);

    } catch (e) {
        console.error("Manual Connection Failed", e);
    }
}

// 4. TOGGLE PROFILE (Connect or Menu)
function toggleProfile() {
    if (!userAddress) {
        connectWallet();
    } else {
        document.getElementById("profileMenu").classList.toggle("show");
    }
}

// 5. FETCH BALANCE & TRANSACTIONS
async function fetchBalance() {
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["function balanceOf(address) view returns (uint256)"], provider);
        const bal = await contract.balanceOf(userAddress);
        const f = ethers.utils.formatUnits(bal, 6);
        
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN');
        
        getTxLogs();
    } catch (e) { console.log("Balance fetch error"); }
}

async function getTxLogs() {
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
            </div>`).join('');
    } catch (e) { console.log("Logs error"); }
}

// 6. DISCONNECT WALLET
function disconnectWallet() {
    userAddress = "";
    localStorage.removeItem("isWalletConnected");
    location.reload(); // Full reset for safety
}

// 7. UTILS & MODALS
function copyAddr() {
    navigator.clipboard.writeText(userAddress);
    alert("Address Copied!");
    document.getElementById("profileMenu").classList.remove("show");
}

function openSend() {
    if(!userAddress) return connectWallet();
    const to = prompt("Enter Receiver Address:");
    const amt = prompt("Enter Amount (USDC):");
    if(to && amt) alert("Transaction Initiated on Arc Testnet...");
}

function openReceive() {
    if(!userAddress) return connectWallet();
    document.getElementById("receiveModal").classList.remove("hidden");
    document.getElementById("myAddr").innerText = userAddress;
    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), { text: userAddress, width: 150, height: 150 });
}

function closeModal(id) {
    document.getElementById(id).classList.add("hidden");
}

// Global click to close menu
window.onclick = (e) => {
    if (!e.target.matches('#walletBtn, #walletBtn *')) {
        const menu = document.getElementById("profileMenu");
        if (menu) menu.classList.remove("show");
    }
}
