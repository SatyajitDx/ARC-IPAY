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
    else {
        const menu = document.getElementById("profileMenu");
        menu.classList.toggle("show");
    }
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

// --- SEND FEATURE ---
function openSend() {
    if(!userAddress) return connectWallet();
    document.getElementById("sendModal").classList.remove("hidden");
}

async function processSend() {
    const to = document.getElementById("sendTo").value;
    const amt = document.getElementById("sendAmt").value;
    const btn = document.getElementById("finalSendBtn");

    if(!ethers.utils.isAddress(to)) return alert("Invalid Address!");
    if(!amt || amt <= 0) return alert("Enter valid amount!");

    try {
        btn.innerText = "PREPARING..."; btn.disabled = true;

        const gasPrice = await provider.getGasPrice();
        const contract = new ethers.Contract(USDC_ADDR, ["function transfer(address,uint256) returns (bool)"], signer);
        
        btn.innerText = "CONFIRMING...";
        const tx = await contract.transfer(to, ethers.utils.parseUnits(amt, 6), {
            gasLimit: 150000, 
            gasPrice: gasPrice 
        });
        
        btn.innerText = "PENDING...";
        await tx.wait(1);

        // --- SHOW RECEIPT CARD ---
        document.getElementById("sendModal").classList.add("hidden");
        document.getElementById("receiptModal").classList.remove("hidden");
        
        document.getElementById("recAmt").innerText = `${amt} USDC`;
        document.getElementById("recInr").innerText = `≈ ₹${(amt * INR_RATE).toFixed(2)}`;
        document.getElementById("recTo").innerText = to.substring(0,8) + "..." + to.substring(to.length - 4);

    } catch (e) {
        console.error("TX Error:", e);
        alert("Transaction Failed!");
        btn.innerText = "CONFIRM PAYMENT"; btn.disabled = false;
    }
}

// --- OTHER FEATURES ---
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
