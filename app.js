// --- ARC NETWORK CONFIG ---
const USDC_ADDR = "0x3600000000000000000000000000000000000000"; 
const ARC_CHAIN_ID = '0x4cef52'; 
const RPC_URL = 'https://rpc.testnet.arc.network';
const EXPLORER_URL = 'https://testnet.arcscan.app';
const INR_RATE = 94.25; 

let userAddress = "", provider, signer, codeReader;

// --- INITIALIZE ON LOAD ---
window.addEventListener('load', async () => {
    if (window.ethereum && localStorage.getItem("isWalletConnected") === "true") {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) setupWallet(accounts[0]);
    }
});

// --- REAL-TIME INR CALCULATION ---
function updateInrCalc() {
    const usdcVal = document.getElementById("sendAmt").value;
    const display = document.getElementById("inrCalcDisplay");
    
    if (usdcVal > 0) {
        const inrVal = (usdcVal * INR_RATE).toLocaleString('en-IN', { 
            maximumFractionDigits: 2, 
            minimumFractionDigits: 2 
        });
        display.innerText = `≈ (₹${inrVal})`;
    } else {
        display.innerText = `≈ (₹0.00)`;
    }
}

// --- WALLET CORE LOGIC ---
async function toggleProfile() {
    if (!userAddress) connectWallet();
    else document.getElementById("profileMenu").classList.toggle("show");
}

async function connectWallet() {
    if (!window.ethereum) return alert("Please install MetaMask!");
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        
        try {
            await window.ethereum.request({ 
                method: 'wallet_switchEthereumChain', 
                params: [{ chainId: ARC_CHAIN_ID }] 
            });
        } catch (e) {
            if (e.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: ARC_CHAIN_ID,
                        chainName: 'Arc Network Testnet',
                        rpcUrls: [RPC_URL],
                        nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
                        blockExplorerUrls: [EXPLORER_URL]
                    }]
                });
            }
        }
        setupWallet(accounts[0]);
    } catch (e) { console.error("Connection Cancelled", e); }
}

async function setupWallet(addr) {
    userAddress = addr;
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    
    const short = addr.substring(0, 6) + "..." + addr.substring(addr.length - 4);
    document.getElementById("dot").classList.replace("bg-red-500", "bg-green-500");
    document.getElementById("dot").classList.remove("animate-pulse");
    document.getElementById("walletLabel").innerText = short.toUpperCase();
    
    localStorage.setItem("isWalletConnected", "true");
    fetchBalance();
}

// --- SEND FEATURE (INSTANT & DYNAMIC GAS) ---
function openSend() {
    if(!userAddress) return connectWallet();
    document.getElementById("sendModal").classList.remove("hidden");
    document.getElementById("sendAmt").value = "";
    document.getElementById("inrCalcDisplay").innerText = "≈ (₹0.00)";
}

async function processSend() {
    const to = document.getElementById("sendTo").value;
    const amt = document.getElementById("sendAmt").value;
    const btn = document.getElementById("finalSendBtn");

    if(!ethers.utils.isAddress(to)) return alert("Invalid Address!");
    if(!amt || amt <= 0) return alert("Enter valid amount!");

    try {
        btn.innerText = "FETCHING GAS..."; btn.disabled = true;

        // Fetching real-time network gas (e.g. 20.6 Gwei)
        const currentGasPrice = await provider.getGasPrice();
        
        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
        
        btn.innerText = "WAITING FOR WALLET...";

        const tx = await contract.transfer(to, ethers.utils.parseUnits(amt, 6), {
            gasLimit: 120000,
            gasPrice: currentGasPrice // Uses exact network gas
        });
        
        btn.innerText = "CONFIRMING...";
        
        // Instant response: Wait for only 1 confirmation
        await tx.wait(1);

        // --- SHOW RECEIPT CARD ---
        document.getElementById("sendModal").classList.add("hidden");
        document.getElementById("receiptModal").classList.remove("hidden");
        
        document.getElementById("recAmt").innerText = `${amt} USDC`;
        document.getElementById("recInr").innerText = `≈ ₹${(amt * INR_RATE).toFixed(2)}`;
        document.getElementById("recTo").innerText = to.substring(0,8) + "..." + to.substring(to.length - 4);
        
        const now = new Date();
        document.getElementById("recTime").innerText = now.toLocaleDateString() + " | " + now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        btn.innerText = "CONFIRM PAYMENT"; btn.disabled = false;
    } catch (e) {
        console.error(e);
        alert("Transaction Failed!");
        btn.innerText = "CONFIRM PAYMENT"; btn.disabled = false;
    }
}

// --- RECEIVE, SCAN, HISTORY & UTILS ---
function openReceive() {
    if(!userAddress) return connectWallet();
    document.getElementById("receiveModal").classList.remove("hidden");
    const qrDiv = document.getElementById("qrcode");
    qrDiv.innerHTML = "";
    document.getElementById("myAddr").innerText = userAddress;
    new QRCode(qrDiv, { text: userAddress, width: 200, height: 200, colorDark: "#121271" });
}

async function openScan() {
    if(!userAddress) return connectWallet();
    document.getElementById("scanModal").classList.remove("hidden");
    codeReader = new ZXing.BrowserQRCodeReader();
    const videoElem = document.getElementById("scanVideo");
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        videoElem.srcObject = stream;
        videoElem.play();
        const result = await codeReader.decodeFromVideoElement(videoElem);
        if(ethers.utils.isAddress(result.text)) {
            closeModal('scanModal');
            document.getElementById("sendModal").classList.remove("hidden");
            document.getElementById("sendTo").value = result.text;
        }
    } catch (e) { closeModal('scanModal'); }
}

async function openHistory() {
    if(!userAddress) return connectWallet();
    document.getElementById("historyModal").classList.remove("hidden");
    const list = document.getElementById("txList");
    list.innerHTML = `<p class="text-[10px] text-center opacity-20 italic">Loading Blockchain Logs...</p>`;
    
    try {
        const contract = new ethers.Contract(USDC_ADDR, ["event Transfer(address indexed from, address indexed to, uint256 value)"], provider);
        const filterFrom = contract.filters.Transfer(userAddress, null);
        const filterTo = contract.filters.Transfer(null, userAddress);
        
        const logsFrom = await contract.queryFilter(filterFrom, -1000, "latest");
        const logsTo = await contract.queryFilter(filterTo, -1000, "latest");
        const allLogs = [...logsFrom, ...logsTo].sort((a, b) => b.blockNumber - a.blockNumber);
        
        if(allLogs.length === 0) {
            list.innerHTML = `<p class="text-center text-xs opacity-20 mt-10">No transactions found</p>`;
            return;
        }

        list.innerHTML = allLogs.slice(0, 15).map(l => `
            <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-2">
                <div class="flex justify-between items-center">
                    <p class="text-[9px] font-black ${l.args.from.toLowerCase() === userAddress.toLowerCase() ? 'text-red-500' : 'text-green-500'}">
                        ${l.args.from.toLowerCase() === userAddress.toLowerCase() ? 'SENT' : 'RECEIVED'}
                    </p>
                    <p class="text-xs font-black italic">₹${(ethers.utils.formatUnits(l.args.value, 6) * INR_RATE).toFixed(2)}</p>
                </div>
                <p class="text-[8px] font-mono opacity-40 mt-1 truncate">
                    ${l.args.from.toLowerCase() === userAddress.toLowerCase() ? 'To: ' + l.args.to : 'From: ' + l.args.from}
                </p>
            </div>
        `).join('');
    } catch (e) { list.innerHTML = "Error loading logs."; }
}

function fetchBalance() {
    if(!userAddress) return;
    provider.getBalance(userAddress).then(bal => {
        const f = ethers.utils.formatUnits(bal, 18);
        document.getElementById("usdcBal").innerText = parseFloat(f).toFixed(2);
        document.getElementById("inrBal").innerText = (f * INR_RATE).toLocaleString('en-IN', {maximumFractionDigits: 2});
    });
}

function disconnectWallet() {
    localStorage.removeItem("isWalletConnected");
    location.reload();
}

function closeModal(id) {
    document.getElementById(id).classList.add("hidden");
    if(id === 'scanModal' && codeReader) {
        const stream = document.getElementById("scanVideo").srcObject;
        if(stream) stream.getTracks().forEach(t => t.stop());
    }
}

function copyAddr() {
    navigator.clipboard.writeText(userAddress);
    alert("Address Copied!");
}

window.onclick = (e) => {
    if (!e.target.matches('#walletBtn, #walletBtn *')) {
        const menu = document.getElementById("profileMenu");
        if (menu && menu.classList.contains("show")) menu.classList.remove("show");
    }
}
